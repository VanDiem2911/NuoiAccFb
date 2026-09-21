import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { BRIDGE_DIR, readJsonFile, PERSONAL_CONFIG_PATH } from '@/lib/server-utils';

interface TargetAccount {
  username?: string;
  password?: string;
  twoFactorSecret?: string;
  port?: number;
  profileDir?: string;
  name?: string;
  id?: string | number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, username, password, twoFactorSecret, port } = body;

    let targetAccount: TargetAccount | null = null;

    if (username && password) {
      targetAccount = {
        username,
        password,
        twoFactorSecret,
        port: Number(port) || 9323,
        name: username,
      };
    } else if (accountId) {
      const config = readJsonFile<{ accounts?: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const found = (config.accounts || []).find((a) => String(a.id) === String(accountId) || String(a.port) === String(accountId));
      if (found) {
        targetAccount = {
          username: found.username as string | undefined,
          password: found.password as string | undefined,
          twoFactorSecret: found.twoFactorSecret as string | undefined,
          port: Number(found.port) || 9323,
          profileDir: found.profileDir as string | undefined,
          name: found.name as string | undefined,
          id: found.id as string | number | undefined,
        };
      }
    }

    if (!targetAccount || !targetAccount.username || !targetAccount.password) {
      return NextResponse.json(
        { ok: false, error: 'Không tìm thấy thông tin đăng nhập (Tài khoản & Mật khẩu)!' },
        { status: 400 }
      );
    }

    const scriptPath = path.join(BRIDGE_DIR, 'scripts', 'fb-auto-login.mjs');
    const payloadBase64 = Buffer.from(JSON.stringify(targetAccount)).toString('base64');

    const logs: string[] = [];
    let resultJson: any = null;
    let errorMsg = '';

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(process.execPath, [scriptPath, '--payload', payloadBase64], {
        cwd: BRIDGE_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('RESULT_JSON:')) {
            try {
              resultJson = JSON.parse(line.replace('RESULT_JSON:', ''));
            } catch {}
          } else {
            logs.push(line);
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('ERROR_MSG:')) {
            errorMsg = line.replace('ERROR_MSG:', '').trim();
          } else {
            logs.push(line);
          }
        }
      });

      child.on('close', (code) => {
        resolve(code ?? 1);
      });

      child.on('error', (err) => {
        errorMsg = err.message;
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      return NextResponse.json({
        ok: false,
        error: errorMsg || logs[logs.length - 1] || 'Lỗi trong quá trình đăng nhập tự động!',
        logs,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: resultJson?.alreadyLoggedIn ? 'Tài khoản đã đăng nhập sẵn từ trước!' : 'Đăng nhập thành công!',
      result: resultJson,
      logs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
