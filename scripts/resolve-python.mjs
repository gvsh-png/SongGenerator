import { spawnSync } from 'node:child_process';

const WINDOWS_CANDIDATES = [['py', '-3'], ['py'], ['python'], ['python3']];
const UNIX_CANDIDATES = [['python3'], ['python']];

/** @returns {string[] | null} e.g. ['py', '-3'] or ['python3'] */
export function getPythonPrefix() {
  const candidates = process.platform === 'win32' ? WINDOWS_CANDIDATES : UNIX_CANDIDATES;
  for (const prefix of candidates) {
    const result = spawnSync(prefix[0], [...prefix.slice(1), '--version'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status === 0) {
      return prefix;
    }
  }
  return null;
}

export function pythonLabel(prefix) {
  return prefix.join(' ');
}

export function runPython(prefix, args, opts = {}) {
  const { stdio, ...rest } = opts;
  return spawnSync(prefix[0], [...prefix.slice(1), ...args], {
    ...(stdio === 'inherit' ? { stdio: 'inherit' } : { encoding: 'utf8', stdio }),
    ...rest,
  });
}

export function requirePython() {
  const prefix = getPythonPrefix();
  if (prefix) return prefix;

  if (process.platform === 'win32') {
    console.error('Python not found.');
    console.error('');
    console.error('Install Python 3.10+ from https://www.python.org/downloads/');
    console.error('During install, check: "Add python.exe to PATH"');
    console.error('Then close and reopen PowerShell, and run this again.');
  } else {
    console.error('Python not found. Install python3 and pip.');
  }
  process.exit(1);
}
