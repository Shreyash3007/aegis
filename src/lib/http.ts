import http from 'node:http';
import https from 'node:https';

/** POST-JSON transport with timeout + retries and deterministic teardown.
 *
 *  The global fetch (undici) pools keep-alive sockets; calling process.exit()
 *  at gate time with pooled sockets alive trips a libuv fail-fast abort on
 *  Windows (`!(handle->flags & UV_HANDLE_CLOSING)`, src/win/async.c) -
 *  observed as exit 3221226505 instead of the gate's real code after 2+
 *  sequential judgments. This transport uses a fresh non-keep-alive agent
 *  per attempt and destroys it in a finally, so no socket outlives the call
 *  and gate-time process.exit() is always safe. Zero dependencies. */

export class HttpError extends Error {
  status?: number;
  constructor(message: string, status?: number) { super(message); this.status = status; }
}

export interface PostOptions { timeoutMs?: number; maxRetries?: number }

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;

const retryable = (status?: number): boolean =>
  status === undefined || status === 408 || status === 429 || status >= 500;
// Note: status 0 marks post-HTTP failures (unparseable body) - never retried.

export async function postJson(
  url: string, headers: Record<string, string>, body: unknown,
  opts: PostOptions = {},
): Promise<unknown> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  // http and https share the call shape used here; the cast keeps one code path.
  const mod = (url.startsWith('https:') ? https : http) as typeof http;
  let last: HttpError = new HttpError('unreachable');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
    const agent = new mod.Agent({ keepAlive: false });
    try {
      const { status, text } = await new Promise<{ status?: number; text: string }>((resolve, reject) => {
        const req = mod.request(url, {
          method: 'POST', agent,
          headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (d) => chunks.push(d as Buffer));
          res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
          res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
        req.end(JSON.stringify(body));
      });
      if (status !== undefined && status >= 200 && status < 300) {
        try { return JSON.parse(text) as unknown; }
        // Post-HTTP failure (status 0 = no HTTP status involved): never retried.
        catch { throw new HttpError('unparseable response body', 0); }
      }
      last = new HttpError(`HTTP ${status}`, status);
      if (!retryable(status) || attempt === maxRetries) throw last;
    } catch (e) {
      if (e instanceof HttpError) {
        if (attempt === maxRetries || !retryable(e.status)) throw e;
        last = e; continue;
      }
      last = new HttpError(e instanceof Error ? e.message : 'unreachable');
      if (attempt === maxRetries) throw last;
    } finally {
      agent.destroy();
    }
  }
  throw last;
}
