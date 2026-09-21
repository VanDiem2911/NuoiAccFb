import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { BRIDGE_DIR } from '@/lib/server-utils';

interface AutoFriendState {
  isRunning: boolean;
  startedAt: string | null;
  completedAt: string | null;
  logs: Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>;
  currentMessage: string;
  stats: {
    totalAccounts: number;
    requestsSent: number;
    requestsAccepted: number;
    alreadyFriends: number;
    skipped: number;
  };
}

let activeProcess: ChildProcess | null = null;
const state: AutoFriendState = {
  isRunning: false,
  startedAt: null,
  completedAt: null,
  logs: [],
  currentMessage: 'Chưa có tiến trình nào đang chạy.',
  stats: {
    totalAccounts: 0,
    requestsSent: 0,
    requestsAccepted: 0,
    alreadyFriends: 0,
    skipped: 0,
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
      state.currentMessage = 'Tiến trình đã được dừng bởi người dùng.';
      state.logs.push({
        time: new Date().toLocaleTimeString('vi-VN'),
        text: '🛑 Đã dừng tiến trình Auto-Friend.',
        type: 'warning',
      });
      return NextResponse.json({ ok: true, message: 'Đã dừng tiến trình.', state });
    }

    if (action === 'start') {
      if (state.isRunning) {
        return NextResponse.json({
          ok: false,
          error: 'Tiến trình Auto-Friend đang chạy!',
          state,
        });
      }

      // Reset state
      state.isRunning = true;
      state.startedAt = new Date().toISOString();
      state.completedAt = null;
      state.logs = [];
      state.stats = {
        totalAccounts: 0,
        requestsSent: 0,
        requestsAccepted: 0,
        alreadyFriends: 0,
        skipped: 0,
      };
      state.currentMessage = 'Đang khởi động kịch bản kết bạn chéo...';

      const scriptPath = path.join(BRIDGE_DIR, 'scripts', 'auto-friend-farm.mjs');
      const delaySec = Number(body.delaySec) || 6;
      const args = [scriptPath, '--delay', String(delaySec)];

      if (body.dryRun) {
        args.push('--dry-run');
      }

      if (body.targetUrl) {
        args.push('--target', String(body.targetUrl));
      }

      if (body.senderPort) {
        args.push('--port', String(body.senderPort));
      }

      state.logs.push({
        time: new Date().toLocaleTimeString('vi-VN'),
        text: `🚀 Bắt đầu kịch bản Auto-Friend Farm (Delay: ${delaySec}s)...`,
        type: 'info',
      });

      const child = spawn(process.execPath, args, {
        cwd: BRIDGE_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      activeProcess = child;

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        for (const line of lines) {
          let type: 'info' | 'success' | 'warning' | 'error' = 'info';
          if (line.includes('✅') || line.includes('🎉') || line.includes('thành công') || line.includes('CHẤP NHẬN')) {
            type = 'success';
          } else if (line.includes('⚠️') || line.includes('Cần ít nhất')) {
            type = 'warning';
          } else if (line.includes('❌') || line.includes('Lỗi') || line.includes('Error')) {
            type = 'error';
          }

          // Trích xuất thống kê nếu có
          if (line.includes('Đã gửi lời mời kết bạn thành công')) {
            state.stats.requestsSent++;
          } else if (line.includes('Đã bấm CHẤP NHẬN kết bạn') || line.includes('tự động xác nhận')) {
            state.stats.requestsAccepted++;
          } else if (line.includes('Đã là bạn bè với')) {
            state.stats.alreadyFriends++;
          }

          state.currentMessage = line;
          state.logs.push({
            time: new Date().toLocaleTimeString('vi-VN'),
            text: line,
            type,
          });

          // Giới hạn 200 dòng log gần nhất trong memory
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
        const msg = code === 0 ? '🎉 Hoàn tất tiến trình kết bạn chéo!' : `Tiến trình kết thúc với mã thoát: ${code}`;
        state.currentMessage = msg;
        state.logs.push({
          time: new Date().toLocaleTimeString('vi-VN'),
          text: msg,
          type: code === 0 ? 'success' : 'warning',
        });
      });

      return NextResponse.json({
        ok: true,
        message: 'Đã bắt đầu tiến trình Auto-Friend Farm!',
        state,
      });
    }

    return NextResponse.json({ ok: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
