import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { PHASE_NAMES_ZH } from '../engine/gameStates';

export const NightSkillPanel = ({ onOpenSkillGuide }) => {
  const {
    room,
    myPlayer,
    myRoleInfo,
    gamePhase,
    selectWerewolfTarget,
    checkSeerTarget,
    useWitchSkill,
    protectGuardTarget,
    shootHunterTarget,
    linkCupidTargets,
    dreamcatcherDream,
    silencerSilence,
    seerCheckResult,
    witchNightInfo,
    werewolfTeammates,
    werewolfTeamData,
  } = useSocket();

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [cupidSelectedIds, setCupidSelectedIds] = useState([]);
  const [seerSelectedIds, setSeerSelectedIds] = useState([]);
  const [witchMode, setWitchMode] = useState(null); // 'POISON' | null
  const [witchActionDone, setWitchActionDone] = useState(null); // 'ANTIDOTE' | 'POISON' | 'PASS' | null
  const [actionDoneMsg, setActionDoneMsg] = useState('');

  // 階段切換時自動清空暫存選擇
  useEffect(() => {
    setSelectedTargetId(null);
    setCupidSelectedIds([]);
    setSeerSelectedIds([]);
    setWitchMode(null);
    setWitchActionDone(null);
    setActionDoneMsg('');
  }, [gamePhase]);

  if (!myPlayer) return null;

  const role = myPlayer.role || myRoleInfo?.id;
  const alivePlayers = room?.players.filter((p) => p.isAlive) || [];
  const allPlayers = room?.players || [];

  if (!myPlayer.isAlive && gamePhase !== 'HUNTER_SHOOT') {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
        <span className="text-3xl block mb-2">⚰️</span>
        <h4 className="text-zinc-200 font-medium mb-1">您已出局</h4>
        <p className="text-xs text-zinc-500">請靜待白天討論或遊戲結算觀戰。</p>
      </div>
    );
  }

  // 1. 邱比特行動面板 (首夜)
  if (gamePhase === 'NIGHT_CUPID' && role === 'CUPID') {
    const handleCupidToggle = (pId) => {
      setCupidSelectedIds((prev) => {
        if (prev.includes(pId)) return prev.filter((id) => id !== pId);
        if (prev.length >= 2) return [prev[1], pId];
        return [...prev, pId];
      });
    };

    return (
      <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💘</span>
            <div>
              <h4 className="text-base font-bold text-rose-300">邱比特請睜眼</h4>
              <p className="text-xs text-rose-300/70">請選擇任意兩位玩家連為生死情侶（已選 {cupidSelectedIds.length} / 2 位）</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('CUPID')}
            className="text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊提醒 */}
        <div className="p-3 bg-rose-950/50 border border-rose-900/50 rounded-xl text-xs text-rose-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>愛神指引：</b>情侶生死相隨，一人出局另一人隨之殉情。若連出好人+狼人（人狼戀），將形成第三方陣營！
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPlayers.map((p) => {
            const isSelected = cupidSelectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleCupidToggle(p.id)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-rose-600 border-rose-400 text-white shadow-sm font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-rose-500/50'
                } cursor-pointer`}
              >
                #{p.seatNumber} {p.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (cupidSelectedIds.length === 2) {
              linkCupidTargets(cupidSelectedIds[0], cupidSelectedIds[1]);
              setActionDoneMsg('💘 已成功為兩位玩家連為情侶！');
            }
          }}
          disabled={cupidSelectedIds.length !== 2}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
        >
          {actionDoneMsg || '💘 確認連為生死情侶'}
        </button>
      </div>
    );
  }

  // 2. 攝夢人行動面板
  if (gamePhase === 'NIGHT_DREAMCATCHER' && role === 'DREAMCATCHER') {
    return (
      <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💤</span>
            <div>
              <h4 className="text-base font-bold text-cyan-300">攝夢人請睜眼</h4>
              <p className="text-xs text-cyan-300/70">請選擇今晚入夢的玩家（連續兩夜攝夢同一人將導致其夢死）</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('DREAMCATCHER')}
            className="text-[11px] text-cyan-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-cyan-950/50 border border-cyan-900/50 rounded-xl text-xs text-cyan-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>夢境法則：</b>入夢者當夜免疫狼刀與毒藥；連續兩夜攝夢同一人使其【夢死】；若攝夢人出局，入夢者同死。
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers.map((p) => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500/50'
                } cursor-pointer`}
              >
                #{p.seatNumber} {p.name}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedTargetId) {
                dreamcatcherDream(selectedTargetId);
                setActionDoneMsg('💤 已選擇攝夢目標！');
              }
            }}
            disabled={!selectedTargetId}
            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {actionDoneMsg || '💤 鎖定入夢'}
          </button>
          <button
            onClick={() => {
              dreamcatcherDream(null);
              setActionDoneMsg('💤 今晚選擇空夢');
            }}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
          >
            空夢
          </button>
        </div>
      </div>
    );
  }

  // 3. 守衛行動面板
  if (gamePhase === 'NIGHT_GUARD' && role === 'GUARD') {
    return (
      <div className="bg-blue-950/30 border border-blue-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <h4 className="text-base font-bold text-blue-300">守衛請睜眼</h4>
              <p className="text-xs text-blue-300/70">請選擇今晚要守護的玩家（不可連續兩晚守護同一人）</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('GUARD')}
            className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-blue-950/50 border border-blue-900/50 rounded-xl text-xs text-blue-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>聖盾提示：</b>不可連續兩晚守護同一個人（上夜守護者已置灰禁用）；守衛無法抵擋女巫毒藥。
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers.map((p) => {
            const isLastGuarded = myPlayer.lastGuardedId === p.id;
            const isSelected = selectedTargetId === p.id;

            return (
              <button
                key={p.id}
                disabled={isLastGuarded}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-sm font-bold'
                    : isLastGuarded
                    ? 'bg-zinc-950/60 border-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-blue-500/50 cursor-pointer'
                }`}
              >
                #{p.seatNumber} {p.name}
                {isLastGuarded && <span className="block text-[10px] text-zinc-500">(上夜已守)</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedTargetId) {
                protectGuardTarget(selectedTargetId);
                setActionDoneMsg('🛡️ 守護目標已送出！');
              }
            }}
            disabled={!selectedTargetId}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {actionDoneMsg || '🛡️ 守護該玩家'}
          </button>
          <button
            onClick={() => {
              protectGuardTarget(null);
              setActionDoneMsg('🛡️ 今晚選擇空守');
            }}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
          >
            空守
          </button>
        </div>
      </div>
    );
  }

  // 4. 狼人行動面板 (支援狼隊全員即時選票互看與集火共識)
  if (gamePhase === 'NIGHT_WEREWOLF' && role === 'WEREWOLF') {
    const wolfVotes = werewolfTeamData?.votes || [];
    const consensusTargetId = werewolfTeamData?.consensusTargetId || selectedTargetId;
    const consensusPlayer = consensusTargetId ? room?.players.find((p) => p.id === consensusTargetId) : null;

    return (
      <div className="bg-red-950/30 border border-red-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐺</span>
            <div>
              <h4 className="text-base font-bold text-red-300">狼人請睜眼</h4>
              <p className="text-xs text-red-300/70">即時同步狼隊友目標，點擊玩家進行暗殺集火</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('WEREWOLF')}
            className="text-[11px] text-red-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 狼隊成員現況與即時選人動態 */}
        {werewolfTeammates && werewolfTeammates.length > 0 && (
          <div className="p-3.5 bg-red-950/80 border border-red-800/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                <span>🐺</span> 狼隊成員即時選擇動態 ({werewolfTeammates.length} 狼)：
              </span>
              <span className="text-[10px] text-red-400 font-mono">即時同步中</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {werewolfTeammates.map((w) => {
                const isMe = w.id === myPlayer.id;
                const vote = wolfVotes.find((v) => v.voterId === w.id);
                const targetP = vote?.targetId ? room?.players.find((p) => p.id === vote.targetId) : null;

                return (
                  <div
                    key={w.id}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                      isMe
                        ? 'bg-red-900/60 border-red-500 text-white font-semibold ring-1 ring-red-400'
                        : 'bg-zinc-950/90 border-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-red-400 font-bold">#{w.seatNumber}</span>
                      <span className="truncate max-w-[70px]">{w.name}</span>
                      {isMe && <span className="text-[10px] text-amber-300">(您)</span>}
                    </div>

                    <div className="text-[11px] text-right">
                      {targetP ? (
                        <span className="px-1.5 py-0.5 bg-red-950 border border-red-700 text-red-300 rounded font-medium">
                          🎯 鎖定 #{targetP.seatNumber} {targetP.name}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">⏳ 尚未選擇</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 技能錦囊 */}
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-xs text-red-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>暗殺協商：</b>點擊目標即可向所有狼隊友即時同步您的刀口。狼隊達成共識後將直接以此目標發動暗殺！
          </div>
        </div>

        {/* 目標選擇按鈕網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers.map((p) => {
            const isMyChoice = selectedTargetId === p.id;
            const votersOnThisPlayer = wolfVotes.filter((v) => v.targetId === p.id);
            const isConsensusTarget = consensusTargetId === p.id;

            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedTargetId(p.id);
                  selectWerewolfTarget(p.id);
                }}
                className={`p-3 rounded-xl border text-xs font-medium transition-all relative flex flex-col items-center gap-1 cursor-pointer ${
                  isConsensusTarget
                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950 font-bold ring-2 ring-red-400 animate-pulse'
                    : isMyChoice
                    ? 'bg-red-800 border-red-500 text-white font-bold'
                    : votersOnThisPlayer.length > 0
                    ? 'bg-red-950/60 border-red-700 text-red-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-red-500/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>#{p.seatNumber}</span>
                  <span className="truncate max-w-[80px]">{p.name}</span>
                </div>

                {/* 狼隊友投票標籤 */}
                {votersOnThisPlayer.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                    {votersOnThisPlayer.map((v) => {
                      const voter = room?.players.find((w) => w.id === v.voterId);
                      return (
                        <span
                          key={v.voterId}
                          className="px-1.5 py-0.2 rounded text-[9px] bg-red-950 border border-red-500 text-red-200 font-mono"
                        >
                          🐺 #{voter?.seatNumber || ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 狼隊共識結算狀態 */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs flex items-center justify-between">
          <span className="text-zinc-400">狼隊當前集火刀口：</span>
          <span className="font-bold text-red-400 text-sm">
            {consensusPlayer ? (
              <span className="flex items-center gap-1.5">
                <span>🎯 #{consensusPlayer.seatNumber} {consensusPlayer.name}</span>
                <span className="text-xs text-emerald-400 font-normal">（已鎖定）</span>
              </span>
            ) : (
              <span className="text-zinc-500 font-normal italic">尚未統一目標</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // 5. 預言家行動面板 (每晚僅限查驗 1 位存活玩家)
  if (gamePhase === 'NIGHT_SEER' && role === 'SEER') {
    const singleResult = Array.isArray(seerCheckResult) ? seerCheckResult[0] : seerCheckResult;
    const hasAlreadyChecked = Boolean(singleResult);

    return (
      <div className="bg-purple-950/30 border border-purple-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            <div>
              <h4 className="text-base font-bold text-purple-300">預言家請睜眼</h4>
              <p className="text-xs text-purple-300/70">
                每晚僅限選擇 <b className="text-amber-300">1 位玩家</b> 查驗身分陣營
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('SEER')}
            className="text-[11px] text-purple-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-purple-950/50 border border-purple-900/50 rounded-xl text-xs text-purple-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>水晶球指引：</b>每晚可指定 1 名存活玩家查驗真實陣營（好人或狼人）。查驗後將鎖定結果，白天記得清晰報出查驗資訊！
          </div>
        </div>

        {/* 查驗結果展示看板 */}
        {singleResult && (
          <div className="p-4 bg-purple-900/60 border border-purple-500/80 rounded-2xl text-center shadow-xl animate-fade-in space-y-1">
            <span className="text-xs text-purple-200 font-semibold block">🔮 今晚水晶球查驗結果：</span>
            <div className="text-base font-bold text-white">
              #{singleResult.seatNumber} {singleResult.targetName}
            </div>
            <div
              className={`text-sm font-black mt-1 ${
                singleResult.isWerewolf ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              身分為：{singleResult.factionName}
            </div>
          </div>
        )}

        {/* 存活玩家選擇網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers
            .filter((p) => p.id !== myPlayer.id)
            .map((p) => {
              const isSelected = selectedTargetId === p.id;
              const isThisChecked = singleResult && singleResult.targetId === p.id;

              return (
                <button
                  key={p.id}
                  disabled={hasAlreadyChecked}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    isThisChecked
                      ? singleResult.isWerewolf
                        ? 'bg-red-950/80 border-red-500 text-red-200 font-bold ring-1 ring-red-400'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-400'
                      : isSelected
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-950 font-bold ring-2 ring-purple-300'
                      : hasAlreadyChecked
                      ? 'bg-zinc-950/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-purple-500/50 cursor-pointer'
                  }`}
                >
                  #{p.seatNumber} {p.name}
                </button>
              );
            })}
        </div>

        {/* 查驗操作送出按鈕 */}
        <button
          onClick={() => {
            if (selectedTargetId && !hasAlreadyChecked) {
              checkSeerTarget(selectedTargetId);
              setActionDoneMsg('🔮 已查驗完成！');
            }
          }}
          disabled={!selectedTargetId || hasAlreadyChecked}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>🔮</span>
          <span>
            {hasAlreadyChecked
              ? '✅ 今晚已完成查驗（每晚僅限查驗 1 人）'
              : actionDoneMsg ||
                (selectedTargetId
                  ? `查驗 #${alivePlayers.find((p) => p.id === selectedTargetId)?.seatNumber} 號玩家身分`
                  : '請點擊選擇 1 位玩家進行查驗')}
          </span>
        </button>
      </div>
    );
  }

  // 6. 女巫行動面板 (嚴格互斥：同夜絕對禁止雙藥並用)
  if (gamePhase === 'NIGHT_WITCH' && role === 'WITCH') {
    const victimPlayer = witchNightInfo?.targetId ? room?.players.find((p) => p.id === witchNightInfo.targetId) : null;
    const isAntidoteUsedBefore = myPlayer.hasUsedAntidote;
    const isPoisonUsedBefore = myPlayer.hasUsedPoison;
    const hasActedTonight = Boolean(witchActionDone);

    return (
      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <div>
              <h4 className="text-base font-bold text-emerald-300">女巫請睜眼</h4>
              <p className="text-xs text-emerald-300/70">您擁有解藥與毒藥各一瓶（同夜絕對不可雙藥並用）</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('WITCH')}
            className="text-[11px] text-emerald-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-emerald-950/50 border border-emerald-900/50 rounded-xl text-xs text-emerald-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>魔藥法則：</b>解藥與毒藥全場各限 1 次；<b>同一個夜晚絕對不能同時使用解藥與毒藥</b>。
          </div>
        </div>

        {/* 1. 解藥區塊 */}
        {victimPlayer ? (
          <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-red-300">今晚中刀倒牌的玩家：</span>
              <span className="font-semibold text-white ml-1">
                #{victimPlayer.seatNumber} {victimPlayer.name}
              </span>
            </div>
            <button
              onClick={() => {
                if (!hasActedTonight && !isAntidoteUsedBefore) {
                  useWitchSkill(true, null);
                  setWitchActionDone('ANTIDOTE');
                  setActionDoneMsg('🧪 已使用解藥救起該玩家！');
                }
              }}
              disabled={isAntidoteUsedBefore || hasActedTonight}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {witchActionDone === 'ANTIDOTE'
                ? '✅ 已用解藥救人'
                : isAntidoteUsedBefore
                ? '解藥全場已用'
                : hasActedTonight
                ? '今晚已發動其他動作'
                : '使用解藥救人'}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 text-center">
            今晚暫無人中刀或守衛已守護成功。
          </div>
        )}

        {/* 2. 毒藥區塊 */}
        <div className={`pt-2 border-t border-zinc-800 transition-opacity ${hasActedTonight && witchActionDone !== 'POISON' ? 'opacity-40' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">使用毒藥毒殺（與解藥互斥）：</span>
            <span className="text-[11px] text-zinc-500">
              {isPoisonUsedBefore ? '毒藥全場已用' : witchActionDone === 'ANTIDOTE' ? '今晚已用解藥' : '毒藥可用'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {alivePlayers
              .filter((p) => p.id !== myPlayer.id)
              .map((p) => {
                const isSelected = selectedTargetId === p.id;
                const isPoisonDisabled = isPoisonUsedBefore || hasActedTonight;
                return (
                  <button
                    key={p.id}
                    disabled={isPoisonDisabled}
                    onClick={() => {
                      if (!isPoisonDisabled) {
                        setSelectedTargetId(p.id);
                        setWitchMode('POISON');
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected && witchMode === 'POISON'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm font-bold ring-2 ring-purple-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-purple-500/50'
                    } ${isPoisonDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    #{p.seatNumber} {p.name}
                  </button>
                );
              })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (selectedTargetId && witchMode === 'POISON' && !hasActedTonight && !isPoisonUsedBefore) {
                  useWitchSkill(false, selectedTargetId);
                  setWitchActionDone('POISON');
                  setActionDoneMsg(`🧪 已使用毒藥毒殺 #${alivePlayers.find(p => p.id === selectedTargetId)?.seatNumber} 號！`);
                }
              }}
              disabled={isPoisonUsedBefore || !selectedTargetId || witchMode !== 'POISON' || hasActedTonight}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {witchActionDone === 'POISON'
                ? '✅ 已使用毒藥毒殺'
                : actionDoneMsg || '🧪 確認使用毒藥'}
            </button>
            <button
              onClick={() => {
                if (!hasActedTonight) {
                  useWitchSkill(false, null);
                  setWitchActionDone('PASS');
                  setActionDoneMsg('🧪 今晚不用藥');
                }
              }}
              disabled={hasActedTonight}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              {witchActionDone === 'PASS' ? '✅ 已選擇不用藥' : '不使用藥劑'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. 禁言長老行動面板
  if (gamePhase === 'NIGHT_SILENCER' && role === 'SILENCER') {
    return (
      <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤐</span>
            <div>
              <h4 className="text-base font-bold text-indigo-300">禁言長老請睜眼</h4>
              <p className="text-xs text-indigo-300/70">請指定一名玩家在次日白天禁言（不可連續兩晚禁言同一人）</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('SILENCER')}
            className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-indigo-950/50 border border-indigo-900/50 rounded-xl text-xs text-indigo-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>禁言提示：</b>被禁言玩家白天無法在聊天室發言，但保留投票權；不可連續兩夜禁言同一人。
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers
            .filter((p) => p.id !== myPlayer.id)
            .map((p) => {
              const isLastSilenced = myPlayer.lastSilencedId === p.id;
              const isSelected = selectedTargetId === p.id;

              return (
                <button
                  key={p.id}
                  disabled={isLastSilenced}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm font-bold'
                      : isLastSilenced
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-indigo-500/50 cursor-pointer'
                  }`}
                >
                  #{p.seatNumber} {p.name}
                  {isLastSilenced && <span className="block text-[10px] text-zinc-500">(上夜已禁)</span>}
                </button>
              );
            })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedTargetId) {
                silencerSilence(selectedTargetId);
                setActionDoneMsg('🤐 禁言指令已送出！');
              }
            }}
            disabled={!selectedTargetId}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {actionDoneMsg || '🤐 指定禁言'}
          </button>
          <button
            onClick={() => {
              silencerSilence(null);
              setActionDoneMsg('🤐 今晚選擇空過');
            }}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
          >
            空過
          </button>
        </div>
      </div>
    );
  }

  // 8. 獵人開槍面板
  if (gamePhase === 'HUNTER_SHOOT' && role === 'HUNTER') {
    return (
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💥</span>
            <div>
              <h4 className="text-base font-bold text-amber-300">獵人開槍技能發動</h4>
              <p className="text-xs text-amber-300/70">請選擇一名存活玩家開槍帶走，或選擇壓槍不出</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSkillGuide?.('HUNTER')}
            className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
          >
            📖 技能指引
          </button>
        </div>

        {/* 技能錦囊 */}
        <div className="p-3 bg-amber-950/50 border border-amber-900/50 rounded-xl text-xs text-amber-200 leading-relaxed flex items-start gap-2">
          <span>💡</span>
          <div>
            <b>拔槍提示：</b>帶走場上最可疑的狼人目標；若局勢不明亦可選擇壓槍避免誤傷好人。
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers
            .filter((p) => p.id !== myPlayer.id)
            .map((p) => {
              const isSelected = selectedTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-600 border-amber-400 text-white shadow-sm font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50'
                  } cursor-pointer`}
                >
                  #{p.seatNumber} {p.name}
                </button>
              );
            })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedTargetId) {
                shootHunterTarget(selectedTargetId);
                setActionDoneMsg('💥 開槍目標已射出！');
              }
            }}
            disabled={!selectedTargetId}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow-sm disabled:opacity-40 cursor-pointer text-xs"
          >
            {actionDoneMsg || '🎯 開槍帶走目標'}
          </button>
          <button
            onClick={() => shootHunterTarget(null)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
          >
            ❌ 壓槍 (不出槍)
          </button>
        </div>
      </div>
    );
  }

  // 預設非技能發動狀態提示
  const phaseZh = PHASE_NAMES_ZH[gamePhase] || gamePhase;
  const getPhaseDescription = () => {
    switch (gamePhase) {
      case 'ASSIGNING_ROLES':
        return '🎲 正在分發身分牌與技能說明，即將進入黑夜...';
      case 'NIGHT_START':
        return '天黑請閉眼，夜行角色正在行動...';
      case 'NIGHT_CUPID':
        return '邱比特正在選擇連線情侶，請保持安靜...';
      case 'NIGHT_DREAMCATCHER':
        return '攝夢人正在選擇入夢目標，請保持安靜...';
      case 'NIGHT_GUARD':
        return '守衛正在選擇守護目標，請保持安靜...';
      case 'NIGHT_WEREWOLF':
        return '狼人正在商議擊殺目標，請保持安靜...';
      case 'NIGHT_SEER':
        return '預言家正在查驗玩家身分，請保持安靜...';
      case 'NIGHT_WITCH':
        return '女巫正在使用藥劑，請保持安靜...';
      case 'NIGHT_SILENCER':
        return '禁言長老正在指定禁言目標，請保持安靜...';
      case 'NIGHT_SETTLE':
        return '夜晚即將結束，正在結算昨夜情況...';
      case 'DAY_ANNOUNCE':
        return '天亮了，正在公佈昨夜情況...';
      case 'DAY_DISCUSSION':
        return '白天自由發言階段，請於右側聊天室發言討論...';
      case 'KNIGHT_DUEL':
        return '騎士正在發動拔劍決鬥！正在結算決鬥生死...';
      case 'DAY_VOTING':
        return '放逐投票進行中，請於右側投出您的關鍵一票...';
      case 'DAY_VOTE_RESULT':
        return '投票結束，正在結算放逐結果...';
      case 'HUNTER_SHOOT':
        return '獵人正在開槍發動技能...';
      default:
        return '請等待輪次指引...';
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-400 space-y-3">
      <span className="text-3xl block">⏳</span>
      <h4 className="text-base font-bold text-zinc-200">【{phaseZh}】</h4>
      <p className="text-xs text-zinc-400">{getPhaseDescription()}</p>

      <div className="pt-2">
        <button
          onClick={() => onOpenSkillGuide?.(role)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-xs text-amber-300 font-medium transition-colors cursor-pointer"
        >
          <span>📖</span> 查看我的角色技能與圖鑑
        </button>
      </div>
    </div>
  );
};

export default NightSkillPanel;
