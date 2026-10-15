import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function writeReport(root, kind, version, contents, args = process.argv.slice(2)) {
  const i = args.indexOf('--output');
  if (i >= 0 && (!args[i + 1] || args[i + 1].startsWith('--')))
    throw new Error('--output requires a file path');
  const file = i >= 0 ? path.resolve(root, args[i + 1])
    : path.join(root, '.aegis', 'reports', `${kind}-${version}-${crypto.randomUUID()}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, { flag: 'wx' });
  return file;
}
