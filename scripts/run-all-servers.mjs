import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dashDir = path.join(rootDir, 'dashboard');
const nextBin = path.join(dashDir, 'node_modules', 'next', 'dist', 'bin', 'next');

function startProcess(name, cmd, args, cwd) {
  console.log(`[Supervisor] Starting ${name}...`);
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.on('error', (err) => {
    console.error(`[Supervisor] Failed to start ${name}:`, err.message);
  });

  child.on('exit', (code) => {
    console.log(`[Supervisor] ${name} exited with code ${code}. Restarting in 3s...`);
    setTimeout(() => startProcess(name, cmd, args, cwd), 3000);
  });

  return child;
}

// 1. Dashboard (Next.js - Port 3100 Dev Mode)
startProcess('Dashboard 3100', process.execPath, [nextBin, 'dev', '-p', '3100', '-H', '127.0.0.1'], dashDir);

// 2. Bridge Server (Port 3101)
startProcess('Bridge 3101', process.execPath, ['server.mjs'], rootDir);

// 3. Bot Server (Port 3104)
startProcess('Bot 3104', process.execPath, ['bot-server.mjs'], rootDir);

console.log('[Supervisor] All 3 servers launched for desktop-bridge on ports 3100, 3101, 3104.');
