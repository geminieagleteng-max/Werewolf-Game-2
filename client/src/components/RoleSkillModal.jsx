import React, { useState } from 'react';
import { ROLE_DEFINITIONS, ROLES } from '../engine/roles';

const ROLE_THEMES = {
  WEREWOLF: {
    border: 'border-red-600',
    glow: 'shadow-red-950/70',
    gradient: 'from-red-950/80 via-slate-900 to-black',
    accentText: 'text-red-400',
    badge: 'bg-red-950 border-red-700 text-red-300',
  },
  SEER: {
    border: 'border-purple-600',
    glow: 'shadow-purple-950/70',
    gradient: 'from-purple-950/80 via-slate-900 to-black',
    accentText: 'text-purple-400',
    badge: 'bg-purple-950 border-purple-700 text-purple-300',
  },
  WITCH: {
    border: 'border-emerald-600',
    glow: 'shadow-emerald-950/70',
    gradient: 'from-emerald-950/80 via-slate-900 to-black',
    accentText: 'text-emerald-400',
    badge: 'bg-emerald-950 border-emerald-700 text-emerald-300',
  },
  HUNTER: {
    border: 'border-amber-600',
    glow: 'shadow-amber-950/70',
    gradient: 'from-amber-950/80 via-slate-900 to-black',
    accentText: 'text-amber-400',
    badge: 'bg-amber-950 border-amber-700 text-amber-300',
  },
  GUARD: {
    border: 'border-blue-600',
    glow: 'shadow-blue-950/70',
    gradient: 'from-blue-950/80 via-slate-900 to-black',
    accentText: 'text-blue-400',
    badge: 'bg-blue-950 border-blue-700 text-blue-300',
  },
  IDIOT: {
    border: 'border-pink-600',
    glow: 'shadow-pink-950/70',
    gradient: 'from-pink-950/80 via-slate-900 to-black',
    accentText: 'text-pink-400',
    badge: 'bg-pink-950 border-pink-700 text-pink-300',
  },
  KNIGHT: {
    border: 'border-amber-400',
    glow: 'shadow-amber-950/70',
    gradient: 'from-amber-950/80 via-slate-900 to-black',
    accentText: 'text-amber-300',
    badge: 'bg-amber-950 border-amber-600 text-amber-200',
  },
  SILENCER: {
    border: 'border-indigo-600',
    glow: 'shadow-indigo-950/70',
    gradient: 'from-indigo-950/80 via-slate-900 to-black',
    accentText: 'text-indigo-400',
    badge: 'bg-indigo-950 border-indigo-700 text-indigo-300',
  },
  DREAMCATCHER: {
    border: 'border-cyan-600',
    glow: 'shadow-cyan-950/70',
    gradient: 'from-cyan-950/80 via-slate-900 to-black',
    accentText: 'text-cyan-400',
    badge: 'bg-cyan-950 border-cyan-700 text-cyan-300',
  },
  CUPID: {
    border: 'border-rose-600',
    glow: 'shadow-rose-950/70',
    gradient: 'from-rose-950/80 via-slate-900 to-black',
    accentText: 'text-rose-400',
    badge: 'bg-rose-950 border-rose-700 text-rose-300',
  },
  HIDDEN_WOLF: {
    border: 'border-purple-600',
    glow: 'shadow-purple-950/70',
    gradient: 'from-purple-950/80 via-zinc-900 to-black',
    accentText: 'text-purple-300',
    badge: 'bg-purple-950 border-purple-700 text-purple-200',
  },
  VILLAGER: {
    border: 'border-slate-600',
    glow: 'shadow-slate-950/70',
    gradient: 'from-slate-900/90 via-zinc-900 to-black',
    accentText: 'text-slate-300',
    badge: 'bg-slate-900 border-slate-700 text-slate-300',
  },
};

export const RoleSkillModal = ({ isOpen, onClose, initialRole = 'VILLAGER', roomRoleConfig = null }) => {
  const [selectedRoleKey, setSelectedRoleKey] = useState(initialRole);
  const [activeTab, setActiveTab] = useState('skills'); // 'skills' | 'strategy' | 'faq'

  if (!isOpen) return null;

  const roleDef = ROLE_DEFINITIONS[selectedRoleKey] || ROLE_DEFINITIONS.VILLAGER;
  const theme = ROLE_THEMES[selectedRoleKey] || ROLE_THEMES.VILLAGER;

  // 如果房間有配置，可優先高亮本局有出現的角色
  const allRolesList = Object.keys(ROLE_DEFINITIONS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-gradient-to-b ${theme.gradient} border ${theme.border} shadow-2xl ${theme.glow} text-zinc-100 overflow-hidden`}
      >
        {/* 1. Modal 頂部 Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{roleDef.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {roleDef.name}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.badge}`}>
                  {roleDef.factionName}
                </span>
                <span className="text-xs text-zinc-400 font-serif italic hidden sm:inline">
                  「{roleDef.title}」
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                上手難度：<span className="text-amber-400">{roleDef.difficulty}</span> · {roleDef.tagline}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="關閉"
          >
            ✕
          </button>
        </div>

        {/* 2. 角色選擇器橫向列表（圖鑑功能） */}
        <div className="px-6 py-2.5 bg-zinc-950/80 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-zinc-400 shrink-0 mr-1">📚 圖鑑速查:</span>
          {allRolesList.map((rKey) => {
            const r = ROLE_DEFINITIONS[rKey];
            const isSelected = selectedRoleKey === rKey;
            const isInMatch = roomRoleConfig?.includes(rKey);

            return (
              <button
                key={rKey}
                onClick={() => setSelectedRoleKey(rKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-bold shadow-md scale-105'
                    : isInMatch
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800'
                } cursor-pointer`}
              >
                <span>{r.icon}</span>
                <span>{r.name}</span>
                {isInMatch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" title="本局有此角色" />}
              </button>
            );
          })}
        </div>

        {/* 3. 分頁標籤切換 (Tabs) */}
        <div className="px-6 pt-3 flex gap-2 border-b border-white/10 bg-black/20">
          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'skills'
                ? `border-white ${theme.accentText} font-bold`
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚡ 核心專屬技能 ({roleDef.skills?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'strategy'
                ? `border-white ${theme.accentText} font-bold`
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💡 實戰策略秘笈
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'faq'
                ? `border-white ${theme.accentText} font-bold`
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ❓ 規則與問答 ({roleDef.faq?.length || 0})
          </button>
        </div>

        {/* 4. 主要內容展示區域 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 勝利條件卡片 */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-zinc-900 text-lg">🏆</div>
            <div className="flex-1 text-xs">
              <div className="font-semibold text-zinc-300 mb-0.5">陣營勝利目標</div>
              <div className="text-zinc-200 leading-relaxed font-medium">{roleDef.winCondition}</div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
              {roleDef.tags?.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-700/60 rounded text-[10px] text-zinc-400"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* TAB 1: 專屬技能詳細說明 */}
          {activeTab === 'skills' && (
            <div className="space-y-3">
              {roleDef.skills?.map((sk, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sk.icon}</span>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        【{sk.name}】
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700 font-mono">
                        {sk.triggerType}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      ⏱️ {sk.phase}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-200 leading-relaxed pl-1">
                    <span className="text-zinc-400 font-semibold mr-1.5">效果詳解：</span>
                    {sk.effect}
                  </div>

                  {sk.restrictions && (
                    <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 text-[11px] text-red-200 leading-relaxed flex items-start gap-1.5">
                      <span className="shrink-0 text-xs">⚠️</span>
                      <div>
                        <span className="font-semibold text-red-300 mr-1">規則限制與注意事項：</span>
                        {sk.restrictions}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: 實戰策略技巧 */}
          {activeTab === 'strategy' && (
            <div className="space-y-2.5">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span> 高手實戰進階指南
                </h4>
                <ul className="space-y-2 text-xs text-zinc-300">
                  {roleDef.strategyTips?.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center text-[10px] shrink-0 font-mono font-bold">
                        {idx + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: 常見問答 FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-2.5">
              {roleDef.faq && roleDef.faq.length > 0 ? (
                roleDef.faq.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="text-zinc-400">Q:</span> {item.q}
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed pl-4 border-l-2 border-zinc-700">
                      <span className="text-emerald-400 font-semibold mr-1">A:</span>
                      {item.a}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-zinc-500">
                  暫無特殊規則疑難，按標準規則進行即可。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. 底部按鈕 */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-zinc-950/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500 text-[11px]">
            💡 提示：在對局中可隨時點擊身分卡或頂部按鈕查閱本指南
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            我了解了
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSkillModal;
