'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface ImportAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ImportAccountsModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: ImportAccountsModalProps) {
  const [rawText, setRawText] = useState('');
  const [append, setAppend] = useState(true);
  const [loading, setLoading] = useState(false);

  // Phân tích xem trước danh sách tài khoản theo thời gian thực
  const parsedPreview = useMemo(() => {
    if (!rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'));
    return lines.map((line, idx) => {
      const delimiter = line.includes('|') ? '|' : line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map((p) => p.trim());
      const username = parts[0] || '';
      const password = parts[1] || '';
      const twoFa = parts[2] || '';
      const name = parts[3] || (username.length > 15 ? username.slice(-6) : username);
      const isValid = Boolean(username && password);
      return { idx: idx + 1, username, password, twoFa, name, isValid };
    });
  }, [rawText]);

  const validCount = parsedPreview.filter((p) => p.isValid).length;

  const handleImport = async () => {
    if (validCount === 0) {
      if (showToast) showToast('Vui lòng nhập ít nhất 1 tài khoản hợp lệ (UID|Pass|2FA)!', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/facebook/import-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, append }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (showToast) showToast(data.error || 'Lỗi nhập danh sách tài khoản!', 'error');
        return;
      }

      if (showToast) showToast(`🎉 Đã nhập thành công ${data.importedCount} tài khoản!`, 'success');
      setRawText('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi hệ thống: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Upload className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Nhập Danh Sách Tài Khoản Facebook</h3>
              <p className="text-xs text-blue-100 font-medium">
                Tự động tạo Profile Chrome, gán Port độc lập và cấu hình 2FA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Hướng dẫn định dạng */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <Info className="w-4 h-4 text-blue-600" />
              Định dạng dòng được hỗ trợ (Mỗi nick 1 dòng):
            </div>
            <div className="font-mono bg-white/80 p-2.5 rounded-xl border border-blue-100 text-[11px] text-slate-800 space-y-1">
              <div>UID|Mật khẩu|Mã 2FA (Khuyên dùng)</div>
              <div>1000889218291|Matkhau123|JBSWY3DPEHPK3PXP</div>
              <div>email@gmail.com|Matkhau123|JBSWY3DPEHPK3PXP|Tên Nick</div>
            </div>
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              Mỗi nick sau khi nhập sẽ tự động được cấp <b>1 Cổng CDP độc lập (9323, 9324...)</b> và <b>1 Thư mục Profile riêng</b> (Chống checkpoint chéo 100%).
            </p>
          </div>

          {/* Khung nhập văn bản */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Dán danh sách tài khoản vào đây:</span>
              <span className="text-slate-400 font-normal">
                Đã nhận diện: <b className="text-emerald-600 font-bold">{validCount}</b> tài khoản
              </span>
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="1000889218291|Matkhau123|JBSWY3DPEHPK3PXP&#10;1000889218292|Matkhau123|JBSWY3DPEHPK3PXP|Kiều Phương Thanh"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono text-xs text-slate-800 bg-slate-50/50"
            />
          </div>

          {/* Tùy chọn */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={append}
                onChange={(e) => setAppend(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Thêm dồn vào danh sách hiện tại (Không xóa các nick cũ)</span>
            </label>
          </div>

          {/* Bảng xem trước */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700">Xem trước dữ liệu phân tích ({parsedPreview.length} dòng):</div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 pl-3">STT</th>
                      <th className="p-2">Tài khoản / UID</th>
                      <th className="p-2">Mật khẩu</th>
                      <th className="p-2">Mã 2FA</th>
                      <th className="p-2 pr-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {parsedPreview.map((item) => (
                      <tr key={item.idx} className={item.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50'}>
                        <td className="p-2 pl-3 text-slate-400 font-sans">{item.idx}</td>
                        <td className="p-2 font-semibold text-slate-800">{item.username}</td>
                        <td className="p-2 text-slate-500">••••••••</td>
                        <td className="p-2 text-slate-600 truncate max-w-[120px]">
                          {item.twoFa ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                              <KeyRound className="w-3 h-3" /> {item.twoFa.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Không có</span>
                          )}
                        </td>
                        <td className="p-2 pr-3 font-sans">
                          {item.isValid ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" /> Thiếu pass
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-[11px] text-slate-500">
            Hỗ trợ giải mã 2FA TOTP RFC 6238 thời gian thực
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || validCount === 0}
              className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Đang lưu...'
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Nhập {validCount > 0 ? `${validCount} Nick` : ''} & Khởi Tạo Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
