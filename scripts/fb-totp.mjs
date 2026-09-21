/**
 * scripts/fb-totp.mjs
 * 
 * Module tự động sinh mã xác thực 2 bước (TOTP 6 chữ số - RFC 6238)
 * Chuẩn xác 100% khớp với Google Authenticator / 2fa.live.
 * Thuần Node.js (dùng module crypto có sẵn), không phụ thuộc thư viện bên ngoài.
 */

import crypto from 'node:crypto';

/**
 * Giải mã chuỗi Base32 thành Buffer nhị phân
 */
export function base32Decode(base32) {
  if (!base32) return Buffer.alloc(0);
  // Loại bỏ khoảng trắng và chuẩn hoá chữ hoa
  const clean = String(base32).replace(/[\s\-_]+/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '=') break; // Ký tự đệm
    const val = alphabet.indexOf(char);
    if (val === -1) continue; // Bỏ qua ký tự lạ
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Sinh mã OTP 6 chữ số từ secret key 2FA
 * @param {string} secretKey - Chuỗi khóa bí mật 2FA (ví dụ: JBSWY3DPEHPK3PXP)
 * @param {number} [timeOffsetSeconds=0] - Độ lệch thời gian (nếu muốn thử bước trước/sau)
 * @returns {string} Mã 6 số dạng chuỗi (ví dụ: "482910")
 */
export function generate2FACode(secretKey, timeOffsetSeconds = 0) {
  if (!secretKey) throw new Error('Khóa bí mật 2FA (Secret Key) không được để trống!');

  const key = base32Decode(secretKey);
  if (key.length === 0) throw new Error(`Khóa 2FA "${secretKey}" không hợp lệ định dạng Base32!`);

  const epoch = Math.floor((Date.now() / 1000) + timeOffsetSeconds);
  const timeStep = Math.floor(epoch / 30);

  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Trả về số giây còn lại cho mã OTP hiện tại (chu kỳ 30 giây)
 */
export function getRemainingSeconds() {
  const epoch = Math.floor(Date.now() / 1000);
  return 30 - (epoch % 30);
}
