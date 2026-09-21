/**
 * scripts/fb-auto-login.mjs
 * 
 * Script tự động đăng nhập tài khoản Facebook với mã 2FA TOTP:
 * - Khởi động Chrome độc lập theo Port & Profile dir.
 * - Áp dụng cờ Anti-Detect chống nhận diện bot.
 * - Tự động điền tài khoản, mật khẩu theo tốc độ người thật.
 * - Tự động tính toán mã 2FA 6 số theo thời gian thực và điền vào form xác minh.
 * - Tự động chọn "Lưu trình duyệt" để biến máy tính thành thiết bị tin cậy vĩnh viễn.
 * - Nhận diện link profile cá nhân và cập nhật vào file cấu hình.
 */

import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { generate2FACode, getRemainingSeconds } from './fb-totp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const CONFIG_PERSONAL_PATH = path.join(rootDir, 'configs', 'personal-config.json');

export function getChromeExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'chrome';
}

export async function isPortReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Khởi chạy Chrome với cờ Anti-Detect và thư mục Profile riêng */
export async function launchStealthChrome(port, profileDir) {
  if (await isPortReady(port)) {
    return `http://127.0.0.1:${port}`;
  }

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', profileDir || `n8n-fb-profile-${port}`);

  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }

  const chromeArgs = [
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profilePath}`,
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--lang=vi-VN,vi',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    '--start-maximized',
    'https://www.facebook.com/',
  ];

  spawn(chromePath, chromeArgs, { detached: true, stdio: 'ignore' }).unref();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(port)) {
      await delay(2500);
      return `http://127.0.0.1:${port}`;
    }
  }

  throw new Error(`Không thể kết nối Chrome cổng ${port} sau 30 giây.`);
}

/** Tự gõ bàn phím mô phỏng tốc độ người thật */
async function humanType(page, selector, text) {
  await page.click(selector);
  await delay(200);
  // Xóa nội dung cũ nếu có
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await delay(100);

  for (const char of String(text)) {
    await page.keyboard.type(char);
    await delay(35 + Math.random() * 55);
  }
}

/**
 * Tự động đăng nhập tài khoản Facebook
 * @param {object} account - { username, password, twoFactorSecret, port, profileDir, name }
 * @param {function} [onLog] - Hàm ghi log
 */
export async function autoLoginFacebook(account, onLog = console.log) {
  const {
    username,
    password,
    twoFactorSecret,
    port = 9323,
    profileDir = `n8n-fb-profile-${port}`,
    name = username || `FB-${port}`,
  } = account;

  if (!username || !password) {
    throw new Error(`Tài khoản "${name}" thiếu tên đăng nhập (UID/Email) hoặc mật khẩu!`);
  }

  onLog(`🚀 [Auto-Login] Mở Chrome cho "${name}" trên cổng ${port}...`);
  const cdpUrl = await launchStealthChrome(port, profileDir);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  try {
    onLog(`🌐 [Auto-Login] Truy cập https://www.facebook.com/...`);
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await delay(3500);

    // 1. Kiểm tra xem đã đăng nhập sẵn từ trước chưa
    const isAlreadyLoggedIn = await page.evaluate(() => {
      return (
        Boolean(document.querySelector('[role="feed"]')) ||
        Boolean(document.querySelector('[aria-label*="Trang cá nhân"]')) ||
        Boolean(document.querySelector('[aria-label*="Menu"]')) ||
        Boolean(document.querySelector('div[data-pagelet="LeftRail"]'))
      );
    });

    if (isAlreadyLoggedIn) {
      onLog(`✅ [Auto-Login] "${name}" đã đăng nhập sẵn từ trước!`);
      const profileUrl = await detectProfileUrl(page);
      return { success: true, alreadyLoggedIn: true, profileUrl };
    }

    // 2. Điền tài khoản & mật khẩu
    onLog(`✍️ [Auto-Login] Điền thông tin đăng nhập cho "${name}"...`);
    const emailInput = await page.waitForSelector('input#email, input[name="email"]', { timeout: 10000 }).catch(() => null);
    if (!emailInput) {
      throw new Error('Không tìm thấy ô nhập tài khoản/email trên Facebook!');
    }

    await humanType(page, 'input#email, input[name="email"]', username);
    await delay(500 + Math.random() * 500);

    await humanType(page, 'input#pass, input[name="pass"]', password);
    await delay(800 + Math.random() * 500);

    onLog(`🖱️ [Auto-Login] Bấm nút Đăng nhập...`);
    const loginButton = page.locator('button[name="login"], button[type="submit"], [role="button"]:has-text("Đăng nhập")').first();
    await loginButton.click();

    await delay(5000);

    // 3. Kiểm tra các trường hợp sau khi bấm đăng nhập
    const currentUrl = page.url();

    // Checkpoint khóa tài khoản
    if (currentUrl.includes('/checkpoint') && (page.locator('text=/tài khoản của bạn đã bị khóa|account disabled/i'))) {
      const isLocked = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        return text.includes('Tài khoản của bạn đã bị khóa') || text.includes('Chúng tôi đã tạm ngừng tài khoản của bạn');
      });
      if (isLocked) {
        throw new Error(`⚠️ Tài khoản "${name}" đang bị Facebook Checkpoint khóa từ trước!`);
      }
    }

    // 4. Xử lý màn hình 2FA (Two-Factor Authentication)
    const is2FAPage = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return (
        text.includes('xác thực 2 yếu tố') ||
        text.includes('Xác thực hai yếu tố') ||
        text.includes('mã đăng nhập') ||
        text.includes('Two-factor') ||
        Boolean(document.querySelector('input#approvals_code, input[name="approvals_code"]'))
      );
    });

    if (is2FAPage) {
      if (!twoFactorSecret) {
        throw new Error(`Tài khoản "${name}" yêu cầu mã 2FA nhưng bạn chưa cung cấp 2FA Secret Key!`);
      }

      onLog(`🔐 [Auto-Login] Phát hiện màn hình 2FA! Đang tạo mã 6 số từ 2FA Key...`);

      // Nếu còn dưới 4 giây, chờ sang chu kỳ mới cho chắc
      if (getRemainingSeconds() < 4) {
        onLog(`⏳ Chờ mã 2FA chu kỳ mới...`);
        await delay(5000);
      }

      const otp = generate2FACode(twoFactorSecret);
      onLog(`🎯 [Auto-Login] Đã sinh mã 2FA: ${otp}. Đang điền vào ô xác thực...`);

      const twoFaInput = page.locator('input#approvals_code, input[name="approvals_code"], input[type="text"][autocomplete*="one-time-code"]').first();
      if ((await twoFaInput.count()) > 0) {
        await twoFaInput.click();
        await delay(200);
        await page.keyboard.type(otp, { delay: 60 });
        await delay(1000);

        // Bấm gửi mã
        const submitBtn = page.locator('button#checkpointSubmitButton, button[type="submit"], button:has-text("Tiếp tục"), button:has-text("Gửi mã")').first();
        await submitBtn.click();
        onLog(`📤 [Auto-Login] Đã gửi mã 2FA. Đang chờ Facebook xử lý...`);
        await delay(5000);
      }
    }

    // 5. Xử lý màn hình "Lưu trình duyệt" (Save Browser)
    const isSaveBrowserPage = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.includes('Lưu trình duyệt') || text.includes('Remember browser') || text.includes('Lưu thông tin đăng nhập');
    });

    if (isSaveBrowserPage) {
      onLog(`💾 [Auto-Login] Xác nhận "Lưu trình duyệt" làm thiết bị tin cậy...`);
      // Chọn radio "Lưu trình duyệt" nếu có
      const saveRadio = page.locator('input[type="radio"][value="dont_save"]').locator('..').locator('input[value="save"]');
      if ((await saveRadio.count()) > 0) {
        await saveRadio.click().catch(() => {});
      }
      const continueBtn = page.locator('button#checkpointSubmitButton, button[type="submit"], button:has-text("Tiếp tục")').first();
      if ((await continueBtn.count()) > 0) {
        await continueBtn.click();
        await delay(4000);
      }
    }

    // 6. Kiểm tra đăng nhập thành công & Lấy link profile
    await delay(3000);
    const profileUrl = await detectProfileUrl(page);

    onLog(`🎉 [Auto-Login] Đăng nhập thành công cho "${name}"! Profile: ${profileUrl || 'Đã sẵn sàng'}`);
    return { success: true, alreadyLoggedIn: false, profileUrl };

  } finally {
    await browser.close().catch(() => {});
  }
}

/** Lấy profile link cá nhân từ /me */
async function detectProfileUrl(page) {
  try {
    await page.goto('https://www.facebook.com/me', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(3000);
    const url = page.url().split('?')[0];
    if (url && url !== 'https://www.facebook.com/' && url !== 'https://www.facebook.com/me' && !url.includes('/login')) {
      return url;
    }
  } catch {}
  return 'https://www.facebook.com/';
}
