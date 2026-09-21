'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sprout,
  Play,
  Square,
  RefreshCw,
  Clock,
  ThumbsUp,
  Film,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface AutoNurtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AutoNurtureModal({
  isOpen,
  onClose,
  showToast,
}: AutoNurtureModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [feedMinutes, setFeedMinutes] = useState(2);
  const [maxLikes, setMaxLikes] = useState(2);
  const [watchReels, setWatchReels] = useState(true);
  const [cooldownSec, setCooldownSec] = useState(45);
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const [stats, setStats] = useState({ totalAccounts: 0, completed: 0, failed: 0, likesGiven: 0 });
  const [currentMessage, setCurrentMessage] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Polling status
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen) {
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
      fetchStatus();
      timer = setInterval(fetchStatus, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleStart = async () => {
    try {
      setIsRunning(true);
      const res = await fetch('/api/facebook/auto-nurture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          feedMinutes,
          maxLikes,
          watchReels,
          cooldownSec,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setIsRunning(false);
        if (showToast) showToast(data.error || 'Lỗi khởi chạy Nuôi Nick', 'error');
        return;
      }
      if (showToast) showToast('🌱 Đã bắt đầu chiến dịch Nuôi Nick tự nhiên!', 'success');
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
        if (showToast) showToast('Đã dừng tiến trình Nuôi Nick!', 'info');
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Sprout className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Chiến Dịch Nuôi Nick An Toàn (Auto-Nurture)</h3>
              <p className="text-xs text-emerald-100 font-medium">
                Mô phỏng hành vi người thật: Lướt Newsfeed, xem Reels, thả tim dạo tăng Trust Score
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
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 text-center">
              <div className="text-[11px] font-bold text-emerald-700">Đã Hoàn Tất</div>
              <div className="text-xl font-black text-emerald-800">{stats.completed}</div>
            </div>
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 text-center">
              <div className="text-[11px] font-bold text-blue-700">Đã Thả Cảm Xúc</div>
              <div className="text-xl font-black text-blue-800">{stats.likesGiven}</div>
            </div>
            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 text-center">
              <div className="text-[11px] font-bold text-rose-700">Gặp Sự Cố</div>
              <div className="text-xl font-black text-rose-800">{stats.failed}</div>
            </div>
          </div>

          {/* Settings Box */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cấu hình mô phỏng người thật:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-700">Lướt Newsfeed (phút):</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  disabled={isRunning}
                  value={feedMinutes}
                  onChange={(e) => setFeedMinutes(Math.max(1, parseInt(e.target.value) || 2))}
                  className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-700">Thả cảm xúc tối đa:</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  disabled={isRunning}
                  value={maxLikes}
                  onChange={(e) => setMaxLikes(Math.max(0, parseInt(e.target.value) || 2))}
                  className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  disabled={isRunning}
                  checked={watchReels}
                  onChange={(e) => setWatchReels(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Xem 1-2 video Reels ngắn (20-30s)</span>
              </label>

              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Nghỉ giữa các nick: <b>{cooldownSec}s</b></span>
              </div>
            </div>
          </div>

          {/* Realtime Terminal Logs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Nhật ký thời gian thực ({logs.length} dòng):</span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Xóa nhật ký
                </button>
              )}
            </div>

            <div className="bg-slate-950 text-slate-200 rounded-2xl p-3.5 font-mono text-xs max-h-56 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-6">
                  Chưa có nhật ký hoạt động. Nhấn &quot;BẮT ĐẦU NUÔI NICK&quot; để khởi chạy.
                </div>
              ) : (
                logs.map((log, idx) => (
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-[11px] text-slate-500 truncate max-w-xs">
            {currentMessage || 'Sẵn sàng khởi chạy'}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Dừng Tiến Trình
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> 🌱 BẮT ĐẦU NUÔI NICK
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
