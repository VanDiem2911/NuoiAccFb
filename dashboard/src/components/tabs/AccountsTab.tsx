'use client';

import React, { useState } from 'react';
import {
  Users,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Lock,
  Unlock,
  UserPlus,
  UserCheck,
  Activity,
  KeyRound,
  ShieldAlert,
  Upload,
  Sprout,
  X,
} from 'lucide-react';
import { AccountCategory, AccountItem } from '@/types/dashboard';
import ImportAccountsModal from '@/components/modals/ImportAccountsModal';
import AutoNurtureModal from '@/components/modals/AutoNurtureModal';

interface AccountsTabProps {
  accounts: AccountCategory[];
  fetchAccounts: () => Promise<void>;
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  handleDeleteFbAccount: (id: string, port: number, name: string) => Promise<void>;
  handleMarkCheckpoint?: (accountId: string, category: string, reason?: string) => Promise<void>;
  handleResolveCheckpoint?: (accountId: string, category: string) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToNurture?: () => void;
  onNavigateToFriend?: () => void;
}

export default function AccountsTab({
  accounts,
  fetchAccounts,
  handleOpenChrome,
  handleDeleteFbAccount,
  handleMarkCheckpoint,
  handleResolveCheckpoint,
  showToast,
  onNavigateToNurture,
  onNavigateToFriend,
}: AccountsTabProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoNurtureModalOpen, setIsAutoNurtureModalOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);

  // Manual Add Form State
  const [manualUid, setManualUid] = useState('');
  const [manualPass, setManualPass] = useState('');
  const [manual2Fa, setManual2Fa] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Auto Login State per account
  const [loggingInId, setLoggingInId] = useState<string | null>(null);

  const checkpointCategory = accounts.find((c) => c.category === 'checkpoint');
  const facebookCategory = accounts.find((c) => c.category === 'facebook');
  const allFbAccounts = facebookCategory ? facebookCategory.items : [];

  // Thêm tài khoản thủ công qua API import
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim() || !manualPass.trim()) {
      if (showToast) showToast('Vui lòng nhập UID/Tài khoản và Mật khẩu!', 'error');
      return;
    }

    try {
      setManualLoading(true);
      const rawLine = `${manualUid.trim()}|${manualPass.trim()}|${manual2Fa.trim()}|${manualName.trim()}`;
      const res = await fetch('/api/facebook/import-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawLine, append: true }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (showToast) showToast(data.error || 'Lỗi thêm tài khoản!', 'error');
        return;
      }

      if (showToast) showToast('🎉 Đã thêm tài khoản Facebook thành công!', 'success');
      setManualUid('');
      setManualPass('');
      setManual2Fa('');
      setManualName('');
      setIsManualAddOpen(false);
      await fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi: ' + msg, 'error');
    } finally {
      setManualLoading(false);
    }
  };

  // Tự động đăng nhập 2FA
  const handleTriggerAutoLogin = async (acc: AccountItem) => {
    try {
      setLoggingInId(acc.id);
      if (showToast) showToast(`🔑 Đang tự động đăng nhập cho "${acc.name}"...`, 'info');

      const res = await fetch('/api/facebook/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: acc.rawId || acc.id, port: acc.port }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (showToast) showToast(data.error || 'Lỗi đăng nhập tài khoản!', 'error');
        return;
      }

      if (showToast) showToast(`✅ ${data.message || 'Đăng nhập thành công!'}`, 'success');
      await fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi đăng nhập: ' + msg, 'error');
    } finally {
      setLoggingInId(null);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* ==================== HEADER BANNER & ACTION BUTTONS ==================== */}
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-blue-50 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              QUẢN LÝ TÀI KHOẢN NUÔI FACEBOOK
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Danh Sách Tài Khoản Facebook Đang Nuôi
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Mỗi nick được cấp riêng <b>1 Port Remote</b> và <b>1 Profile Chrome</b> độc lập (Chống checkpoint chéo). Hỗ trợ đăng nhập tự động bằng mã OTP 2FA và chạy kịch bản nuôi nick.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              📥 Nhập danh sách (UID|Pass|2FA)
            </button>
            <button
              onClick={() => setIsManualAddOpen(true)}
              className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-extrabold bg-white text-blue-700 hover:bg-blue-50 rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              Thêm nick thủ công
            </button>
            {onNavigateToNurture ? (
              <button
                onClick={onNavigateToNurture}
                className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-extrabold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-300/40 text-teal-100 rounded-2xl transition-all cursor-pointer backdrop-blur-md"
              >
                <Sprout className="w-4 h-4 text-teal-300" />
                Nuôi nick (Warm-up)
              </button>
            ) : null}
          </div>
        </div>

        {/* ==================== KHU VỰC CÁCH LY CHECKPOINT ==================== */}
        {checkpointCategory && checkpointCategory.items.length > 0 ? (
          <div className="rounded-3xl p-7 space-y-5 border-2 border-rose-300 bg-rose-50/40 shadow-md animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-rose-950 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
                  Khu Vực Cách Ly Checkpoint ({checkpointCategory.items.length} tài khoản cần xác thực)
                </h3>
                <p className="text-xs text-rose-800 font-medium mt-0.5">
                  Tài khoản đang bị Facebook yêu cầu xác minh người thật. Hãy bấm &quot;Mở Chrome để xác minh&quot; để gỡ ngay.
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full border border-rose-300 animate-pulse">
                🔴 {checkpointCategory.items.length} Cần xác minh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {checkpointCategory.items.map((acc: AccountItem) => (
                <div
                  key={acc.id}
                  className="rounded-2xl p-5 border-2 border-rose-200 bg-white shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                        Port: {acc.port}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                        CẦN XÁC THỰC
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                      {acc.name}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono block">
                      📁 Profile: <b>{acc.profileDir}</b>
                    </span>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{acc.checkpointReason || 'Facebook yêu cầu xác nhận danh tính người thật.'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-rose-100">
                    <button
                      onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.checkpointUrl || acc.url || 'https://www.facebook.com/')}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome để xác minh
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveCheckpoint?.(acc.id, 'facebook')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Bấm sau khi đã vào Chrome xác thực xong với Facebook"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Đã xác thực xong
                      </button>
                      <button
                        onClick={() => handleDeleteFbAccount(acc.id, acc.port, acc.name)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="Xóa tài khoản này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ==================== DANH SÁCH TÀI KHOẢN FACEBOOK ==================== */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Tất Cả Tài Khoản Facebook ({allFbAccounts.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Các nick Facebook nuôi riêng biệt trên từng cổng Chrome DevTools Protocol độc lập.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAccounts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Làm mới
              </button>
            </div>
          </div>

          {allFbAccounts.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-slate-800">Chưa có tài khoản Facebook nào</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy nhấn nút &quot;📥 Nhập danh sách (UID|Pass|2FA)&quot; để dán danh sách tài khoản cần nuôi vào hệ thống.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Nhập danh sách ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allFbAccounts.map((acc: AccountItem) => {
                const isLoggingIn = loggingInId === acc.id;

                return (
                  <div
                    key={acc.id}
                    className="rounded-2xl p-5 border border-slate-200/90 bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Status Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                          Port: {acc.port}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {acc.isReady ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Chrome Online
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Offline
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & UID */}
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                          {acc.name}
                        </h4>
                        <span className="text-xs text-slate-500 font-mono block mt-0.5 truncate">
                          📁 {acc.profileDir}
                        </span>
                      </div>

                      {/* 2FA & Security Badge */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          <KeyRound className="w-3 h-3 text-blue-500" />
                          2FA Sẵn Sàng
                        </span>
                        {acc.lastNurturedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-100">
                            <Sprout className="w-3 h-3 text-teal-500" />
                            Đã nuôi gần đây
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.url || 'https://www.facebook.com/')}
                          className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          title="Mở trình duyệt Chrome với profile riêng này"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome
                        </button>

                        <button
                          onClick={() => handleTriggerAutoLogin(acc)}
                          disabled={isLoggingIn}
                          className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          title="Tự động điền tài khoản, mật khẩu và tính mã 2FA để đăng nhập"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {isLoggingIn ? 'Đang login...' : 'Auto Login'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => handleMarkCheckpoint?.(acc.id, 'facebook', 'Người dùng bấm báo checkpoint')}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-3 h-3" /> Báo Checkpoint
                        </button>

                        <button
                          onClick={() => handleDeleteFbAccount(acc.id, acc.port, acc.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa tài khoản này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nhập Danh Sách UID|Pass|2FA */}
      <ImportAccountsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchAccounts}
        showToast={showToast}
      />

      {/* Modal Thêm Nick Thủ Công */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-black">Thêm Tài Khoản Facebook Mới</h3>
              </div>
              <button
                onClick={() => setIsManualAddOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UID / Tài khoản đăng nhập *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 61594061596646"
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu Facebook *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập mật khẩu tài khoản"
                  value={manualPass}
                  onChange={(e) => setManualPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Mã Khóa Bảo Mật 2FA (Secret Key)</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Tự giải mã TOTP</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: T5NA4W6FAGZWMXQX"
                  value={manual2Fa}
                  onChange={(e) => setManual2Fa(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên gợi nhớ (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nick Bán Hàng 1"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {manualLoading ? 'Đang thêm...' : 'Thêm Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
