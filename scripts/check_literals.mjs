/**
 * scripts/check_literals.mjs — `npm run check:literals`
 *
 * Greps src/ for the demo's headline numbers. Every one of them must arrive from
 * /data through src/store/selectors.ts. A literal in a component means a number on
 * screen has stopped being traceable to the physics model, which is the one failure
 * this whole project is built to avoid.
 *
 * src/lib/types.ts is exempt: the invariants assert against these values on purpose.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const EXEMPT = [
  'src/lib/types.ts',        // invariants assert these values by design
];

/** Each entry: the literal, and what it should have come from instead. */
const FORBIDDEN = [
  ['58.4', 'string deviation — useInverterReadings()'],
  ['41.7', 'array deviation — usePanelReading("B-17")'],
  ['36.10', 'expected string kW — useInverterReadings()'],
  ['36.1', 'expected string kW — useInverterReadings()'],
  ['15.02', 'actual string kW — useInverterReadings()'],
  ['363.', 'farm output MW — useFarmOutputMW()'],
  ['3.07', 'projected 72 h loss — useForecast()'],
  ['62.81', 'cell temperature — usePanelReading()'],
  ['0.84', 'detection confidence — useDetection() (and it is a placeholder)'],
  ['49.61', 'string nameplate — farm.json'],
  ['0.4160', 'faulted mismatch factor — telemetry.json'],
  ['14:00', 'deadline — useForecast().actBefore'],
  ['38.1', 'peak ambient — useForecast()'],
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|js|jsx|css)$/.test(entry)) out.push(path);
  }
  return out;
}

/**
 * Blank out comments while preserving every newline and every character offset, so
 * reported line numbers still point at the real line.
 *
 * A number inside a doc comment is documentation, not a number on screen — the
 * format.ts docstrings legitimately show `−58.4 %` as an example of the output
 * shape. String literals are NOT stripped: a hardcoded "58.4%" in JSX text is
 * exactly what this check exists to catch.
 */
function blankComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, ' '));
}

const findings = [];
for (const path of walk(ROOT)) {
  const rel = relative('.', path).split('\\').join('/');
  if (EXEMPT.includes(rel)) continue;
  const raw = readFileSync(path, 'utf8');
  const code = blankComments(raw).split('\n');
  const original = raw.split('\n');
  code.forEach((line, i) => {
    for (const [literal, source] of FORBIDDEN) {
      if (line.includes(literal)) {
        findings.push({ rel, line: i + 1, literal, source, text: original[i].trim() });
      }
    }
  });
}

if (findings.length === 0) {
  console.log('check:literals — clean. No headline number is hardcoded in src/.');
  process.exit(0);
}

console.error('\x1b[31mcheck:literals FAILED\x1b[0m — hardcoded demo numbers found:\n');
for (const f of findings) {
  console.error(`  ${f.rel}:${f.line}  "${f.literal}"`);
  console.error(`    ${f.text}`);
  console.error(`    \x1b[2m-> should come from ${f.source}\x1b[0m\n`);
}
console.error('Every number on screen comes from /data. Add it to the generator instead.');
process.exit(1);
