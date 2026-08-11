import React, { useState, useEffect } from 'react';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  CATEGORY_LABELS,
  ACHIEVEMENT_TIERS,
} from '../engine/achievements';
import { achievementManager } from '../engine/AchievementManager';

export const AchievementsModal = ({ isOpen, onClose, playerName }) => {
  const [stats, setStats] = useState(() => achievementManager.stats);
  const [summary, setSummary] = useState(() => achievementManager.getSummary());
  const [activeCategory, setActiveCategory] = useState(ACHIEVEMENT_CATEGORIES.ALL);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'UNLOCKED' | 'LOCKED'
  const [activeTab, setActiveTab] = useState('ACHIEVEMENTS'); // 'ACHIEVEMENTS' | 'WARDROBE'
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const unsub = achievementManager.subscribe((newStats, newSummary) => {
      setStats({ ...newStats });
      setSummary({ ...newSummary });
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const unlockedMap = stats.unlockedAchievements || {};
  const currentTitle = stats.equippedTitle || '見習村民';
  const rankInfo = summary.rankInfo;

  // 過濾成就清單
  const filteredAchievements = ACHIEVEMENTS.filter((ach) => {
    if (activeCategory !== ACHIEVEMENT_CATEGORIES.ALL && ach.category !== activeCategory) {
      return false;
    }
    const isUnlocked = !!unlockedMap[ach.id];
    if (filterMode === 'UNLOCKED' && !isUnlocked) return false;
    if (filterMode === 'LOCKED' && isUnlocked) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ach.title.toLowerCase().includes(q);
      const matchDesc = ach.description.toLowerCase().includes(q);
      const matchReward = (ach.rewardTitle || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchReward) return false;
    }

    return true;
  });

  const availableTitles = achievementManager.getAvailableTitles();

  const handleEquipTitle = (title) => {
    achievementManager.equipTitle(title);
  };

  const handleReset = () => {
    achievementManager.resetAllStats();
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-amber-950/20 overflow-hidden">
        
        {/* ================= 頂部 Header & 個人榮譽資訊卡 ================= */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800/80">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
                🏆
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>榮譽成就與稱號系統</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ACHIEVEMENTS
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  探索戰術絕技，解鎖稀有成就，佩戴專屬榮譽稱號
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
              title="關閉"
            >
              ✕
            </button>
          </div>

          {/* 個人榮譽檔案看板 (Player Honor Profile) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-inner">
            {/* 左側：暱稱與當前稱號 */}
            <div className="md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r border-zinc-800 pb-3 md:pb-0 md:pr-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                🐺
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 font-medium">當前玩家</div>
                <div className="text-sm font-bold text-white truncate">{playerName || '玩家'}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/80">
                    👑 【{currentTitle}】
                  </span>
                </div>
              </div>
            </div>

            {/* 中間：榮譽段位與 AP 點數進度條 */}
            <div className="md:col-span-5 flex flex-col justify-center gap-1.5 border-b md:border-b-0 md:border-r border-zinc-800 pb-3 md:pb-0 md:pr-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1">
                  <span>榮譽段位：</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded border text-[11px] ${rankInfo.currentRank.color}`}>
                    {rankInfo.currentRank.badge}
                  </span>
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {summary.totalAp} AP
                </span>
              </div>

              {/* AP 進度條 */}
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${rankInfo.progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                <span>{rankInfo.currentRank.title}</span>
                {rankInfo.nextRank ? (
                  <span>距下階 {rankInfo.apToNext} AP</span>
                ) : (
                  <span className="text-fuchsia-400 font-bold">最高段位 MAX</span>
                )}
              </div>
            </div>

            {/* 右側：總解鎖進度計數 */}
            <div className="md:col-span-3 flex flex-col justify-center items-center text-center">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                成就總達成率
              </div>
              <div className="text-xl font-black font-mono text-white mt-0.5">
                <span className="text-amber-400">{summary.unlockedCount}</span>
                <span className="text-zinc-400 text-sm"> / {summary.totalCount}</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                解鎖進度 {summary.progressPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* ================= 主選單頁籤 (Tab Bar) ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ACHIEVEMENTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ACHIEVEMENTS'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>🏆 成就圖鑑</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
                {summary.unlockedCount}/{summary.totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('WARDROBE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'WARDROBE'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>👑 稱號衣櫥</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-amber-300">
                {availableTitles.filter((t) => t.unlocked).length} 個可用
              </span>
            </button>
          </div>

          {activeTab === 'ACHIEVEMENTS' && (
            <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋成就名稱或條件..."
                className="w-full px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================= 內容主體 ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'ACHIEVEMENTS' ? (
            <>
              {/* 分類與狀態次篩選列 */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* 類別 Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => {
                    const isActive = activeCategory === catKey;
                    const catCount = ACHIEVEMENTS.filter(
                      (a) => catKey === ACHIEVEMENT_CATEGORIES.ALL || a.category === catKey
                    ).length;

                    return (
                      <button
                        key={catKey}
                        onClick={() => setActiveCategory(catKey)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-zinc-800 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        <span className="text-[10px] text-zinc-400">({catCount})</span>
                      </button>
                    );
                  })}
                </div>

                {/* 解鎖狀態 Filter */}
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
                  <button
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilterMode('UNLOCKED')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'UNLOCKED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    已解鎖
                  </button>
                  <button
                    onClick={() => setFilterMode('LOCKED')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'LOCKED' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    未達成
                  </button>
                </div>
              </div>

              {/* 成就清單卡片 Grid */}
              {filteredAchievements.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                  <span className="text-3xl block mb-2">🔍</span>
                  <p className="text-sm font-medium">沒有符合條件的成就</p>
                  <p className="text-xs text-zinc-400 mt-1">請嘗試變更搜尋關鍵字或分類篩選</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAchievements.map((ach) => {
                    const isUnlocked = !!unlockedMap[ach.id];
                    const unlockInfo = unlockedMap[ach.id];
                    const tier = ach.tier || ACHIEVEMENT_TIERS.BRONZE;
                    const progress = ach.getProgress(stats);
                    const maxProg = ach.maxProgress || 1;
                    const progressPct = Math.min(100, Math.round((progress / maxProg) * 100));
                    const isTitleEquipped = currentTitle === ach.rewardTitle;

                    return (
                      <div
                        key={ach.id}
                        className={`relative rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                          isUnlocked
                            ? `bg-zinc-900/90 ${tier.border} ${tier.glow} ring-1 ring-white/5`
                            : 'bg-zinc-950/80 border-zinc-800/80 opacity-75 hover:opacity-100 hover:border-zinc-700'
                        }`}
                      >
                        {/* 背景流光 */}
                        {isUnlocked && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />
                        )}

                        <div>
                          {/* 頂部：圖標、標題、稀有度與 AP 標籤 */}
                          <div className="flex items-start gap-3 mb-2.5">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                                isUnlocked
                                  ? `${tier.badge} shadow-lg`
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 grayscale'
                              }`}
                            >
                              {ach.icon || '🏆'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                                  <span>{ach.title}</span>
                                </h4>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${tier.badge}`}>
                                  {tier.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-mono font-bold text-amber-400">
                                  +{ach.ap} AP
                                </span>
                                {isUnlocked && (
                                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                                    <span>✓ 已達成</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 說明文字 */}
                          <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                            {ach.description}
                          </p>
                        </div>

                        {/* 底部：進度條與獎勵稱號 */}
                        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                          {/* 進度顯示 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400">
                              <span>達成進度</span>
                              <span className="font-mono">
                                {progress} / {maxProg} ({progressPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isUnlocked
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                                    : 'bg-zinc-700'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* 稱號獎勵與佩戴操作 */}
                          {ach.rewardTitle && (
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                <span>獎勵稱號：</span>
                                <span className="font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                                  【{ach.rewardTitle}】
                                </span>
                              </div>

                              {isUnlocked ? (
                                isTitleEquipped ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                                    ✓ 佩戴中
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleEquipTitle(ach.rewardTitle)}
                                    className="text-[10px] font-bold text-amber-300 hover:text-black bg-amber-500/20 hover:bg-amber-400 px-2.5 py-0.5 rounded-md border border-amber-500/40 transition-all cursor-pointer"
                                  >
                                    佩戴
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                                  <span>🔒</span>
                                  <span>未解鎖</span>
                                </span>
                              )}
                            </div>
                          )}

                          {isUnlocked && unlockInfo?.unlockedAt && (
                            <div className="text-[9px] text-zinc-400 font-mono text-right">
                              解鎖於 {new Date(unlockInfo.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ================= 稱號衣櫥 (Title Wardrobe) ================= */
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>👑 榮譽稱號衣櫥</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    解鎖成就後獲得的稱號將顯示在您的暱稱旁，全場玩家皆可看見！
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">當前佩戴稱號</div>
                  <div className="text-sm font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-600/60 mt-0.5">
                    【{currentTitle}】
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTitles.map((t, idx) => {
                  const isEquipped = currentTitle === t.title;
                  const isUnlocked = t.unlocked;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/30'
                          : isUnlocked
                          ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                          : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{t.icon || '🏷️'}</span>
                            <span className="text-sm font-bold text-white">
                              【{t.title}】
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-1">
                            來源：{t.source}
                          </div>
                        </div>

                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                            ACHIEVEMENT_TIERS[t.tier]?.badge || 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {ACHIEVEMENT_TIERS[t.tier]?.name || '標準'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[10px]">
                          {isUnlocked ? (
                            <span className="text-emerald-400 font-medium">✓ 已獲取</span>
                          ) : (
                            <span className="text-zinc-400 flex items-center gap-1">
                              <span>🔒</span>
                              <span>尚未解鎖</span>
                            </span>
                          )}
                        </span>

                        {isUnlocked ? (
                          isEquipped ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                              佩戴中
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEquipTitle(t.title)}
                              className="text-[10px] font-bold text-white bg-zinc-800 hover:bg-amber-500 hover:text-black px-3 py-1 rounded-lg border border-zinc-700 transition-all cursor-pointer shadow-sm"
                            >
                              一鍵佩戴
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= 底部工具列 ================= */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-800 p-1.5 rounded-xl text-red-200">
                <span className="text-[11px]">確定重置所有成就統計？</span>
                <button
                  onClick={handleReset}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  確認重置
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-zinc-400 hover:text-red-400 text-[11px] transition-colors cursor-pointer"
                title="清除本地成就紀錄（測試除錯用）"
              >
                ⚙️ 重置成就進度 (測試用)
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
