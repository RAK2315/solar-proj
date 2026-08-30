/**
 * scripts/serve.mjs — `npm run demo`
 *
 * Stop whatever is on the port, wipe .next, build, serve. In that order.
 *
 * WHY THIS IS A SCRIPT AND NOT THREE COMMANDS. Rebuilding underneath a running
 * `next start` is a trap that has cost this project real time twice: the old
 * server keeps serving HTML that references chunk hashes the rebuild deleted, so
 * the browser gets 404s for every script, hydration never runs, and the page is
 * either blank or — worse — renders the server markup perfectly and ignores every
 * click. It looks exactly like a code fault and it is not one.
 *
 * `next start` also fails with EADDRINUSE and keeps the STALE server alive, so
 * the failure is silent unless you happen to read the log.
 */

import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const PORT = Number(process.env.PORT ?? 3000);

function killPort(port) {
  try {
    // netstat + taskkill: no dependency, and works on the Windows this is built on.
    const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = new Set(
      out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && p !== '0'),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`  stopped pid ${pid} on port ${port}`);
      } catch { /* already gone */ }
    }
  } catch {
    // findstr exits non-zero when nothing matches, which is the common case.
  }
}

console.log(`\nserve — clean build on port ${PORT}\n`);
killPort(PORT);
rmSync('.next', { recursive: true, force: true });
execSync('npm run build', { stdio: 'inherit' });
console.log('\nserving. ctrl-c to stop.\n');
spawn('npm', ['run', 'start'], { stdio: 'inherit', shell: true });
