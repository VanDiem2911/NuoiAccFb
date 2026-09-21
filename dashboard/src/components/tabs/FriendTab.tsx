'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  UserPlus,
  Play,
  Square,
  RefreshCw,
  Clock,
  ShieldCheck,
  Terminal,
  Activity,
  CheckCircle2,
  Sliders,
  Users,
} from 'lucide-react';

interface FriendTabProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function FriendTab({ showToast }: FriendTabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [delaySec, setDelaySec] = useState(6);
  const [dryRun, setDryRun] = useState(false);

  const [stats, setStats] = useState({
    requestsSent: 0,
    requestsAccepted: 0,
    alreadyFriends: 0,
    totalAccounts: 0,
    skipped: 0,
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll status from /api/facebook/auto-friend
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/facebook/auto-friend');
      const data = await res.json();
      if (data.ok && data.state) {
        setIsRunning(Boolean(data.state.isRunning));
        setLogs(data.state.logs || []);
        setCurrentMessage(data.state.currentMessage || '');
        if (data.state.stats) {
          setStats(data.state.stats);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStart = async () => {
    try {
      setIsRunning(true);
      const res = await fetch('/api/facebook/auto-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', delaySec, dryRun }),
      });
      const data = await res.json();
      if (!data.ok) {
        setIsRunning(false);
        if (showToast) showToast(data.error || 'Lỗi khởi chạy kết bạn chéo', 'error');
        return;
      }
      if (showToast) showToast('🤝 Bắt đầu kịch bản kết bạn chéo giữa các nick!', 'success');
      fetchStatus();
    } catch (err: unknown) {
      setIsRunning(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi: ' + msg, 'error');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/facebook/auto-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsRunning(false);
        if (showToast) showToast('Đã dừng tiến trình kết bạn chéo!', 'info');
        fetchStatus();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-blue-50 border border-white/20">
            <UserCheck className="w-3.5 h-3.5 text-blue-200" />
            KỊCH BẢN KẾT BẠN CHÉO (CROSS-FRIEND NETWORK)
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Tự Động Kết Bạn Chéo Giữa Các Tài Khoản Nuôi
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
            Các tài khoản tự động truy cập trang cá nhân của nhau, xác định chính xác nút &quot;Thêm bạn bè&quot; bằng tọa độ chuột CDP để gửi lời mời và chấp nhận lời mời, giúp mạng lưới tài khoản có bạn bè thật an toàn.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-black bg-white text-blue-700 hover:bg-blue-50 rounded-2xl shadow-xl shadow-blue-950/15 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-blue-600 text-blue-600" />
              BẮT ĐẦU KẾT BẠN CHÉO
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-black bg-rose-600 text-white hover:bg-rose-500 rounded-2xl shadow-xl shadow-rose-950/20 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              DỪNG TIẾN TRÌNH
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Parameters & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cấu hình kết bạn */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Cài Đặt Kịch Bản
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
              Auto Friend
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Thời gian nghỉ giữa các lời mời (giây):
              </label>
              <input
                type="number"
                min="3"
                max="60"
                value={delaySec}
                onChange={(e) => setDelaySec(Math.max(3, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Gợi ý: Mặc định 6 giây là an toàn.</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Chế độ Thử nghiệm (Dry-Run)</span>
                  <span className="text-[10px] text-slate-500">Chỉ kiểm tra nút kết bạn, không bấm gửi thật</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-800 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                💡 Cơ chế thông minh:
              </span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Hệ thống tự động phát hiện nếu 2 tài khoản đã là bạn bè thì lập tức bỏ qua, không gửi lời mời trùng lặp.
              </p>
            </div>
          </div>
        </div>

        {/* Thống kê tiến độ trực tiếp */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Trạng Thái Kết Bạn Chéo
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isRunning
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  ></span>
                  {isRunning ? 'Đang chạy' : 'Tạm dừng'}
                </span>
              </div>
            </div>

            {/* Thông báo hành động hiện tại */}
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Tiến độ hiện tại
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                  {currentMessage || (isRunning ? 'Đang quét profile...' : 'Hệ thống sẵn sàng. Bấm nút bắt đầu để kết bạn chéo.')}
                </p>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-xs text-blue-600 font-medium block">Lời Mời Đã Gửi</span>
                <span className="text-lg font-black text-blue-700 mt-0.5 block">
                  {stats.requestsSent || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-xs text-emerald-600 font-medium block">Đã Là Bạn Bè</span>
                <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                  {stats.alreadyFriends || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <span className="text-xs text-indigo-600 font-medium block">Đã Chấp Nhận</span>
                <span className="text-lg font-black text-indigo-700 mt-0.5 block">
                  {stats.requestsAccepted || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 font-medium block">Bỏ Qua / Lỗi</span>
                <span className="text-lg font-black text-slate-700 mt-0.5 block">
                  {stats.skipped || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Sử dụng Playwright CDP Hardware click (bỏ qua tab bar Bạn bè)
            </span>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Console Logs */}
      <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              TERMINAL LOG TRỰC TIẾP (AUTO-FRIEND CONSOLE)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {logs.length} dòng log
          </span>
        </div>

        <div className="h-72 overflow-y-auto font-mono text-xs space-y-1.5 pr-2 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-10 text-center">
              Chưa có nhật ký hoạt động. Bấm &quot;BẮT ĐẦU KẾT BẠN CHÉO&quot; để theo dõi chi tiết.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-rose-400 font-bold'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
