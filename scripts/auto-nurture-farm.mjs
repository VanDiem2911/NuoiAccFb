/**
 * scripts/auto-nurture-farm.mjs
 * 
 * Kịch bản tự động Nuôi Farm nick Facebook (Auto-Nurture / Warm-up).
 * Mô phỏng hành vi người dùng thật hàng ngày để tích điểm uy tín (Trust Score):
 * 1. Mở Chrome riêng biệt từng nick với cờ Anti-Detect.
 * 2. Lướt Newsfeed tự nhiên (cuộn, dừng đọc, cuộn ngược lại).
 * 3. Thả Like / Tim dạo ngẫu nhiên 1-3 bài viết an toàn.
 * 4. Xem video Reels / Watch ngắn 20-40 giây.
 * 5. Tự động giãn cách an toàn giữa các nick để Facebook không quét hành vi farm.
 */

import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchStealthChrome, autoLoginFacebook } from './fb-auto-login.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const CONFIG_PERSONAL_PATH = path.join(rootDir, 'configs', 'personal-config.json');

/** Đọc danh sách tài khoản từ personal-config.json */
export function loadNurtureAccounts() {
  if (!fs.existsSync(CONFIG_PERSONAL_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PERSONAL_PATH, 'utf-8'));
    const list = Array.isArray(data.accounts) ? data.accounts : (data.profileUrl ? [data] : []);
    return list.filter((a) => a.enabled !== false);
  } catch {
    return [];
  }
}

/** Cập nhật thời gian nuôi gần nhất của tài khoản */
export function updateAccountNurtureTime(account) {
  if (!fs.existsSync(CONFIG_PERSONAL_PATH)) return;
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PERSONAL_PATH, 'utf-8'));
    if (Array.isArray(data.accounts)) {
      for (const a of data.accounts) {
        if (Number(a.port) === Number(account.port) || String(a.id) === String(account.id) || a.name === account.name) {
          a.lastNurturedAt = new Date().toISOString();
          a.nurtureCount = (a.nurtureCount || 0) + 1;
          a.status = 'ready';
        }
      }
      fs.writeFileSync(CONFIG_PERSONAL_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch {}
}

/**
 * Phiên nuôi 1 tài khoản (Nurture Session)
 */
export async function nurtureSingleAccount(account, options = {}, onLog = console.log) {
  const {
    feedScrollMinutes = 2,
    maxLikes = 2,
    watchReels = true,
  } = options;

  const name = account.name || `Tài khoản ${account.port}`;
  const port = account.port || 9323;
  const profileDir = account.profileDir || `n8n-fb-profile-${port}`;

  onLog(`\n======================================================`);
  onLog(`🌱 [Warm-up] Bắt đầu phiên nuôi: "${name}" (Port: ${port})`);
  onLog(`======================================================`);

  let cdpUrl;
  try {
    cdpUrl = await launchStealthChrome(port, profileDir);
  } catch (err) {
    onLog(`❌ [Warm-up] Không thể mở Chrome cho "${name}": ${err.message}`);
    return { success: false, error: err.message };
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  try {
    // 1. Kiểm tra đăng nhập
    onLog(`🌐 [Warm-up] Mở Facebook và kiểm tra trạng thái đăng nhập...`);
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await delay(3500);

    const isLoginPage = await page.evaluate(() => {
      return Boolean(document.querySelector('input#email, input[name="email"]'));
    });

    if (isLoginPage) {
      if (account.username && account.password) {
        onLog(`🔑 [Warm-up] Chưa đăng nhập -> Tự động đăng nhập bằng tài khoản & 2FA...`);
        await browser.close().catch(() => {});
        await autoLoginFacebook(account, onLog);
        return nurtureSingleAccount(account, options, onLog);
      } else {
        onLog(`⚠️ [Warm-up] "${name}" chưa đăng nhập Facebook và không có mật khẩu cấu hình!`);
        return { success: false, error: 'Chưa đăng nhập' };
      }
    }

    // 2. Lướt Bảng tin Newsfeed
    const durationMs = feedScrollMinutes * 60 * 1000;
    const deadline = Date.now() + durationMs;
    onLog(`📰 [Warm-up] Bắt đầu lướt Newsfeed trong ${feedScrollMinutes} phút...`);

    let likeCount = 0;

    while (Date.now() < deadline) {
      // Cuộn xuống từ 250 - 550px
      const scrollAmount = Math.floor(250 + Math.random() * 300);
      await page.evaluate((amt) => window.scrollBy({ top: amt, behavior: 'smooth' }), scrollAmount);

      // Dừng đọc bài viết 3 - 7 giây
      const readTime = Math.floor(3000 + Math.random() * 4000);
      await delay(readTime);

      // 15% xác suất cuộn nhẹ lên trên mô phỏng đọc lại
      if (Math.random() < 0.15) {
        await page.evaluate(() => window.scrollBy({ top: -150, behavior: 'smooth' }));
        await delay(1500);
      }

      // Thả Like dạo ngẫu nhiên (tối đa maxLikes)
      if (likeCount < maxLikes && Math.random() < 0.25) {
        try {
          const likeButtons = page.locator('div[role="feed"] div[role="button"][aria-label*="Thích" i], div[role="feed"] div[role="button"]:has-text("Thích")');
          const count = await likeButtons.count();
          if (count > 0) {
            // Lấy ngẫu nhiên 1 nút like trong tầm nhìn
            const targetLike = likeButtons.first();
            if (await targetLike.isVisible()) {
              await targetLike.click({ timeout: 2000 });
              likeCount++;
              onLog(`👍 [Warm-up] Đã thả cảm xúc cho bài viết (${likeCount}/${maxLikes})...`);
              await delay(2000);
            }
          }
        } catch {}
      }
    }

    // 3. Xem Video Reels ngắn (nếu bật)
    if (watchReels) {
      onLog(`🎬 [Warm-up] Chuyển sang xem video Reels ngắn...`);
      try {
        await page.goto('https://www.facebook.com/reel', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await delay(4000);

        // Xem 2 video Reels ngắn
        for (let r = 1; r <= 2; r++) {
          const watchTime = Math.floor(15000 + Math.random() * 15000); // 15 - 30 giây
          onLog(`▶️ [Warm-up] Đang xem video Reels ${r} (${Math.round(watchTime / 1000)}s)...`);
          await delay(watchTime);

          // Bấm phím Down để chuyển sang video tiếp theo
          await page.keyboard.press('ArrowDown');
          await delay(2000);
        }
      } catch (reelErr) {
        onLog(`⚠️ [Warm-up] Bỏ qua Reels: ${reelErr.message}`);
      }
    }

    // Cập nhật lịch sử
    updateAccountNurtureTime(account);
    onLog(`✅ [Warm-up] Hoàn tất phiên nuôi tự nhiên cho "${name}"!`);
    return { success: true, likesGiven: likeCount };

  } catch (err) {
    onLog(`❌ [Warm-up] Lỗi trong phiên nuôi của "${name}": ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Điều phối nuôi tự động toàn bộ Farm
 */
export async function runAutoNurtureFarm(options = {}) {
  const {
    feedScrollMinutes = 2,
    maxLikes = 2,
    watchReels = true,
    cooldownSec = 60,
    onProgress = null,
  } = options;

  const accounts = loadNurtureAccounts();
  const report = {
    startedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    completed: 0,
    failed: 0,
    logs: [],
  };

  const logMessage = (msg, type = 'info') => {
    const entry = { time: new Date().toLocaleTimeString('vi-VN'), text: msg, type };
    console.log(`[${entry.time}] ${msg}`);
    report.logs.push(entry);
    if (onProgress) onProgress({ report, currentMessage: msg });
  };

  if (accounts.length === 0) {
    logMessage('⚠️ Không tìm thấy tài khoản nào trong personal-config.json để nuôi!', 'warning');
    return report;
  }

  logMessage(`🚀 Bắt đầu kịch bản Nuôi Nick An Toàn (Auto-Nurture) cho ${accounts.length} tài khoản...`, 'info');

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    logMessage(`\n👉 [${i + 1}/${accounts.length}] Đang xử lý: "${acc.name}"...`, 'info');

    const result = await nurtureSingleAccount(
      acc,
      { feedScrollMinutes, maxLikes, watchReels },
      (text) => logMessage(text, 'info')
    );

    if (result.success) {
      report.completed++;
      logMessage(`🎉 Hoàn tất tài khoản "${acc.name}"!`, 'success');
    } else {
      report.failed++;
      logMessage(`⚠️ Tài khoản "${acc.name}" không thành công: ${result.error}`, 'error');
    }

    // Nghỉ ngơi giữa các tài khoản
    if (i < accounts.length - 1) {
      const restSec = cooldownSec + Math.floor(Math.random() * 30);
      logMessage(`⏳ Nghỉ giãn cách an toàn ${restSec}s trước khi chuyển nick tiếp theo...`, 'info');
      await delay(restSec * 1000);
    }
  }

  report.completedAt = new Date().toISOString();
  logMessage(`\n🎉 HOÀN TẤT CHIẾN DỊCH NUÔI NICK! Thành công: ${report.completed}/${accounts.length}`, 'success');
  return report;
}

// Nếu thực thi trực tiếp qua CLI
if (process.argv[1] && process.argv[1].endsWith('auto-nurture-farm.mjs')) {
  runAutoNurtureFarm({
    feedScrollMinutes: 2,
    maxLikes: 2,
    watchReels: true,
    cooldownSec: 45,
  }).catch((err) => {
    console.error('Fatal Nurture Error:', err);
    process.exit(1);
  });
}
