import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dashDir = path.join(rootDir, 'dashboard');
const nextBin = path.join(dashDir, 'node_modules', 'next', 'dist', 'bin', 'next');

// 1. Tự động giải phóng các port 3100, 3101, 3104 nếu có process cũ bị treo
try {
  execSync(
    'powershell -ExecutionPolicy Bypass -Command "$ports=@(3100,3101,3104); foreach ($p in $ports) { $lines = netstat -ano | Select-String \":$p\\s.*LISTENING\"; foreach ($l in $lines) { $procId = ($l.ToString().Trim() -split \'\\s+\')[-1]; if ($procId -match \'^\\d+$\') { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue } } }"',
    { stdio: 'ignore' }
  );
} catch {}

const processes = [];
let isShuttingDown = false;

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
    if (!isShuttingDown) {
      console.log(`[Supervisor] ${name} exited with code ${code}.`);
    }
  });

  processes.push(child);
  return child;
}

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[Supervisor] Đang tắt toàn bộ các server...');
  for (const proc of processes) {
    try {
      proc.kill('SIGTERM');
      proc.kill('SIGKILL');
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// 1. Dashboard (Next.js - Port 3100 Dev Mode)
startProcess('Dashboard 3100', process.execPath, [nextBin, 'dev', '-p', '3100', '-H', '127.0.0.1'], dashDir);

// 2. Bridge Server (Port 3101)
startProcess('Bridge 3101', process.execPath, ['server.mjs'], rootDir);

// 3. Bot Server (Port 3104)
startProcess('Bot 3104', process.execPath, ['bot-server.mjs'], rootDir);

console.log('[Supervisor] All 3 servers launched on ports 3100, 3101, 3104 via npm run dev.');
