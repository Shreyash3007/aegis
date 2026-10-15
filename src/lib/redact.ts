/** Credential-pattern backstop for wrapper-owned records and model egress.
 * Callers still own input minimization; arbitrary secrets are not detectable. */
export function redactState(state: string): string {
  return state
    .replace(/https?:\/\/[^/\s:@]+:[^/\s@]+@/g, 'https://[redacted]@')
    .replace(/(authorization:\s*(?:bearer|basic|token)\s+)\S+/gi, '$1[redacted]')
    .replace(/(^|\n)\s*cookie:[^\n]*/gi, '$1cookie: [redacted]')
    .replace(/(^|\s)(-u|--user)\s+\S+:\S+/g, '$1$2 [redacted]')
    .replace(/\b([A-Za-z_0-9]*(?:TOKEN|SECRET|PASSWORD|API_KEY)\s*=\s*)([^\s'";]+)/g, '$1[redacted]')
    .replace(/\b(sk-[A-Za-z0-9\-_]{8,}|gh[pousr]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+)\b/g, '[redacted]');
}
