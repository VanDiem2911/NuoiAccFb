import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { BRIDGE_DIR } from '@/lib/server-utils';

interface AutoNurtureState {
  isRunning: boolean;
  startedAt: string | null;
  completedAt: string | null;
  logs: Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>;
  currentMessage: string;
  stats: {
    totalAccounts: number;
    completed: number;
    failed: number;
    likesGiven: number;
  };
}

let activeProcess: ChildProcess | null = null;
const state: AutoNurtureState = {
  isRunning: false,
  startedAt: null,
  completedAt: null,
  logs: [],
  currentMessage: 'Chưa có tiến trình nuôi nick nào đang chạy.',
  stats: {
    totalAccounts: 0,
    completed: 0,
    failed: 0,
    likesGiven: 0,
  },
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    state,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'start';

    if (action === 'status') {
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'stop') {
      if (activeProcess) {
        try {
          activeProcess.kill('SIGTERM');
        } catch {}
        activeProcess = null;
      }
      state.isRunning = false;
      state.completedAt = new Date().toISOString();
      state.currentMessage = 'Tiến trình Nuôi Nick đã được dừng bởi người dùng.';
      state.logs.push({
        time: new Date().toLocaleTimeString('vi-VN'),
        text: '🛑 Đã dừng tiến trình Nuôi Nick An Toàn.',
        type: 'warning',
      });
      return NextResponse.json({ ok: true, message: 'Đã dừng tiến trình.', state });
    }

    if (action === 'start') {
      if (state.isRunning) {
        return NextResponse.json({
          ok: false,
          error: 'Tiến trình Nuôi Nick đang chạy!',
          state,
        });
      }

      state.isRunning = true;
      state.startedAt = new Date().toISOString();
      state.completedAt = null;
      state.logs = [];
      state.stats = {
        totalAccounts: 0,
        completed: 0,
        failed: 0,
        likesGiven: 0,
      };
      state.currentMessage = 'Đang khởi động kịch bản nuôi nick tự nhiên...';

      const scriptPath = path.join(BRIDGE_DIR, 'scripts', 'auto-nurture-farm.mjs');
      const feedMinutes = Number(body.feedMinutes) || 2;
      const maxLikes = Number(body.maxLikes) || 2;
      const watchReels = body.watchReels !== false;

      state.logs.push({
        time: new Date().toLocaleTimeString('vi-VN'),
        text: `🚀 Bắt đầu chiến dịch Nuôi Nick An Toàn (Lướt Feed: ${feedMinutes}m, Tối đa ${maxLikes} likes)...`,
        type: 'info',
      });

      const child = spawn(process.execPath, [scriptPath], {
        cwd: BRIDGE_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      activeProcess = child;

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        for (const line of lines) {
          let type: 'info' | 'success' | 'warning' | 'error' = 'info';
          if (line.includes('✅') || line.includes('🎉') || line.includes('Hoàn tất')) {
            type = 'success';
          } else if (line.includes('⚠️') || line.includes('Cảnh báo')) {
            type = 'warning';
          } else if (line.includes('❌') || line.includes('Lỗi') || line.includes('Error')) {
            type = 'error';
          }

          if (line.includes('Đã thả cảm xúc')) {
            state.stats.likesGiven++;
          } else if (line.includes('Hoàn tất tài khoản')) {
            state.stats.completed++;
          } else if (line.includes('không thành công')) {
            state.stats.failed++;
          }

          state.currentMessage = line;
          state.logs.push({
            time: new Date().toLocaleTimeString('vi-VN'),
            text: line,
            type,
          });

          if (state.logs.length > 200) {
            state.logs.shift();
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        const errText = chunk.toString().trim();
        if (errText) {
          state.logs.push({
            time: new Date().toLocaleTimeString('vi-VN'),
            text: `[Error] ${errText}`,
            type: 'error',
          });
        }
      });

      child.on('close', (code) => {
        state.isRunning = false;
        state.completedAt = new Date().toISOString();
        activeProcess = null;
        const msg = code === 0 ? '🎉 Hoàn tất chiến dịch nuôi nick!' : `Tiến trình kết thúc với mã: ${code}`;
        state.currentMessage = msg;
        state.logs.push({
          time: new Date().toLocaleTimeString('vi-VN'),
          text: msg,
          type: code === 0 ? 'success' : 'warning',
        });
      });

      return NextResponse.json({
        ok: true,
        message: 'Đã bắt đầu tiến trình Nuôi Nick tự động!',
        state,
      });
    }

    return NextResponse.json({ ok: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
