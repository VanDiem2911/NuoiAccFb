/**
 * scripts/auto-friend-farm.mjs
 * 
 * Kịch bản tự động hoá kết bạn chéo giữa các tài khoản Facebook (Auto-Friend Farm).
 * Tính năng:
 * - Tự động phát hiện Profile URL chuẩn (qua facebook.com/me) cho từng nick.
 * - Lần lượt điều khiển từng tài khoản ghé thăm trang cá nhân của các tài khoản khác trong farm.
 * - Tự động bấm "Thêm bạn bè" (Add friend).
 * - Tự động phát hiện nếu đối phương đã gửi lời mời -> Bấm "Xác nhận / Chấp nhận" ngay lập tức.
 * - Bỏ qua nếu đã là bạn bè hoặc đã gửi lời mời trước đó.
 * - Chạy tuần tự với delay ngẫu nhiên mô phỏng người thật, chống checkpoint tuyệt đối.
 */

import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Đường dẫn các file cấu hình
const CONFIG_PERSONAL_PATH = path.join(rootDir, 'configs', 'personal-config.json');
const CONFIG_GROUPS_PATH = path.join(rootDir, 'configs', 'groups-config.json');
const CONFIG_FANPAGE_PATH = path.join(rootDir, 'configs', 'fanpage-config.json');
const CONFIG_CREDENTIALS_PATH = path.join(rootDir, 'configs', 'credentials-config.json');

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

/** Tự động bật Chrome cho tài khoản tương ứng nếu chưa chạy */
export async function ensureChromeForAccount(account) {
  const targetPort = account.port;
  if (!targetPort) throw new Error(`Tài khoản "${account.name}" không có cổng CDP!`);

  if (await isPortReady(targetPort)) {
    return `http://127.0.0.1:${targetPort}`;
  }

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', account.profileDir || `n8n-fb-profile-${targetPort}`);
  console.log(`[Auto-Friend] 🚀 Đang khởi động Chrome cho "${account.name}" (Port: ${targetPort})...`);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      'https://www.facebook.com/',
    ],
    { detached: true, stdio: 'ignore' }
  ).unref();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Auto-Friend] ✅ Chrome "${account.name}" đã sẵn sàng trên cổng ${targetPort}.`);
      await delay(3000);
      return `http://127.0.0.1:${targetPort}`;
    }
  }

  throw new Error(`Không thể kết nối tới Chrome cổng ${targetPort} sau 30 giây.`);
}

/** Đọc toàn bộ danh sách tài khoản Facebook từ các nguồn cấu hình */
export function loadAllFacebookAccounts() {
  const accountMap = new Map();

  function addAccount(acc, source) {
    if (!acc) return;
    const port = Number(acc.port) || 0;
    const key = port > 0 ? `port_${port}` : `acc_${acc.id || acc.name}`;
    
    if (accountMap.has(key)) {
      const existing = accountMap.get(key);
      if (!existing.profileUrl && (acc.profileUrl || acc.pageUrl || acc.url)) {
        existing.profileUrl = acc.profileUrl || acc.pageUrl || acc.url;
      }
      return;
    }

    const pDir = acc.profileDir || (port > 0 ? `n8n-fb-profile-${port}` : 'n8n-fb-profile-9323');
    accountMap.set(key, {
      id: String(acc.id || key),
      name: acc.name || `Tài khoản FB (${port || 'N/A'})`,
      port,
      profileDir: pDir,
      profileUrl: acc.profileUrl || acc.pageUrl || acc.url || '',
      enabled: acc.enabled !== false,
      source,
    });
  }

  // 1. Từ personal-config.json
  if (fs.existsSync(CONFIG_PERSONAL_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PERSONAL_PATH, 'utf-8'));
      const list = Array.isArray(data.accounts) ? data.accounts : (data.profileUrl ? [data] : []);
      list.forEach((a) => addAccount(a, 'personal'));
    } catch {}
  }

  // 2. Từ groups-config.json
  if (fs.existsSync(CONFIG_GROUPS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_GROUPS_PATH, 'utf-8'));
      if (Array.isArray(data.accounts)) {
        data.accounts.forEach((a) => addAccount(a, 'groups'));
      }
    } catch {}
  }

  // 3. Từ fanpage-config.json
  if (fs.existsSync(CONFIG_FANPAGE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FANPAGE_PATH, 'utf-8'));
      const list = Array.isArray(data.accounts) ? data.accounts : (data.pageUrl ? [data] : []);
      list.forEach((a) => addAccount(a, 'fanpage'));
    } catch {}
  }

  // 4. Từ credentials-config.json
  if (fs.existsSync(CONFIG_CREDENTIALS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_CREDENTIALS_PATH, 'utf-8'));
      if (Array.isArray(data.facebook)) {
        data.facebook.forEach((a) => addAccount(a, 'credentials'));
      }
    } catch {}
  }

  // Đảm bảo mỗi nick có port riêng biệt nếu chưa có
  const accounts = Array.from(accountMap.values()).filter((a) => a.enabled !== false);
  const usedPorts = new Set();
  let nextPort = 9323;

  for (const acc of accounts) {
    if (!acc.port || acc.port < 9323 || usedPorts.has(acc.port)) {
      while (usedPorts.has(nextPort)) nextPort++;
      acc.port = nextPort;
      acc.profileDir = `n8n-fb-profile-${nextPort}`;
      usedPorts.add(nextPort);
      nextPort++;
    } else {
      usedPorts.add(acc.port);
    }
  }

  return accounts;
}

/** Cập nhật URL trang cá nhân vào file cấu hình để tái sử dụng */
export function saveDetectedProfileUrl(account, detectedUrl) {
  if (!detectedUrl || detectedUrl === 'https://www.facebook.com/' || detectedUrl.includes('/login') || detectedUrl.includes('/checkpoint')) return;

  function updateInFile(filePath) {
    let data = { accounts: [] };
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!Array.isArray(data.accounts)) data.accounts = [];
      } catch {
        data = { accounts: [] };
      }
    }

    let modified = false;
    let found = false;

    for (const a of data.accounts) {
      if (Number(a.port) === account.port || String(a.id) === String(account.id) || a.name === account.name) {
        a.profileUrl = detectedUrl;
        a.url = detectedUrl;
        modified = true;
        found = true;
      }
    }

    if (!found && filePath === CONFIG_PERSONAL_PATH) {
      data.accounts.push({
        id: account.id || 1,
        name: account.name,
        port: account.port,
        profileDir: account.profileDir,
        profileUrl: detectedUrl,
        url: detectedUrl,
        enabled: true,
      });
      modified = true;
    }

    if (modified) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch {}
    }
  }

  updateInFile(CONFIG_PERSONAL_PATH);
  updateInFile(CONFIG_GROUPS_PATH);
  updateInFile(CONFIG_FANPAGE_PATH);
}

/** Tự động tìm Profile URL của tài khoản bằng cách điều hướng tới /me */
export async function detectOwnProfileUrl(browser, account) {
  let context = browser.contexts()[0] || (await browser.newContext());
  let page = context.pages()[0] || (await context.newPage());

  try {
    console.log(`[Auto-Friend] 🔍 Đang xác định link cá nhân của "${account.name}"...`);
    await page.goto('https://www.facebook.com/me', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(3500);

    const currentUrl = page.url();
    const cleanUrl = currentUrl.split('?')[0];

    if (cleanUrl.includes('/checkpoint') || cleanUrl.includes('/login')) {
      console.warn(`[Auto-Friend] ⚠️ Tài khoản "${account.name}" đang bị Checkpoint hoặc chưa đăng nhập!`);
      return null;
    }

    if (cleanUrl !== 'https://www.facebook.com/' && cleanUrl !== 'https://www.facebook.com/me') {
      console.log(`[Auto-Friend] 🎯 Đã nhận diện link cá nhân của "${account.name}": ${cleanUrl}`);
      saveDetectedProfileUrl(account, cleanUrl);
      account.profileUrl = cleanUrl;
      return cleanUrl;
    }

    // Fallback: Tìm thẻ a trỏ tới profile trong giao diện
    const profileHref = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="facebook.com/"], a[role="link"]'));
      for (const a of links) {
        const href = a.href || '';
        if (href.includes('/profile.php?id=') || (href.includes('facebook.com/') && !href.includes('/groups/') && !href.includes('/watch') && !href.includes('/marketplace'))) {
          if (a.innerText && a.innerText.trim().length > 2 && a.innerText.length < 30) {
            return href.split('?')[0];
          }
        }
      }
      return null;
    });

    if (profileHref) {
      console.log(`[Auto-Friend] 🎯 Tìm thấy profile URL dự phòng: ${profileHref}`);
      saveDetectedProfileUrl(account, profileHref);
      account.profileUrl = profileHref;
      return profileHref;
    }

    return null;
  } catch (err) {
    console.warn(`[Auto-Friend] Không thể xác định profile URL của "${account.name}": ${err.message}`);
    return null;
  }
}

/** Tương tác người thật: Di chuyển chuột & cuộn trang nhẹ */
async function humanInteraction(page) {
  try {
    await page.mouse.move(100 + Math.random() * 200, 200 + Math.random() * 200);
    await delay(500 + Math.random() * 1000);
    await page.evaluate(() => window.scrollBy(0, 150 + Math.random() * 200));
    await delay(800 + Math.random() * 1200);
    await page.evaluate(() => window.scrollBy(0, -100));
  } catch {}
}

/** Chuẩn hóa chuỗi văn bản loại bỏ khoảng trắng đặc biệt (&nbsp; / \u00A0) */
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u00A0\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Kiểm tra và bấm kết bạn hoặc chấp nhận kết bạn trên trang cá nhân */
export async function checkAndAddFriend(page, targetUrl, targetAccountName) {
  console.log(`[Auto-Friend] 🌐 Truy cập trang cá nhân: "${targetAccountName}" (${targetUrl})...`);
  
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  } catch (navErr) {
    console.warn(`[Auto-Friend] Cảnh báo điều hướng: ${navErr.message}`);
  }

  // Chờ Facebook render các thành phần React SPA
  await delay(3500 + Math.random() * 1500);

  // 1. Kiểm tra checkpoint / đăng nhập
  const currentUrl = page.url();
  if (currentUrl.includes('/checkpoint') || currentUrl.includes('/login') || currentUrl.includes('facebook.com/recover')) {
    return {
      status: 'error',
      message: `Tài khoản đang bị checkpoint hoặc chưa đăng nhập Facebook! (URL: ${currentUrl})`,
    };
  }

  // 2. Kiểm tra trang cá nhân có tồn tại không
  const isUnavailable = await page.evaluate(() => {
    const body = document.body ? document.body.innerText : '';
    return (
      body.includes('Bạn không thể xem nội dung này') ||
      body.includes('Liên kết bạn truy cập có thể bị hỏng') ||
      body.includes('Trang này không khả dụng') ||
      body.includes("This content isn't available right now")
    );
  });

  if (isUnavailable) {
    return {
      status: 'unavailable',
      message: `Trang cá nhân của "${targetAccountName}" không tồn tại hoặc bị ẩn quyền riêng tư.`,
    };
  }

  // Chờ container chính của profile xuất hiện
  await page.waitForSelector('div[role="main"], div[data-pagelet="ProfileActions"], h1', { timeout: 10000 }).catch(() => {});

  // Tương tác chuột & cuộn nhẹ mô phỏng người thật
  await humanInteraction(page);
  await delay(1500);

  // =========================================================================
  // BƯỚC 1: KIỂM TRA ĐỐI PHƯƠNG ĐÃ GỬI LỜI MỜI CHO MÌNH TRƯỚC CHƯA?
  // (Nút "Phản hồi" / "Chấp nhận" / "Xác nhận" / "Confirm")
  // =========================================================================
  console.log(`[Auto-Friend] 🔍 [1/4] Kiểm tra lời mời từ "${targetAccountName}"...`);
  const acceptLocators = [
    page.locator('div[role="main"] div[role="button"], div[role="main"] button').filter({
      hasText: /^(?:xác\s*nhận|chấp\s*nhận|phản\s*hồi|confirm)$/i,
    }),
    page.locator('[aria-label*="Chấp nhận lời mời" i], [aria-label*="Xác nhận" i], [aria-label*="Confirm" i]'),
    page.locator('div[role="button"], button').filter({
      hasText: /chấp\s*nhận\s*lời\s*mời|xác\s*nhận\s*lời\s*mời/i,
    }),
  ];

  for (const loc of acceptLocators) {
    if ((await loc.count()) > 0) {
      const btn = loc.first();
      console.log(`[Auto-Friend] 🎯 Phát hiện nút Chấp nhận lời mời! Đang click...`);
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 5000 });
      await delay(2500);
      return {
        status: 'accepted',
        message: `🎉 Đối phương đã gửi lời mời trước -> Đã bấm CHẤP NHẬN kết bạn với "${targetAccountName}"!`,
      };
    }
  }

  // =========================================================================
  // BƯỚC 2: TÌM VÀ BẤM NÚT "THÊM BẠN BÈ" (ADD FRIEND) TRỰC TIẾP TRÊN HEADER
  // =========================================================================
  console.log(`[Auto-Friend] 🔍 [2/4] Tìm nút "Thêm bạn bè" trên thanh công cụ...`);

  const directAddBtnLocators = [
    // Theo text chính xác
    page.locator('div[role="main"] div[role="button"], div[role="main"] button').filter({
      hasText: /^(?:thêm\s*bạn\s*bè|thêm\s*bạn|add\s*friend)$/i,
    }),
    page.locator('div[role="button"], button').filter({
      hasText: /thêm\s*bạn\s*bè|add\s*friend/i,
    }),
    // Theo aria-label
    page.locator('[aria-label*="Thêm bạn bè" i], [aria-label*="Thêm bạn" i], [aria-label*="Add friend" i]'),
  ];

  let addFriendClicked = false;

  for (const loc of directAddBtnLocators) {
    const count = await loc.count();
    if (count > 0) {
      for (let k = 0; k < count; k++) {
        const item = loc.nth(k);
        if (await item.isVisible().catch(() => false)) {
          console.log(`[Auto-Friend] 🖱️ Tìm thấy nút "Thêm bạn bè" trực tiếp! Đang click...`);
          await item.scrollIntoViewIfNeeded().catch(() => {});
          await delay(600);
          await item.click({ timeout: 5000 });
          addFriendClicked = true;
          break;
        }
      }
      if (addFriendClicked) break;
    }
  }

  // =========================================================================
  // BƯỚC 3: NẾU CHƯA THẤY -> TÌM TRONG MENU "..." (Xem thêm / Khác / More)
  // (Dành cho tài khoản bật Professional Mode / Creator Mode / Follow Mode)
  // =========================================================================
  if (!addFriendClicked) {
    console.log(`[Auto-Friend] 🔍 [3/4] Kiểm tra trong menu "..." (Xem thêm / Khác)...`);

    const moreBtnLocators = [
      page.locator('div[role="main"] div[role="button"][aria-label*="Xem thêm" i]'),
      page.locator('div[role="main"] div[role="button"][aria-label*="Khác" i]'),
      page.locator('div[role="main"] div[role="button"][aria-label*="More" i]'),
      page.locator('div[role="main"] div[role="button"][aria-label*="Hành động khác" i]'),
      page.locator('div[role="main"] div[role="button"][aria-label*="tùy chọn" i]'),
      page.locator('div[data-pagelet="ProfileActions"] div[role="button"]').filter({
        has: page.locator('svg circle, svg path'),
      }),
    ];

    for (const moreLoc of moreBtnLocators) {
      const count = await moreLoc.count();
      for (let m = 0; m < count; m++) {
        const btn = moreLoc.nth(m);
        if (await btn.isVisible().catch(() => false)) {
          const btnText = cleanText(await btn.innerText().catch(() => ''));
          const btnLabel = cleanText(await btn.getAttribute('aria-label').catch(() => ''));

          // Bỏ qua nút Nhắn tin hoặc Theo dõi
          if (btnText.includes('nhắn tin') || btnText.includes('theo dõi') || btnLabel.includes('nhắn tin')) {
            continue;
          }

          console.log(`[Auto-Friend] 📂 Mở menu phụ "..." (${btnLabel || btnText || 'icon'})...`);
          await btn.click({ timeout: 3000 }).catch(() => {});
          await delay(1200);

          // Tìm mục "Thêm bạn bè" trong menu popup vừa mở
          const menuAddBtn = page.locator('div[role="menu"] div[role="menuitem"], div[role="menu"] div[role="button"], div[role="menuitem"]').filter({
            hasText: /thêm\s*bạn\s*bè|thêm\s*bạn|add\s*friend/i,
          });

          if ((await menuAddBtn.count()) > 0) {
            console.log(`[Auto-Friend] 🖱️ Đã tìm thấy "Thêm bạn bè" trong menu "..."! Đang click...`);
            await menuAddBtn.first().click({ timeout: 5000 });
            addFriendClicked = true;
            break;
          } else {
            // Đóng menu nếu không có
            await page.keyboard.press('Escape').catch(() => {});
            await delay(400);
          }
        }
      }
      if (addFriendClicked) break;
    }
  }

  // =========================================================================
  // XỬ LÝ SAU KHI CLICK THÊM BẠN BÈ:
  // - Xử lý popup xác nhận nếu có ("Bạn có biết người này không?")
  // - Xác minh lời mời đã được ghi nhận thành công
  // =========================================================================
  if (addFriendClicked) {
    console.log(`[Auto-Friend] ⏳ Đã bấm "Thêm bạn bè" tới "${targetAccountName}". Đang kiểm tra phản hồi...`);
    await delay(1500);

    // Kiểm tra popup hỏi xác nhận nếu có ("Bạn có biết người này không?" / "Gửi lời mời")
    const confirmModal = page.locator('div[role="dialog"]');
    if ((await confirmModal.count()) > 0 && (await confirmModal.first().isVisible().catch(() => false))) {
      console.log(`[Auto-Friend] 💬 Phát hiện popup xác nhận gửi lời mời ("Bạn có biết người này không"). Đang xác nhận...`);
      const modalConfirmBtn = confirmModal.locator('div[role="button"], button').filter({
        hasText: /gửi\s*lời\s*mời|xác\s*nhận|đồng\s*ý|tiếp\s*tục|confirm|send/i,
      });

      if ((await modalConfirmBtn.count()) > 0) {
        await modalConfirmBtn.first().click({ timeout: 4000 });
        await delay(2000);
      }
    }

    await delay(2500);

    // Xác minh nút đã chuyển trạng thái thành "Đã gửi lời mời" / "Hủy lời mời"
    const verifySent = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
      return buttons.some((b) => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').replace(/[\u00A0\s]+/g, ' ').trim().toLowerCase();
        return t.includes('đã gửi lời mời') || t.includes('hủy lời mời') || t.includes('cancel request');
      });
    });

    if (verifySent) {
      return {
        status: 'sent',
        message: `✅ Đã gửi lời mời kết bạn thành công tới "${targetAccountName}"! (Đã chuyển sang trạng thái "Đã gửi lời mời")`,
      };
    }

    return {
      status: 'sent_unverified',
      message: `Đã bấm gửi kết bạn tới "${targetAccountName}".`,
    };
  }

  // =========================================================================
  // BƯỚC 4: NẾU KHÔNG CÓ NÚT THÊM BẠN BÈ -> KIỂM TRA TRẠNG THÁI KHÁC
  // (Đã gửi lời mời trước đó, Đã là bạn bè thật sự, hoặc Chặn kết bạn)
  // =========================================================================
  console.log(`[Auto-Friend] 🔍 [4/4] Kiểm tra trạng thái quan hệ khác...`);

  // A. Kiểm tra "Đã gửi lời mời" / "Hủy lời mời"
  const requestSent = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
    return buttons.some((el) => {
      const t = (el.innerText || el.getAttribute('aria-label') || '').replace(/[\u00A0\s]+/g, ' ').trim().toLowerCase();
      return t.includes('đã gửi lời mời') || t.includes('hủy lời mời') || t.includes('cancel request');
    });
  });

  if (requestSent) {
    return {
      status: 'already_requested',
      message: `Đã gửi lời mời kết bạn trước đó tới "${targetAccountName}". Đang chờ đối phương đồng ý.`,
    };
  }

  // B. Kiểm tra "ĐÃ LÀ BẠN BÈ" THỰC SỰ
  // (Chỉ kiểm tra div[role="button"] trong header hành động của profile, loại trừ role="tab" và role="link")
  const isTrulyFriends = await page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('div[role="main"] div[role="button"], div[data-pagelet="ProfileActions"] div[role="button"]')
    );
    return buttons.some((el) => {
      if (el.getAttribute('role') === 'tab' || el.closest('[role="tablist"]')) return false;
      const t = (el.innerText || el.getAttribute('aria-label') || '').replace(/[\u00A0\s]+/g, ' ').trim().toLowerCase();
      return t === 'bạn bè' || t === 'friends' || t === 'hủy kết bạn' || t === 'unfriend';
    });
  });

  if (isTrulyFriends) {
    return {
      status: 'already_friends',
      message: `Đã là bạn bè với "${targetAccountName}".`,
    };
  }

  // =========================================================================
  // BƯỚC 5: DIAGNOSTIC & DEBUG NẾU HOÀN TOÀN KHÔNG TÌM THẤY GÌ
  // =========================================================================
  const debugButtons = await page.evaluate(() => {
    const list = [];
    document
      .querySelectorAll('div[role="main"] div[role="button"], div[role="main"] button, div[data-pagelet="ProfileActions"] [role="button"]')
      .forEach((el) => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').replace(/[\u00A0\s]+/g, ' ').trim();
        if (t && t.length < 40 && !list.includes(t)) list.push(t);
      });
    return list;
  });

  const screenshotDir = path.join(rootDir, 'screenshots');
  try {
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const shotPath = path.join(screenshotDir, `auto-friend-not-found-${Date.now()}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`[Auto-Friend] 📸 Đã chụp ảnh màn hình debug: ${shotPath}`);
  } catch {}

  console.warn(`[Auto-Friend] ⚠️ Không tìm thấy nút kết bạn. Các nút phát hiện được trên trang: [${debugButtons.join(', ')}]`);

  return {
    status: 'no_add_button',
    message: `Không tìm thấy nút "Thêm bạn bè" trên trang của "${targetAccountName}". (Có thể do nick này chặn kết bạn từ người lạ, chỉ cho phép Theo dõi, hoặc đã đạt giới hạn bạn bè. Các nút thấy: ${debugButtons.slice(0, 4).join(', ') || 'Không có nút'})`,
  };
}

/** Tự động duyệt toàn bộ lời mời kết bạn đang chờ trên tài khoản */
export async function acceptAllPendingRequests(page, accountName) {
  console.log(`[Auto-Friend] 📬 "${accountName}": Mở trang lời mời kết bạn (facebook.com/friends/requests)...`);
  try {
    await page.goto('https://www.facebook.com/friends/requests', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await delay(4000);

    const confirmButtons = page.locator('div[role="main"] div[role="button"], div[role="main"] button').filter({
      hasText: /^(?:xác\s*nhận|chấp\s*nhận|confirm)$/i,
    });

    let count = 0;
    const total = await confirmButtons.count();
    for (let i = 0; i < total; i++) {
      try {
        const btn = confirmButtons.nth(i);
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ timeout: 3000 });
          count++;
          await delay(1500 + Math.random() * 1000);
        }
      } catch {}
    }

    if (count > 0) {
      console.log(`[Auto-Friend] 🎉 "${accountName}" đã tự động xác nhận ${count} lời mời kết bạn!`);
      return count;
    } else {
      console.log(`[Auto-Friend] "${accountName}": Không có lời mời kết bạn mới nào đang chờ.`);
      return 0;
    }
  } catch (err) {
    console.warn(`[Auto-Friend] Lỗi duyệt lời mời cho "${accountName}": ${err.message}`);
    return 0;
  }
}

/**
 * Hàm điều phối chính (Cross-Friending Engine):
 * Kết bạn chéo toàn bộ các tài khoản trong Farm hoặc gửi tới URL chỉ định
 */
export async function runAutoFriendFarm(options = {}) {
  const {
    delayBetweenSec = 6,
    dryRun = false,
    onProgress = null,
    targetUrl = null,
    senderPort = null,
  } = options;

  const accounts = loadAllFacebookAccounts();
  const report = {
    startedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    pairsProcessed: 0,
    requestsSent: 0,
    requestsAccepted: 0,
    alreadyFriends: 0,
    skipped: 0,
    errors: [],
    logs: [],
  };

  const logMessage = (msg, type = 'info') => {
    const entry = { time: new Date().toLocaleTimeString('vi-VN'), text: msg, type };
    console.log(`[${entry.time}] ${msg}`);
    report.logs.push(entry);
    if (onProgress) onProgress({ report, currentMessage: msg });
  };

  // NẾU CHẠY CHẾ ĐỘ GỬI TỚI 1 PROFILE CHỈ ĐỊNH (--target <url>)
  if (targetUrl) {
    logMessage(`🎯 Chạy chế độ gửi kết bạn mục tiêu đơn: ${targetUrl}`, 'info');
    let sender = accounts.find((a) => (senderPort ? Number(a.port) === Number(senderPort) : true));
    if (!sender) {
      sender = {
        name: `Tài khoản FB (Port ${senderPort || 9323})`,
        port: senderPort || 9323,
        profileDir: `n8n-fb-profile-${senderPort || 9323}`,
      };
    }

    let browser = null;
    try {
      logMessage(`👉 Kết nối tài khoản "${sender.name}" (Port ${sender.port})...`, 'info');
      const cdpUrl = await ensureChromeForAccount(sender);
      browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0] || (await browser.newContext());
      const page = context.pages()[0] || (await context.newPage());

      if (!dryRun) {
        const res = await checkAndAddFriend(page, targetUrl, 'Mục tiêu Facebook');
        logMessage(`➡️ Kết quả: ${res.message}`, res.status === 'sent' || res.status === 'accepted' ? 'success' : 'info');
        if (res.status === 'sent' || res.status === 'sent_unverified') report.requestsSent++;
        else if (res.status === 'accepted') report.requestsAccepted++;
        else if (res.status === 'already_friends') report.alreadyFriends++;
        else report.skipped++;
      }
    } catch (err) {
      logMessage(`❌ Lỗi kết bạn tới mục tiêu: ${err.message}`, 'error');
      report.errors.push({ error: err.message });
    } finally {
      if (browser) await browser.close().catch(() => {});
    }

    report.completedAt = new Date().toISOString();
    return report;
  }

  if (accounts.length < 2) {
    logMessage(`⚠️ Cần ít nhất 2 tài khoản Facebook để thực hiện kết bạn chéo. Hiện chỉ tìm thấy ${accounts.length} tài khoản trong cấu hình!`, 'warning');
    return report;
  }

  logMessage(`🚀 Bắt đầu kịch bản Auto-Friend Farm cho ${accounts.length} tài khoản Facebook!`, 'info');

  // BƯỚC 1: Xác định và cập nhật Profile URL cho toàn bộ tài khoản
  logMessage(`--- BƯỚC 1: KIỂM TRA LINK PROFILE CÁ NHÂN ---`, 'info');
  for (const acc of accounts) {
    if (!acc.profileUrl || acc.profileUrl === 'https://www.facebook.com/' || !acc.profileUrl.includes('facebook.com/')) {
      try {
        const cdpUrl = await ensureChromeForAccount(acc);
        const browser = await chromium.connectOverCDP(cdpUrl);
        await detectOwnProfileUrl(browser, acc);
        await browser.close().catch(() => {});
      } catch (err) {
        logMessage(`❌ Không thể xác định profile của "${acc.name}": ${err.message}`, 'error');
      }
    }
  }

  const readyAccounts = accounts.filter((a) => Boolean(a.profileUrl && a.profileUrl.length > 20));
  if (readyAccounts.length < 2) {
    logMessage(`⚠️ Chỉ có ${readyAccounts.length} tài khoản có link profile cá nhân hợp lệ. Vui lòng mở Chrome đăng nhập Facebook cho các nick!`, 'warning');
    return report;
  }

  // BƯỚC 2: TIẾN HÀNH GỬI LỜI MỜI KẾT BẠN CHÉO
  logMessage(`--- BƯỚC 2: GỬI LỜI MỜI KẾT BẠN CHÉO (SEQUENTIAL) ---`, 'info');
  
  for (let i = 0; i < readyAccounts.length; i++) {
    const sender = readyAccounts[i];
    let browser = null;

    try {
      logMessage(`\n👉 [${i + 1}/${readyAccounts.length}] Đang kết nối tài khoản: "${sender.name}" (Port: ${sender.port})...`, 'info');
      const cdpUrl = await ensureChromeForAccount(sender);
      browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0] || (await browser.newContext());
      const page = context.pages()[0] || (await context.newPage());

      // Gửi lời mời tới tất cả các nick khác
      for (let j = 0; j < readyAccounts.length; j++) {
        if (i === j) continue;
        const receiver = readyAccounts[j];
        report.pairsProcessed++;

        logMessage(`🔎 "${sender.name}" đang kiểm tra kết bạn với "${receiver.name}"...`, 'info');

        if (dryRun) {
          logMessage(`[DRY-RUN] Bỏ qua thao tác click thực tế.`, 'info');
          continue;
        }

        try {
          const res = await checkAndAddFriend(page, receiver.profileUrl, receiver.name);
          logMessage(`➡️ "${sender.name}" -> "${receiver.name}": ${res.message}`, res.status === 'sent' || res.status === 'accepted' ? 'success' : 'info');

          if (res.status === 'sent' || res.status === 'sent_unverified') report.requestsSent++;
          else if (res.status === 'accepted') report.requestsAccepted++;
          else if (res.status === 'already_friends') report.alreadyFriends++;
          else report.skipped++;

          // Giãn cách an toàn mô phỏng người thật chống spam
          const randomSleep = (delayBetweenSec + Math.random() * 3) * 1000;
          await delay(randomSleep);
        } catch (subErr) {
          logMessage(`⚠️ Lỗi khi kết bạn với "${receiver.name}": ${subErr.message}`, 'error');
          report.errors.push({ sender: sender.name, target: receiver.name, error: subErr.message });
        }
      }

      // BƯỚC 3: Tự động duyệt các lời mời kết bạn đang chờ trên nick này
      await acceptAllPendingRequests(page, sender.name);

    } catch (err) {
      logMessage(`❌ Lỗi trên tài khoản "${sender.name}": ${err.message}`, 'error');
      report.errors.push({ account: sender.name, error: err.message });
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
      await delay(3000);
    }
  }

  report.completedAt = new Date().toISOString();
  logMessage(`\n🎉 HOÀN TẤT AUTO-FRIEND FARM! Tổng gửi: ${report.requestsSent} | Đã chấp nhận: ${report.requestsAccepted} | Đã là bạn trước đó: ${report.alreadyFriends}`, 'success');
  return report;
}

// Nếu thực thi trực tiếp qua dòng lệnh
if (process.argv[1] && process.argv[1].endsWith('auto-friend-farm.mjs')) {
  const isDryRun = process.argv.includes('--dry-run');
  const delayArgIdx = process.argv.indexOf('--delay');
  const customDelay = delayArgIdx >= 0 ? parseInt(process.argv[delayArgIdx + 1], 10) : 6;

  const targetArgIdx = process.argv.indexOf('--target');
  const customTarget = targetArgIdx >= 0 ? process.argv[targetArgIdx + 1] : null;

  const portArgIdx = process.argv.indexOf('--port');
  const customPort = portArgIdx >= 0 ? parseInt(process.argv[portArgIdx + 1], 10) : null;

  runAutoFriendFarm({
    delayBetweenSec: customDelay || 6,
    dryRun: isDryRun,
    targetUrl: customTarget,
    senderPort: customPort,
  }).catch((err) => {
    console.error('Fatal Auto-Friend Error:', err);
    process.exit(1);
  });
}
