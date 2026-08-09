import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { PHASE_NAMES_ZH } from '../engine/gameStates';

export const NightSkillPanel = () => {
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
    setSeerCheckResult,
    witchNightInfo,
  } = useSocket();

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [cupidSelectedIds, setCupidSelectedIds] = useState([]);
  const [witchMode, setWitchMode] = useState(null); // 'POISON' | null
  const [actionDoneMsg, setActionDoneMsg] = useState('');

  // 階段切換時自動清空暫存選擇
  useEffect(() => {
    setSelectedTargetId(null);
    setCupidSelectedIds([]);
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
      <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💘</span>
          <div>
            <h4 className="text-base font-bold text-rose-300">邱比特請睜眼</h4>
            <p className="text-xs text-rose-300/70">請選擇任意兩位玩家連為生死情侶（已選 {cupidSelectedIds.length} / 2 位）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {allPlayers.map((p) => {
            const isSelected = cupidSelectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleCupidToggle(p.id)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-rose-600 border-rose-400 text-white shadow-sm'
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
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          {actionDoneMsg || '💘 確認連為生死情侶'}
        </button>
      </div>
    );
  }

  // 2. 攝夢人行動面板
  if (gamePhase === 'NIGHT_DREAMCATCHER' && role === 'DREAMCATCHER') {
    return (
      <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💤</span>
          <div>
            <h4 className="text-base font-bold text-cyan-300">攝夢人請睜眼</h4>
            <p className="text-xs text-cyan-300/70">請選擇今晚入夢的玩家（連續兩夜攝夢同一人將導致其夢死）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers.map((p) => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
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
            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
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
      <div className="bg-blue-950/30 border border-blue-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h4 className="text-base font-bold text-blue-300">守衛請睜眼</h4>
            <p className="text-xs text-blue-300/70">請選擇今晚要守護的玩家（不可連續兩晚守護同一人）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
                    ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
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
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
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

  // 4. 狼人行動面板
  if (gamePhase === 'NIGHT_WEREWOLF' && role === 'WEREWOLF') {
    return (
      <div className="bg-red-950/30 border border-red-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🐺</span>
          <div>
            <h4 className="text-base font-bold text-red-300">狼人請睜眼</h4>
            <p className="text-xs text-red-300/70">請與狼隊友協商並點擊今晚暗殺目標</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers.map((p) => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedTargetId(p.id);
                  selectWerewolfTarget(p.id);
                }}
                className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-red-600 border-red-400 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-red-500/50'
                } cursor-pointer`}
              >
                #{p.seatNumber} {p.name}
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400">
          已選擇暗殺目標：
          <span className="font-semibold text-red-400 ml-1">
            {selectedTargetId
              ? `#${room?.players.find((p) => p.id === selectedTargetId)?.seatNumber} ${
                  room?.players.find((p) => p.id === selectedTargetId)?.name
                }`
              : '尚未鎖定'}
          </span>
        </div>
      </div>
    );
  }

  // 5. 預言家行動面板
  if (gamePhase === 'NIGHT_SEER' && role === 'SEER') {
    return (
      <div className="bg-purple-950/30 border border-purple-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔮</span>
          <div>
            <h4 className="text-base font-bold text-purple-300">預言家請睜眼</h4>
            <p className="text-xs text-purple-300/70">選擇一名玩家查驗其身分陣營</p>
          </div>
        </div>

        {seerCheckResult && (
          <div className="mb-4 p-4 bg-purple-900/40 border border-purple-500/50 rounded-xl text-center">
            <span className="text-xs text-purple-200 block mb-1">水晶球查驗結果：</span>
            <div className="text-base font-bold text-white">
              #{seerCheckResult.seatNumber} {seerCheckResult.targetName}
            </div>
            <div className={`text-sm font-bold mt-1 ${seerCheckResult.isWerewolf ? 'text-red-400' : 'text-emerald-400'}`}>
              身分為：{seerCheckResult.factionName}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
                      ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-purple-500/50'
                  } cursor-pointer`}
                >
                  #{p.seatNumber} {p.name}
                </button>
              );
            })}
        </div>

        <button
          onClick={() => {
            if (selectedTargetId) {
              checkSeerTarget(selectedTargetId);
              setActionDoneMsg('🔮 已查驗完成！');
            }
          }}
          disabled={!selectedTargetId}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          {actionDoneMsg || '🔮 查驗該玩家身分'}
        </button>
      </div>
    );
  }

  // 6. 女巫行動面板
  if (gamePhase === 'NIGHT_WITCH' && role === 'WITCH') {
    const victimPlayer = witchNightInfo?.targetId ? room?.players.find((p) => p.id === witchNightInfo.targetId) : null;

    return (
      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🧪</span>
          <div>
            <h4 className="text-base font-bold text-emerald-300">女巫請睜眼</h4>
            <p className="text-xs text-emerald-300/70">您擁有解藥與毒藥各一瓶（同夜不可雙藥並用）</p>
          </div>
        </div>

        {victimPlayer ? (
          <div className="mb-4 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-red-300">今晚中刀倒牌的玩家：</span>
              <span className="font-semibold text-white ml-1">
                #{victimPlayer.seatNumber} {victimPlayer.name}
              </span>
            </div>
            <button
              onClick={() => {
                useWitchSkill(true, null);
                setActionDoneMsg('🧪 已使用解藥救起該玩家！');
              }}
              disabled={myPlayer.hasUsedAntidote}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {myPlayer.hasUsedAntidote ? '解藥已用' : '使用解藥救人'}
            </button>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 text-center">
            今晚暫無人中刀或守衛已守護成功。
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">使用毒藥毒殺：</span>
            <span className="text-[11px] text-zinc-500">{myPlayer.hasUsedPoison ? '毒藥已用' : '毒藥可用'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {alivePlayers
              .filter((p) => p.id !== myPlayer.id)
              .map((p) => {
                const isSelected = selectedTargetId === p.id;
                return (
                  <button
                    key={p.id}
                    disabled={myPlayer.hasUsedPoison}
                    onClick={() => {
                      setSelectedTargetId(p.id);
                      setWitchMode('POISON');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected && witchMode === 'POISON'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-purple-500/50'
                    } ${myPlayer.hasUsedPoison ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    #{p.seatNumber} {p.name}
                  </button>
                );
              })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (selectedTargetId && witchMode === 'POISON') {
                  useWitchSkill(false, selectedTargetId);
                  setActionDoneMsg('🧪 已使用毒藥毒殺目標！');
                }
              }}
              disabled={myPlayer.hasUsedPoison || !selectedTargetId || witchMode !== 'POISON'}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {actionDoneMsg || '🧪 確認使用毒藥'}
            </button>
            <button
              onClick={() => {
                useWitchSkill(false, null);
                setActionDoneMsg('🧪 今晚不用藥');
              }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
            >
              不使用藥劑
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. 禁言長老行動面板
  if (gamePhase === 'NIGHT_SILENCER' && role === 'SILENCER') {
    return (
      <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤐</span>
          <div>
            <h4 className="text-base font-bold text-indigo-300">禁言長老請睜眼</h4>
            <p className="text-xs text-indigo-300/70">請指定一名玩家在次日白天禁言（不可連續兩晚禁言同一人）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
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
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
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
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💥</span>
          <div>
            <h4 className="text-base font-bold text-amber-300">獵人開槍技能發動</h4>
            <p className="text-xs text-amber-300/70">請選擇一名存活玩家開槍帶走，或選擇壓槍不出</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
                      ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
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
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg shadow-sm disabled:opacity-40 cursor-pointer text-xs"
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
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-400">
      <span className="text-2xl block mb-2">⏳</span>
      <h4 className="text-base font-bold text-zinc-200 mb-1">【{phaseZh}】</h4>
      <p className="text-xs text-zinc-400">{getPhaseDescription()}</p>
    </div>
  );
};

export default NightSkillPanel;
