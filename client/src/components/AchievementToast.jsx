import React, { useState, useEffect } from 'react';
import { achievementManager } from '../engine/AchievementManager';

export const AchievementToast = () => {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const unsub = achievementManager.subscribeToast((achievement) => {
      setQueue((prev) => [...prev, achievement]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const next = queue[0];
      setCurrent(next);
      setQueue((prev) => prev.slice(1));
      setIsExiting(false);

      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setCurrent(null);
          setIsExiting(false);
        }, 400);
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setCurrent(null);
      setIsExiting(false);
    }, 300);
  };

  if (!current) return null;

  const tier = current.tier;

  return (
    <div className="fixed top-5 right-5 z-[9999] pointer-events-auto max-w-sm w-full transition-all duration-300">
      <div
        onClick={handleClose}
        className={`relative overflow-hidden p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl cursor-pointer select-none transition-all transform duration-300 ${
          isExiting ? 'opacity-0 translate-y-[-20px] scale-95' : 'opacity-100 translate-y-0 scale-100 animate-bounce-short'
        } ${tier.border} ${tier.glow} bg-gradient-to-br from-slate-950 via-zinc-900 to-black`}
      >
        {/* 背景金光流光效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* 成就圖標與光環 */}
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${tier.badge} shadow-lg shadow-black/60`}>
              {current.icon || '🏆'}
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs">{tier.icon}</span>
          </div>

          {/* 成就資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span>🎉 成就解鎖！</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-normal ${tier.badge}`}>
                  {tier.name}
                </span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                +{current.ap} AP
              </span>
            </div>

            <h4 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-1.5">
              <span>{current.title}</span>
            </h4>

            <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
              {current.description}
            </p>

            {current.rewardTitle && (
              <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">解鎖專屬稱號：</span>
                <span className="font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-600/40">
                  【{current.rewardTitle}】
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 底部進度指示條 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
          <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 animate-toast-progress" />
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
