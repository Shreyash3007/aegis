import fs from 'node:fs';
import path from 'node:path';
import { REPO, die, ok } from '../lib/util.js';
/** aegis import check (00d bridge verifier): the brownfield import bridge
 *  asks the agent to draft brain docs FROM existing repo docs with citations,
 *  rather than re-authoring from scratch. This command verifies the result:
 *  every required brain doc exists, is non-trivial, and carries evidence
 *  markers (source citations, INFERRED labels, or CONFIRMED). Exit 4 until
 *  they do - presence and evidence only; judging content quality is the
 *  skill's job, not the CLI's. */
const REQUIRED = [
    'brain/architecture/system.md',
    'brain/architecture/db-schema.md',
    'brain/architecture/api-contracts.md',
    'brain/quality/known-issues.md',
];
const EVIDENCE = /(source:\s*\S|INFERRED|CONFIRMED|cites?:)/i;
export function importCmd(args) {
    if (args[0] !== 'check')
        die(2, 'usage: aegis import check');
    let missing = 0;
    for (const rel of REQUIRED) {
        const p = path.join(REPO, rel);
        if (!fs.existsSync(p)) {
            console.log(`MISSING  ${rel}`);
            missing++;
            continue;
        }
        const body = fs.readFileSync(p, 'utf8');
        const substantive = body.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('<!--')).length;
        if (substantive < 3) {
            console.log(`WEAK     ${rel} - ${substantive} substantive lines; stub content does not count`);
            missing++;
            continue;
        }
        if (!EVIDENCE.test(body)) {
            console.log(`UNCITED  ${rel} - no source citations / INFERRED / CONFIRMED markers (00d: every claim cites evidence)`);
            missing++;
            continue;
        }
        console.log(`OK       ${rel}`);
    }
    if (missing)
        die(4, `import check: ${missing}/${REQUIRED.length} brain docs missing/weak/uncited - finish 00d reverse-discovery`);
    ok(`import check: ${REQUIRED.length}/${REQUIRED.length} brain docs present, substantive, evidence-cited`);
}
