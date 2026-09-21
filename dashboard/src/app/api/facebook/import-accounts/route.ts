import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { BRIDGE_DIR, PERSONAL_CONFIG_PATH } from '@/lib/server-utils';

interface ParsedAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  twoFactorSecret: string;
  port: number;
  profileDir: string;
  profileUrl: string;
  url: string;
  enabled: boolean;
  status: string;
  lastNurturedAt: string | null;
}

/**
 * Phân tích dòng văn bản thành thông tin tài khoản:
 * Hỗ trợ các định dạng:
 * 1. UID|Pass|2FA
 * 2. UID|Pass|2FA|Name
 * 3. Email|Pass|2FA
 * 4. UID|Pass|2FA|Cookie|Proxy
 */
function parseAccountLine(line: string, nextPort: number, index: number): ParsedAccount | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return null;

  // Tách theo dấu gạch đứng |, tab, hoặc dấu phẩy
  const delimiter = trimmed.includes('|') ? '|' : trimmed.includes('\t') ? '\t' : ',';
  const parts = trimmed.split(delimiter).map((p) => p.trim());

  if (parts.length < 2) return null;

  const username = parts[0];
  const password = parts[1];
  let twoFactorSecret = '';
  let customName = '';

  if (parts.length >= 3) {
    // Phần thứ 3 thường là 2FA key (thường là chuỗi chữ cái + số viết hoa, dài 16-32 ký tự)
    // hoặc có thể là Tên nếu chỉ có 3 phần
    const p2 = parts[2].replace(/\s+/g, '');
    if (p2.length >= 10 && /^[A-Z2-7=]+$/i.test(p2)) {
      twoFactorSecret = p2.toUpperCase();
    } else {
      twoFactorSecret = parts[2];
    }
  }

  if (parts.length >= 4) {
    customName = parts[3];
  }

  const cleanName = customName || `FB - ${username.length > 15 ? username.slice(-6) : username}`;
  const profileDir = `n8n-fb-profile-${nextPort}`;

  return {
    id: `fb_acc_${Date.now()}_${index}`,
    name: cleanName,
    username,
    password,
    twoFactorSecret,
    port: nextPort,
    profileDir,
    profileUrl: username.startsWith('1000') || /^\d+$/.test(username)
      ? `https://www.facebook.com/profile.php?id=${username}`
      : 'https://www.facebook.com/',
    url: username.startsWith('1000') || /^\d+$/.test(username)
      ? `https://www.facebook.com/profile.php?id=${username}`
      : 'https://www.facebook.com/',
    enabled: true,
    status: 'warming',
    lastNurturedAt: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, append = true } = body;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ ok: false, error: 'Dữ liệu danh sách tài khoản không được để trống!' }, { status: 400 });
    }

    const lines = rawText.split(/\r?\n/);
    let existingConfig: { accounts: ParsedAccount[] } = { accounts: [] };

    if (fs.existsSync(PERSONAL_CONFIG_PATH)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(PERSONAL_CONFIG_PATH, 'utf-8'));
        if (!Array.isArray(existingConfig.accounts)) existingConfig.accounts = [];
      } catch {
        existingConfig = { accounts: [] };
      }
    }

    // Xác định các port đã dùng
    const usedPorts = new Set<number>();
    existingConfig.accounts.forEach((a) => {
      if (a.port) usedPorts.add(Number(a.port));
    });

    let currentPort = 9323;
    const findNextPort = () => {
      while (usedPorts.has(currentPort)) currentPort++;
      usedPorts.add(currentPort);
      return currentPort;
    };

    const newAccounts: ParsedAccount[] = [];
    lines.forEach((line, idx) => {
      const parsed = parseAccountLine(line, findNextPort(), idx + 1);
      if (parsed) {
        newAccounts.push(parsed);
      }
    });

    if (newAccounts.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Không phân tích được tài khoản hợp lệ nào từ danh sách! Vui lòng nhập định dạng: UID|Pass|2FA' },
        { status: 400 }
      );
    }

    // Hợp nhất vào file cấu hình
    if (append) {
      existingConfig.accounts.push(...newAccounts);
    } else {
      existingConfig.accounts = newAccounts;
    }

    // Đảm bảo thư mục configs tồn tại
    const configsDir = path.dirname(PERSONAL_CONFIG_PATH);
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }

    fs.writeFileSync(PERSONAL_CONFIG_PATH, JSON.stringify(existingConfig, null, 2), 'utf-8');

    return NextResponse.json({
      ok: true,
      message: `Đã nhập thành công ${newAccounts.length} tài khoản Facebook!`,
      importedCount: newAccounts.length,
      accounts: existingConfig.accounts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
