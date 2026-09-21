'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Globe,
  ArrowUpRight,
  Sprout,
  UserCheck,
  Upload,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ServerStatus, AccountItem } from '@/types/dashboard';

interface OverviewTabProps {
  status: ServerStatus | null;
  accounts: AccountItem[];
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  setActiveTab: (tab: 'accounts' | 'nurture' | 'friend' | 'overview') => void;
  openImportModal: () => void;
}

export default function OverviewTab({
  status,
  accounts,
  handleOpenChrome,
  setActiveTab,
  openImportModal,
}: OverviewTabProps) {
  const readyCount = accounts.filter((a) => a.isReady || a.enabled !== false).length;
  const checkpointCount = accounts.filter((a) => a.status === 'checkpoint' || a.checkpointReason).length;

  return (
    <div className="space-y-8">
      {/* Top System Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Desktop Bridge */}
        <div className="liquid-glass rounded-3xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                <Radio className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm text-slate-900">Desktop Bridge & CDP</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                status?.servers?.bridge?.active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Port 3101 (Ready)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Điều phối các trình duyệt Chrome độc lập qua Chrome DevTools Protocol
          </p>
        </div>

        {/* Facebook Accounts Status */}
        <div className="liquid-glass rounded-3xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                <Users className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm text-slate-900">Tài Khoản Nuôi</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {accounts.length} Tài khoản
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Mỗi tài khoản chạy 1 Port và Profile Chrome độc lập (Chống checkpoint chéo)
          </p>
        </div>

        {/* Checkpoint Status */}
        <div className="liquid-glass rounded-3xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`p-2 rounded-xl border shadow-xs ${
                  checkpointCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}
              >
                {checkpointCount > 0 ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </span>
              <span className="font-bold text-sm text-slate-900">Tình Trạng Checkpoint</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                checkpointCount > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {checkpointCount > 0 ? `🔴 ${checkpointCount} Cần xác minh` : '🟢 Tất cả an toàn'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {checkpointCount > 0
              ? 'Có tài khoản cần vào Chrome gỡ xác minh danh tính'
              : 'Không có tài khoản nào dính checkpoint'}
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => setActiveTab('nurture')}
          className="p-6 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/15 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <Sprout className="w-6 h-6 text-emerald-100" />
            </span>
            <ArrowUpRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          <h4 className="text-lg font-black tracking-tight">🌱 Chạy Nuôi Nick Tự Động</h4>
          <p className="text-xs text-teal-100 mt-1 font-medium leading-relaxed">
            Lướt Newsfeed, xem video Reels, tương tác thả tim dạo để làm ấm tài khoản.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('friend')}
          className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <UserCheck className="w-6 h-6 text-blue-100" />
            </span>
            <ArrowUpRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          <h4 className="text-lg font-black tracking-tight">🤝 Chạy Kết Bạn Chéo</h4>
          <p className="text-xs text-blue-100 mt-1 font-medium leading-relaxed">
            Tự động cho các tài khoản nuôi kết bạn với nhau để xây dựng tệp bạn bè an toàn.
          </p>
        </button>

        <button
          onClick={openImportModal}
          className="p-6 rounded-3xl bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-lg shadow-purple-500/15 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <Upload className="w-6 h-6 text-purple-100" />
            </span>
            <ArrowUpRight className="w-5 h-5 text-purple-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          <h4 className="text-lg font-black tracking-tight">📥 Nhập Danh Sách Mới</h4>
          <p className="text-xs text-purple-100 mt-1 font-medium leading-relaxed">
            Nhập hàng loạt nick theo cú pháp UID|Pass|2FA, tự động cấu hình Chrome.
          </p>
        </button>
      </div>

      {/* Main Grid: Direct Chrome Launchers & Safe Farming Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1-Click Chrome Launchers */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Globe className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Mở Nhanh Trình Duyệt Chrome Từng Tài Khoản
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Mở trực tiếp profile Chrome độc lập để kiểm tra trang cá nhân hoặc gỡ xác minh
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('accounts')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Xem tất cả ({accounts.length})
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Chưa có tài khoản Facebook nào. Hãy bấm &quot;Nhập danh sách mới&quot; để bắt đầu.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {accounts.slice(0, 8).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.url || 'https://www.facebook.com/')}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-blue-300 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all group cursor-pointer text-left"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-900 truncate block">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Port: {acc.port} | {acc.profileDir}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lộ trình Nuôi Nick An Toàn 7 Ngày */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Lộ Trình Nuôi Nick Mới 7 Ngày
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="font-extrabold text-emerald-800 block">Ngày 1 - 2: Làm Ấm Profile</span>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                Đăng nhập bằng 2FA, lướt Newsfeed 2-3 phút, tuyệt đối KHÔNG kết bạn, KHÔNG tham gia nhóm.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="font-extrabold text-blue-800 block">Ngày 3 - 4: Tương Tác Nhẹ</span>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                Xem video Reels 2-3 phút, thả like 1-2 bài viết của bạn bè hoặc fanpage tin tức uy tín.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <span className="font-extrabold text-purple-800 block">Ngày 5 - 7: Kết Bạn Chéo</span>
              <p className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
                Bật kịch bản Kết Bạn Chéo giữa các nick nuôi (1-2 bạn bè/ngày) để tăng độ trust vững chắc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
