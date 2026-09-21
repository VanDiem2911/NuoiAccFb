'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  RefreshCw,
  Power,
  Sprout,
  UserCheck,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Radio,
} from 'lucide-react';

import {
  ServerStatus,
  AccountCategory,
  AccountItem,
} from '@/types/dashboard';

import AccountsTab from '@/components/tabs/AccountsTab';
import NurtureTab from '@/components/tabs/NurtureTab';
import FriendTab from '@/components/tabs/FriendTab';
import OverviewTab from '@/components/tabs/OverviewTab';
import ImportAccountsModal from '@/components/modals/ImportAccountsModal';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'nurture' | 'friend' | 'overview'>('accounts');
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [accounts, setAccounts] = useState<AccountCategory[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Server Status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
      }
    } catch {}
  };

  // Fetch Accounts
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.ok && Array.isArray(data.categories)) {
        setAccounts(data.categories);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchAccounts();
    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Open Chrome
  const handleOpenChrome = async (profileDir: string, port: number, url = 'https://www.facebook.com/') => {
    showToast(`Đang mở Chrome (${profileDir} - Port ${port})...`, 'info');
    try {
      const res = await fetch('/api/accounts/open-chrome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileDir, port, url }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setTimeout(() => { fetchStatus(); fetchAccounts(); }, 3500);
      } else {
        showToast(data.error || 'Lỗi mở Chrome', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Delete Facebook Account
  const handleDeleteFbAccount = async (id: string, port: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản Facebook "${name}" khỏi hệ thống?`)) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_unified_fb_account', id, port, name }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã xóa tài khoản', 'success');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi xóa tài khoản', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Checkpoint actions
  const handleMarkCheckpoint = async (accountId: string, category: string, reason?: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_checkpoint', accountId, category, reason }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'info');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái', 'error');
      }
    } catch {}
  };

  const handleResolveCheckpoint = async (accountId: string, category: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_checkpoint', accountId, category }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi giải tỏa checkpoint', 'error');
      }
    } catch {}
  };

  // Restart Servers
  const handleRestartServers = async () => {
    if (!confirm('Khởi động lại toàn bộ hệ thống (Dashboard Port 3100 + Bridge Server 3101)?')) return;
    try {
      showToast('Đang khởi động lại hệ thống...', 'info');
      const res = await fetch('/api/servers/restart', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Đang khởi động lại...', 'success');
      setTimeout(fetchStatus, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const fbCategory = accounts.find((c) => c.category === 'facebook');
  const allFbItems: AccountItem[] = fbCategory ? fbCategory.items : [];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Floating Glass Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              FB
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                FB Farm Pro
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v2.0 Auto
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Hệ Thống Tự Động Nuôi Nick & Kết Bạn Facebook An Toàn</p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <nav className="flex items-center bg-slate-200/60 p-1 rounded-2xl border border-slate-300/60 backdrop-blur-md shadow-xs flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-900/5 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4" /> Tài khoản FB ({allFbItems.length})
            </button>

            <button
              onClick={() => setActiveTab('nurture')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'nurture'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/25 font-bold'
                  : 'text-slate-600 hover:text-teal-700 hover:bg-white/60'
              }`}
            >
              <Sprout className="w-4 h-4 text-emerald-300" /> Nuôi Nick (Warm-up)
            </button>

            <button
              onClick={() => setActiveTab('friend')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'friend'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-300" /> Kết Bạn Chéo
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-900/5 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Tổng Quan
            </button>
          </nav>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { fetchStatus(); fetchAccounts(); showToast('Đã làm mới dữ liệu!', 'info'); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/80 hover:bg-white border border-slate-200/90 rounded-xl text-slate-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Làm mới
            </button>
            <button
              onClick={handleRestartServers}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" /> Khởi động lại
            </button>
          </div>

        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={accounts}
            fetchAccounts={fetchAccounts}
            handleOpenChrome={handleOpenChrome}
            handleDeleteFbAccount={handleDeleteFbAccount}
            handleMarkCheckpoint={handleMarkCheckpoint}
            handleResolveCheckpoint={handleResolveCheckpoint}
            showToast={showToast}
            onNavigateToNurture={() => setActiveTab('nurture')}
            onNavigateToFriend={() => setActiveTab('friend')}
          />
        )}

        {activeTab === 'nurture' && (
          <NurtureTab showToast={showToast} />
        )}

        {activeTab === 'friend' && (
          <FriendTab showToast={showToast} />
        )}

        {activeTab === 'overview' && (
          <OverviewTab
            status={status}
            accounts={allFbItems}
            handleOpenChrome={handleOpenChrome}
            setActiveTab={setActiveTab}
            openImportModal={() => setIsImportModalOpen(true)}
          />
        )}
      </main>

      {/* Global Import Accounts Modal */}
      <ImportAccountsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchAccounts}
        showToast={showToast}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 pointer-events-auto transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-700 text-white'
                : toast.type === 'error'
                ? 'bg-rose-900/90 border-rose-700 text-white'
                : 'bg-slate-900/90 border-slate-700 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Radio className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-medium leading-relaxed flex-1">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
