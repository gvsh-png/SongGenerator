#!/usr/bin/env node
import { execSync } from 'node:child_process';

const PORTS = [8787, 5173];

function killWindowsPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.includes('LISTENING')) continue;
      const pid = trimmed.split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`  Stopped PID ${pid} (port ${port})`);
      } catch {
        // already gone
      }
    }
  } catch {
    console.log(`  Port ${port} — nothing listening`);
  }
}

function killUnixPort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs -r kill -9`, { stdio: 'inherit', shell: true });
    console.log(`  Cleared port ${port}`);
  } catch {
    console.log(`  Port ${port} — nothing listening`);
  }
}

console.log('Stopping Song Studio Local processes…\n');
for (const port of PORTS) {
  if (process.platform === 'win32') killWindowsPort(port);
  else killUnixPort(port);
}
console.log('\nDone. Start fresh with: npm run local-server:real  (terminal 1)');
console.log('                        npm run dev:local           (terminal 2)');
