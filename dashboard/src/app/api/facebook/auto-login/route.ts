import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
    const { autoLoginFacebook } = await import(pathToFileURL(scriptPath).href);

    const logs: string[] = [];
    const logFn = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    const result = await autoLoginFacebook(targetAccount, logFn);

    return NextResponse.json({
      ok: true,
      message: 'Đăng nhập thành công!',
      result,
      logs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
