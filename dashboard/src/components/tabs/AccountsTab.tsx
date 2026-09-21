'use client';

import React, { useState } from 'react';
import {
  Users,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit3,
  ArrowRight,
  ArrowLeftRight,
  Trash2,
  Lock,
  Unlock,
  Bot,
  UserPlus,
  UserCheck,
  Play,
  Square,
  X,
  Activity,
  KeyRound,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Power,
  Upload,
  Sprout,
} from 'lucide-react';
import { AccountCategory, AccountItem, GroupAccount, CentralPoolItem, RotationConfig } from '@/types/dashboard';
import AccountModals, {
  FbModalFormData,
  FbTargetForm,
  ChatGptModalFormData,
  EditingChatGptFormData,
} from '@/components/modals/AccountModals';
import ImportAccountsModal from '@/components/modals/ImportAccountsModal';
import AutoNurtureModal from '@/components/modals/AutoNurtureModal';

interface AccountsTabProps {
  handleMarkCheckpoint?: (accountId: string, category: string, reason?: string) => Promise<void>;
  handleResolveCheckpoint?: (accountId: string, category: string) => Promise<void>;
  accounts: AccountCategory[];
  groupsData: {
    accounts?: GroupAccount[];
    pool?: CentralPoolItem[];
    rotation?: RotationConfig;
  };
  handleChangeRoleGroup: (accId: string, roleGroup: 'group_1' | 'group_2' | 'quarantine') => Promise<void>;
  handleReleaseQuarantine: (accId: string) => Promise<void>;
  formatCountdown: (untilStr?: string | null) => string;
  handleSwitchActiveGroup: (targetGroup?: 'group_1' | 'group_2') => Promise<void>;
  handleToggleRotation: (enabled: boolean) => Promise<void>;

  fetchAccounts: () => Promise<void>;
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  handleDeleteChatGpt: (id: string, name: string) => Promise<void>;
  handleToggleAccount: (category: string, accountId: string, currentEnabled: boolean) => Promise<void>;

  // Unified Facebook Account Props
  isFbModalOpen: boolean;
  setIsFbModalOpen: (open: boolean) => void;
  isFbModalEditing: boolean;
  fbModalForm: FbModalFormData;
  setFbModalForm: React.Dispatch<React.SetStateAction<FbModalFormData>>;
  handleSaveFbAccount: (e: React.FormEvent) => Promise<void>;
  handleDeleteFbAccount: (id: string, port: number, name: string) => Promise<void>;
  handleToggleFbAccount: (id: string, port: number, currentEnabled: boolean) => Promise<void>;
  openAddFbModal: () => void;
  openEditFbModal: (acc: AccountItem) => void;
  handleAutoDetectFbName: (url: string, targetType: FbTargetForm) => Promise<void>;
  isDetectingName: boolean;

  // ChatGPT Props
  isAddChatGptOpen: boolean;
  setIsAddChatGptOpen: (open: boolean) => void;
  newChatGptForm: ChatGptModalFormData;
  setNewChatGptForm: React.Dispatch<React.SetStateAction<ChatGptModalFormData>>;
  handleCreateChatGpt: (e: React.FormEvent) => Promise<void>;
  isEditChatGptOpen: boolean;
  setIsEditChatGptOpen: (open: boolean) => void;
  editingChatGpt: EditingChatGptFormData | null;
  setEditingChatGpt: React.Dispatch<React.SetStateAction<EditingChatGptFormData | null>>;
  handleUpdateChatGpt: (e: React.FormEvent) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AccountsTab({
  accounts,
  groupsData,
  handleChangeRoleGroup,
  handleReleaseQuarantine,
  formatCountdown,
  handleSwitchActiveGroup,
  handleToggleRotation,
  fetchAccounts,
  handleOpenChrome,
  handleDeleteChatGpt,
  handleToggleAccount,
  handleMarkCheckpoint,
  handleResolveCheckpoint,

  isFbModalOpen,
  setIsFbModalOpen,
  isFbModalEditing,
  fbModalForm,
  setFbModalForm,
  handleSaveFbAccount,
  handleDeleteFbAccount,
  handleToggleFbAccount,
  openAddFbModal,
  openEditFbModal,
  handleAutoDetectFbName,
  isDetectingName,

  newChatGptForm,
  setNewChatGptForm,
  handleCreateChatGpt,
  isAddChatGptOpen,
  setIsAddChatGptOpen,
  editingChatGpt,
  setEditingChatGpt,
  handleUpdateChatGpt,
  isEditChatGptOpen,
  setIsEditChatGptOpen,
  showToast,
}: AccountsTabProps) {
  // Auto-Friend Farm & Nurture State
  const [isAutoFriendModalOpen, setIsAutoFriendModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoNurtureModalOpen, setIsAutoNurtureModalOpen] = useState(false);
  const [autoFriendRunning, setAutoFriendRunning] = useState(false);
  const [autoFriendLogs, setAutoFriendLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const [autoFriendMessage, setAutoFriendMessage] = useState('');
  const [autoFriendStats, setAutoFriendStats] = useState({
    requestsSent: 0,
    requestsAccepted: 0,
    alreadyFriends: 0,
    totalAccounts: 0,
    skipped: 0,
  });
  const [autoFriendDelay, setAutoFriendDelay] = useState(6);
  const [autoFriendDryRun, setAutoFriendDryRun] = useState(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  // Polling Auto-Friend Progress
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoFriendModalOpen) {
      const fetchStatus = async () => {
        try {
          const res = await fetch('/api/facebook/auto-friend');
          const data = await res.json();
          if (data.ok && data.state) {
            setAutoFriendRunning(Boolean(data.state.isRunning));
            setAutoFriendLogs(data.state.logs || []);
            setAutoFriendMessage(data.state.currentMessage || '');
            if (data.state.stats) {
              setAutoFriendStats(data.state.stats);
            }
          }
        } catch {}
      };
      fetchStatus();
      timer = setInterval(fetchStatus, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoFriendModalOpen]);

  // Auto-scroll logs
  React.useEffect(() => {
    if (isAutoFriendModalOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoFriendLogs, isAutoFriendModalOpen]);

  const handleStartAutoFriend = async () => {
    try {
      setAutoFriendRunning(true);
      const res = await fetch('/api/facebook/auto-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', delaySec: autoFriendDelay, dryRun: autoFriendDryRun }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAutoFriendRunning(false);
        if (showToast) showToast(data.error || 'Lỗi khởi chạy Auto-Friend', 'error');
        return;
      }
      if (showToast) showToast('🚀 Đã bắt đầu kịch bản kết bạn chéo!', 'success');
    } catch (err: unknown) {
      setAutoFriendRunning(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi: ' + msg, 'error');
    }
  };

  const handleStopAutoFriend = async () => {
    try {
      const res = await fetch('/api/facebook/auto-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoFriendRunning(false);
        if (showToast) showToast('Đã dừng tiến trình Auto-Friend!', 'info');
      }
    } catch {}
  };

  const openEditChatGptModal = (acc: AccountItem) => {
    setEditingChatGpt({
      id: acc.id,
      name: acc.name,
      profileDir: acc.profileDir,
      port: acc.port,
      desc: acc.desc || '',
    });
    setIsEditChatGptOpen(true);
  };

  const checkpointCategory = accounts.find((c) => c.category === 'checkpoint');
  const facebookCategory = accounts.find((c) => c.category === 'facebook');
  const chatgptCategory = accounts.find((c) => c.category === 'chatgpt');

  return (
    <>
      <div className="space-y-8">
        {/* ==================== HEADER BANNER & ACTION BUTTONS ==================== */}
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-blue-50 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              QUẢN LÝ TẬP TRUNG TÀI KHOẢN FACEBOOK
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Tất Cả Tài Khoản Facebook Tại Một Nơi Duy Nhất
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Mỗi tài khoản được cấp riêng <b>1 Cổng Remote Port</b> và <b>1 Thư mục Profile Chrome</b> (Độc lập 100% - Chống checkpoint chéo). Chuyên dùng để nuôi nick và đăng bài lên Trang Cá Nhân Facebook tự động.
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
              onClick={openAddFbModal}
              className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold bg-white text-blue-700 hover:bg-blue-50 rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              Thêm tài khoản thủ công
            </button>
            <button
              onClick={() => setIsAddChatGptOpen(true)}
              className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-extrabold bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-2xl transition-all cursor-pointer backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Thêm tài khoản ChatGPT
            </button>
          </div>
        </div>

        {/* ==================== KHỐI 1: TÀI KHOẢN YÊU CẦU XÁC THỰC (CHECKPOINT) ==================== */}
        {checkpointCategory && checkpointCategory.items.length > 0 ? (
          <div className="liquid-glass rounded-3xl p-7 space-y-5 border-2 border-rose-300 bg-rose-50/25 shadow-md animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-rose-950 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
                  Khu Vực Cách Ly Checkpoint ({checkpointCategory.items.length} tài khoản cần xác thực)
                </h3>
                <p className="text-xs text-rose-800 font-medium mt-0.5">
                  Tài khoản đang bị Facebook yêu cầu xác minh người thật. Hệ thống đã tạm ngưng đăng bài để bảo vệ không bị khóa nick.
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full border border-rose-300 animate-pulse">
                🔴 {checkpointCategory.items.length} Cần xác thực
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
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  Khu vực Quản lý Checkpoint & Xác thực
                </span>
                <span className="text-[11px] text-slate-500">
                  Hiện tại không có tài khoản nào dính checkpoint. Khi quét thấy hoặc bạn nhấn nút &quot;Báo checkpoint&quot;, tài khoản sẽ tự động chuyển vào đây để bảo vệ.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shrink-0">
              🟢 Tất cả an toàn
            </span>
          </div>
        )}

        {/* ==================== KHỐI 2: DANH SÁCH TÀI KHOẢN FACEBOOK TẬP TRUNG ==================== */}
        {facebookCategory && (
          <div className="liquid-glass rounded-3xl p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {facebookCategory.categoryName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {facebookCategory.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Ca trực đăng nhóm gọn gàng */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">Ca đăng:</span>
                  <span className="font-extrabold text-slate-800 flex items-center gap-1">
                    {groupsData.rotation?.activeGroupToday === 'group_1' ? (
                      <span className="text-emerald-700 font-bold">🟢 Nhóm 1</span>
                    ) : (
                      <span className="text-amber-700 font-bold">🟡 Nhóm 2</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleSwitchActiveGroup()}
                    className="ml-1 p-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-indigo-200/60 cursor-pointer"
                    title="Đổi ca trực sang nhóm khác"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAutoNurtureModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl shadow-md shadow-teal-600/25 transition-all cursor-pointer"
                  title="Tự động lướt Newsfeed, xem Reels, thả tim dạo nuôi nick tự nhiên"
                >
                  <Sprout className="w-3.5 h-3.5" /> 🌱 Tự động nuôi nick (Warm-up)
                </button>

                <button
                  type="button"
                  onClick={() => setIsAutoFriendModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                  title="Tự động cho các tài khoản Facebook kết bạn chéo với nhau để nuôi nick an toàn"
                >
                  <UserCheck className="w-3.5 h-3.5" /> 🤝 Tự động kết bạn chéo
                </button>

                <button
                  onClick={openAddFbModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản Facebook
                </button>
                <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
                  {facebookCategory.items.length} Tài khoản
                </span>
              </div>
            </div>

            {/* Grid Thẻ Tài khoản Facebook */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {facebookCategory.items.map((acc: AccountItem) => {
                const isEnabled = acc.enabled !== false;
                const isOnline = acc.isReady;

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                      !isEnabled
                        ? 'opacity-65 bg-slate-50/70 border-slate-200'
                        : 'bg-white/95 border-slate-200/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Top Bar: Port & Status */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Port Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          Port: <b className="font-mono">{acc.port}</b>
                        </span>

                        {/* Online / Login Status Badge */}
                        {acc.loginStatus === 'logged_in' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã đăng nhập
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Chưa đăng nhập
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Chrome tắt
                          </span>
                        )}
                      </div>

                      {/* Name & Profile Dir */}
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                          {acc.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          📁 Profile: <b className="text-slate-800">{acc.profileDir}</b>
                        </span>
                      </div>

                      {/* Role & Permissions Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <Users className="w-3 h-3 text-emerald-600" />
                          Trang Cá Nhân (Nuôi nick)
                        </span>
                      </div>

                      {/* Link FB */}
                      {acc.url && (
                        <a
                          href={acc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 truncate max-w-full font-mono hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{acc.url}</span>
                        </a>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.url || 'https://www.facebook.com/')}
                        className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border border-blue-200/80 cursor-pointer"
                        title="Khởi động trình duyệt Chrome của nick này để đăng nhập hoặc kiểm tra"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome Profile (Port {acc.port})
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditFbModal(acc)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Chỉnh sửa thông tin nick, quyền đăng hoặc link nhóm"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>

                        <button
                          onClick={() => handleMarkCheckpoint?.(acc.id, 'facebook')}
                          className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Báo tài khoản này bị dính checkpoint để đưa vào khu vực cách ly xác thực"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Báo checkpoint
                        </button>

                        <button
                          onClick={() => handleToggleFbAccount(acc.id, acc.port, isEnabled)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${
                            isEnabled
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={isEnabled ? 'Tạm dừng hoạt động tài khoản này' : 'Kích hoạt lại tài khoản này'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteFbAccount(acc.id, acc.port, acc.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Xóa tài khoản này khỏi hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== KHỐI 3: TÀI KHOẢN CHATGPT (TẠO ẢNH AI) ==================== */}
        {chatgptCategory && (
          <div className="liquid-glass rounded-3xl p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-violet-600" />
                  {chatgptCategory.categoryName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {chatgptCategory.description}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsAddChatGptOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-md shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản ChatGPT
                </button>
                <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
                  {chatgptCategory.items.length} Tài khoản
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chatgptCategory.items.map((acc: AccountItem) => {
                const isEnabled = acc.enabled !== false;
                const isOnline = acc.isReady;

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                      !isEnabled
                        ? 'opacity-65 bg-slate-50/70 border-slate-200'
                        : 'bg-white/95 border-slate-200/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-violet-50 text-violet-800 border border-violet-200">
                          Port: <b className="font-mono">{acc.port}</b>
                        </span>
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Offline
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                        {acc.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        📁 Profile: <b className="text-slate-800">{acc.profileDir}</b>
                      </span>
                      {acc.desc && <p className="text-xs text-slate-500">{acc.desc}</p>}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenChrome(acc.profileDir, acc.port, 'https://chatgpt.com/')}
                        className="w-full py-2 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border border-violet-200/80 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome ChatGPT
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditChatGptModal(acc)}
                          className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button
                          onClick={() => handleToggleAccount('chatgpt', acc.id, isEnabled)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isEnabled
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isEnabled ? 'Tắt' : 'Bật'}
                        </button>
                        <button
                          onClick={() => handleDeleteChatGpt(acc.id, acc.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Xóa tài khoản này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==================== TẤT CẢ CÁC MODAL THÊM / SỬA ==================== */}
      <AccountModals
        isFbModalOpen={isFbModalOpen}
        setIsFbModalOpen={setIsFbModalOpen}
        isFbModalEditing={isFbModalEditing}
        fbModalForm={fbModalForm}
        setFbModalForm={setFbModalForm}
        handleSaveFbAccount={handleSaveFbAccount}
        handleAutoDetectFbName={handleAutoDetectFbName}
        isDetectingName={isDetectingName}

        isAddChatGptOpen={isAddChatGptOpen}
        setIsAddChatGptOpen={setIsAddChatGptOpen}
        newChatGptForm={newChatGptForm}
        setNewChatGptForm={setNewChatGptForm}
        handleCreateChatGpt={handleCreateChatGpt}
        isEditChatGptOpen={isEditChatGptOpen}
        setIsEditChatGptOpen={setIsEditChatGptOpen}
        editingChatGpt={editingChatGpt}
        setEditingChatGpt={setEditingChatGpt}
        handleUpdateChatGpt={handleUpdateChatGpt}
      />

      {/* ==================== MODAL TỰ ĐỘNG KẾT BẠN CHÉO (AUTO-FRIEND FARM) ==================== */}
      {isAutoFriendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Tự Động Kết Bạn Chéo (Auto-Friend Farm)
                    {autoFriendRunning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Đang Chạy
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mô phỏng người thật, tự động thêm bạn &amp; chấp nhận kết bạn qua lại giữa các profile Chrome
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAutoFriendModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Tổng Nick</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">{facebookCategory?.items?.length || 0}</div>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Đã Gửi Lời Mời</div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">{autoFriendStats.requestsSent}</div>
                </div>
                <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200">
                  <div className="text-[10px] font-bold text-teal-700 uppercase">Đã Chấp Nhận</div>
                  <div className="text-base font-black text-teal-800 mt-0.5">{autoFriendStats.requestsAccepted}</div>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Đã Là Bạn Bè</div>
                  <div className="text-base font-black text-blue-800 mt-0.5">{autoFriendStats.alreadyFriends}</div>
                </div>
              </div>

              {/* Status Message */}
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                autoFriendRunning
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {autoFriendRunning ? (
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-semibold truncate">
                  {autoFriendMessage || 'Sẵn sàng bắt đầu tiến trình kết bạn chéo.'}
                </span>
              </div>

              {/* Settings */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Giãn cách an toàn (giây):</span>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    disabled={autoFriendRunning}
                    value={autoFriendDelay}
                    onChange={(e) => setAutoFriendDelay(Math.max(3, parseInt(e.target.value) || 6))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 font-medium">(Ngẫu nhiên +1-3s mô phỏng người thật)</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    disabled={autoFriendRunning}
                    checked={autoFriendDryRun}
                    onChange={(e) => setAutoFriendDryRun(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Chế độ thử nghiệm (Dry-Run, không click)</span>
                </label>
              </div>

              {/* Realtime Terminal Logs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Nhật ký thời gian thực ({autoFriendLogs.length} dòng):</span>
                  {autoFriendLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAutoFriendLogs([])}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Xóa nhật ký
                    </button>
                  )}
                </div>

                <div className="bg-slate-950 text-slate-200 rounded-2xl p-3.5 font-mono text-xs max-h-56 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
                  {autoFriendLogs.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-6">
                      Chưa có nhật ký hoạt động. Nhấn &quot;Bắt Đầu Kết Bạn Chéo&quot; để khởi chạy.
                    </div>
                  ) : (
                    autoFriendLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`text-[11px] leading-relaxed flex items-start gap-1.5 ${
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'warning'
                            ? 'text-amber-400'
                            : log.type === 'error'
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 select-none">[{log.time}]</span>
                        <span className="break-all">{log.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-[11px] text-slate-500">
                Chạy độc lập trên cổng 3101 • Profile riêng chống checkpoint
              </div>

              <div className="flex items-center gap-2">
                {autoFriendRunning ? (
                  <button
                    type="button"
                    onClick={handleStopAutoFriend}
                    className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Dừng Tiến Trình
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartAutoFriend}
                    className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> 🚀 BẮT ĐẦU KẾT BẠN CHÉO
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAutoFriendModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Danh Sách Tài Khoản Hàng Loạt (UID|Pass|2FA) */}
      <ImportAccountsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchAccounts}
        showToast={showToast}
      />

      {/* Modal Nuôi Nick Tự Động (Auto-Nurture) */}
      <AutoNurtureModal
        isOpen={isAutoNurtureModalOpen}
        onClose={() => setIsAutoNurtureModalOpen(false)}
        showToast={showToast}
      />
    </>
  );
}
