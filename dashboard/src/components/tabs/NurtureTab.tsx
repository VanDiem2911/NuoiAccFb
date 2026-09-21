'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sprout,
  Play,
  Square,
  RefreshCw,
  Clock,
  Heart,
  Film,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Activity,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface NurtureTabProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function NurtureTab({ showToast }: NurtureTabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [minFeedMinutes, setMinFeedMinutes] = useState(2);
  const [maxFeedMinutes, setMaxFeedMinutes] = useState(4);
  const [minLikes, setMinLikes] = useState(1);
  const [maxLikes, setMaxLikes] = useState(2);
  const [watchReels, setWatchReels] = useState(true);
  const [cooldownSec, setCooldownSec] = useState(45);

  const [stats, setStats] = useState({
    currentAccountIndex: 0,
    totalAccounts: 0,
    currentAccountName: '',
    likedCount: 0,
    reelsWatched: 0,
    feedMinutes: 0,
    finishedAccounts: 0,
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll status from /api/facebook/auto-nurture
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/facebook/auto-nurture');
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
      const res = await fetch('/api/facebook/auto-nurture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          minFeedMinutes,
          maxFeedMinutes,
          minLikes,
          maxLikes,
          watchReels,
          cooldownSec,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setIsRunning(false);
        if (showToast) showToast(data.error || 'Lỗi khởi chạy tiến trình nuôi nick', 'error');
        return;
      }
      if (showToast) showToast('🌱 Bắt đầu kịch bản tự động nuôi nick!', 'success');
      fetchStatus();
    } catch (err: unknown) {
      setIsRunning(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (showToast) showToast('Lỗi: ' + msg, 'error');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/facebook/auto-nurture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsRunning(false);
        if (showToast) showToast('Đã gửi yêu cầu dừng nuôi nick!', 'info');
        fetchStatus();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white shadow-xl shadow-teal-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-teal-50 border border-white/20">
            <Sprout className="w-3.5 h-3.5 text-emerald-200" />
            KỊCH BẢN NUÔI NICK TỰ NHIÊN (ANTI-CHECKPOINT WARM-UP)
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Tự Động Nuôi Nick & Tương Tác Giả Lập Người Thật
          </h2>
          <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
            Mô phỏng hành vi tự nhiên: Tự mở từng profile Chrome riêng biệt, lướt bảng tin ngẫu nhiên, xem video Reels, thả like bài viết và giãn cách thời gian giữa các tài khoản để tài khoản có độ trust cao nhất.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-black bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl shadow-xl shadow-emerald-950/15 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              BẮT ĐẦU NUÔI TẤT CẢ ACC
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
        {/* Cấu hình tham số nuôi */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              Cấu Hình Tham Số Nuôi
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
              An toàn
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Thời gian lướt Newsfeed (phút / nick):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={minFeedMinutes}
                  onChange={(e) => setMinFeedMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-500"
                  placeholder="Min"
                />
                <span className="text-slate-400 font-bold text-xs">đến</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={maxFeedMinutes}
                  onChange={(e) => setMaxFeedMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-500"
                  placeholder="Max"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Gợi ý: Nick mới 2-4 phút, nick cứng 5-8 phút.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Số lượng Like dạo ngẫu nhiên:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={minLikes}
                  onChange={(e) => setMinLikes(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-500"
                  placeholder="Min like"
                />
                <span className="text-slate-400 font-bold text-xs">đến</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={maxLikes}
                  onChange={(e) => setMaxLikes(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-500"
                  placeholder="Max like"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Không nên like quá 3 bài / phiên đối với nick mới.</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Xem video Reels</span>
                  <span className="text-[10px] text-slate-500">Xem 1-2 video ngắn mô phỏng người thật</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={watchReels}
                onChange={(e) => setWatchReels(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-md cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giãn cách nghỉ giữa các tài khoản (giây):
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={cooldownSec}
                onChange={(e) => setCooldownSec(Math.max(10, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tránh mở liên tục các profile cùng một lúc.</p>
            </div>
          </div>
        </div>

        {/* Thống kê tiến độ trực tiếp */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Trạng Thái Phiên Nuôi
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
                  {isRunning ? 'Đang hoạt động' : 'Tạm dừng'}
                </span>
              </div>
            </div>

            {/* Thông báo hành động hiện tại */}
            <div className="mt-4 p-4 rounded-2xl bg-teal-50/50 border border-teal-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Sprout className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">
                  Hành động đang thực hiện
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                  {currentMessage || (isRunning ? 'Đang chuẩn bị phiên nuôi...' : 'Hệ thống sẵn sàng. Bấm nút bắt đầu để nuôi nick.')}
                </p>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 font-medium block">Tài khoản</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {stats.finishedAccounts} / {stats.totalAccounts || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                <span className="text-xs text-rose-600 font-medium block">Đã Like</span>
                <span className="text-lg font-black text-rose-700 mt-0.5 block">
                  {stats.likedCount || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-xs text-purple-600 font-medium block">Reels Đã Xem</span>
                <span className="text-lg font-black text-purple-700 mt-0.5 block">
                  {stats.reelsWatched || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-xs text-blue-600 font-medium block">Nick Đang Chạy</span>
                <span className="text-xs font-bold text-blue-700 mt-1.5 block truncate">
                  {stats.currentAccountName || 'Chưa chạy'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Chạy hoàn toàn trên Chrome thật, tự ẩn cờ Automation
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
            <Terminal className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              TERMINAL LOG TRỰC TIẾP (AUTO-NURTURE CONSOLE)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {logs.length} dòng log
          </span>
        </div>

        <div className="h-72 overflow-y-auto font-mono text-xs space-y-1.5 pr-2 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-10 text-center">
              Chưa có nhật ký hoạt động. Bấm &quot;BẮT ĐẦU NUÔI TẤT CẢ ACC&quot; để theo dõi chi tiết.
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
