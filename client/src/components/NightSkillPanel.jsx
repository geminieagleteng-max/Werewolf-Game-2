import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

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
    seerCheckResult,
    setSeerCheckResult,
    witchNightInfo,
  } = useSocket();

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [witchMode, setWitchMode] = useState(null); // 'POISON' | null
  const [actionDoneMsg, setActionDoneMsg] = useState('');

  // 階段切換時自動清空暫存選擇
  useEffect(() => {
    setSelectedTargetId(null);
    setActionDoneMsg('');
  }, [gamePhase]);

  if (!myPlayer) return null;

  const role = myPlayer.role || myRoleInfo?.id;
  const alivePlayers = room?.players.filter((p) => p.isAlive) || [];

  if (!myPlayer.isAlive && gamePhase !== 'HUNTER_SHOOT') {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-500">
        <span className="text-3xl block mb-2">⚰️</span>
        <h4 className="text-white font-bold mb-1">您已出局</h4>
        <p className="text-xs">請靜待白天討論或遊戲結算觀戰。</p>
      </div>
    );
  }

  // 1. 守衛行動面板
  if (gamePhase === 'NIGHT_GUARD' && role === 'GUARD') {
    return (
      <div className="bg-blue-950/40 border border-blue-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h4 className="text-lg font-bold text-blue-300">守衛請睜眼</h4>
            <p className="text-xs text-blue-200/70">請選擇今晚要守護的玩家（不可連續兩晚守護同一人）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers.map((p) => {
            const isLastGuarded = myPlayer.lastGuardedId === p.id;
            return (
              <button
                key={p.id}
                disabled={isLastGuarded}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                  isLastGuarded
                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    : selectedTargetId === p.id
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500'
                }`}
              >
                #{p.seatNumber} {p.name}
                {isLastGuarded && <span className="block text-[10px] text-red-400 font-normal">上一夜已守</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              protectGuardTarget(selectedTargetId);
              setActionDoneMsg(`已確認守護 ${selectedTargetId ? '目標玩家' : '空守'}`);
            }}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            🛡️ 確認守護
          </button>
          <button
            onClick={() => {
              protectGuardTarget(null);
              setActionDoneMsg('今晚選擇空守');
            }}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 cursor-pointer"
          >
            ❌ 空守 (不守護)
          </button>
        </div>

        {actionDoneMsg && <p className="mt-3 text-xs text-blue-300 text-center">{actionDoneMsg}</p>}
      </div>
    );
  }

  // 2. 狼人行動面板
  if (gamePhase === 'NIGHT_WEREWOLF' && role === 'WEREWOLF') {
    return (
      <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🐺</span>
          <div>
            <h4 className="text-lg font-bold text-red-400">狼人請睜眼</h4>
            <p className="text-xs text-red-300/70">請選擇今晚要擊殺的目標，選票將即時同步給狼隊友</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers.map((p) => {
            const isTeammate = p.role === 'WEREWOLF';
            return (
              <button
                key={p.id}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                  selectedTargetId === p.id
                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/60 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-red-500'
                }`}
              >
                #{p.seatNumber} {p.name}
                {isTeammate && <span className="block text-[10px] text-red-400 font-normal">🐺 狼隊友</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            selectWerewolfTarget(selectedTargetId);
            setActionDoneMsg('已送出擊殺目標！');
          }}
          disabled={!selectedTargetId}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          🔪 確認狼刀目標
        </button>

        {actionDoneMsg && <p className="mt-3 text-xs text-red-300 text-center">{actionDoneMsg}</p>}
      </div>
    );
  }

  // 3. 預言家行動面板
  if (gamePhase === 'NIGHT_SEER' && role === 'SEER') {
    return (
      <div className="bg-purple-950/40 border border-purple-800/80 rounded-2xl p-6 shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔮</span>
          <div>
            <h4 className="text-lg font-bold text-purple-300">預言家請睜眼</h4>
            <p className="text-xs text-purple-200/70">請選擇一名玩家查驗其所屬陣營（好人 🛡️ / 狼人 🐺）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers
            .filter((p) => p.id !== myPlayer.id)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  selectedTargetId === p.id
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/60 scale-105 ring-2 ring-purple-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-purple-500'
                }`}
              >
                #{p.seatNumber} {p.name}
              </button>
            ))}
        </div>

        <button
          onClick={() => {
            checkSeerTarget(selectedTargetId);
            setActionDoneMsg('查驗中，正在獲取身分報告...');
          }}
          disabled={!selectedTargetId}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          🔍 查驗該玩家身分
        </button>

        {actionDoneMsg && !seerCheckResult && (
          <p className="mt-2 text-xs text-purple-300 text-center animate-pulse">{actionDoneMsg}</p>
        )}

        {/* 查驗結果彈窗 */}
        {seerCheckResult && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950 to-indigo-950 border-2 border-purple-400 text-center shadow-xl animate-fade-in">
            <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wider">🔮 預言家查驗報告</h5>
            <p className="text-xl font-black text-white mt-1">
              #{seerCheckResult.seatNumber} 號【{seerCheckResult.targetName}】
            </p>
            <div className="mt-2 inline-block px-4 py-1.5 rounded-full text-sm font-black bg-white/10 text-amber-300 border border-amber-400/40">
              身分所屬：{seerCheckResult.factionName}
            </div>
            <button
              onClick={() => setSeerCheckResult(null)}
              className="block mx-auto mt-3 text-xs text-purple-300 hover:text-white underline cursor-pointer"
            >
              關閉提示
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. 女巫行動面板
  if (gamePhase === 'NIGHT_WITCH' && role === 'WITCH') {
    const hasAntidote = !myPlayer.hasUsedAntidote;
    const hasPoison = !myPlayer.hasUsedPoison;
    const victim = witchNightInfo?.targetName;

    return (
      <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🧪</span>
          <div>
            <h4 className="text-lg font-bold text-emerald-300">女巫請睜眼</h4>
            <p className="text-xs text-emerald-200/70">您擁有解藥與毒藥各一瓶，同夜不可雙藥並用</p>
          </div>
        </div>

        {/* 今晚死訊提示 */}
        <div className="p-3 bg-slate-900/80 border border-emerald-500/30 rounded-xl mb-4 text-center">
          <span className="text-xs text-slate-400">今晚中刀目標：</span>
          <span className="text-sm font-bold text-amber-400 ml-1">
            {victim ? `#{witchNightInfo.targetSeat} ${victim}` : '平安夜 (無人中刀)'}
          </span>
        </div>

        {/* 技能選擇按鈕 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            disabled={!hasAntidote || !witchNightInfo?.targetId}
            onClick={() => {
              useWitchSkill(true, null);
              setActionDoneMsg('已使用【解藥】救治中刀者！');
            }}
            className="p-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            💉 使用解藥救人
          </button>

          <button
            disabled={!hasPoison}
            onClick={() => setWitchMode(witchMode === 'POISON' ? null : 'POISON')}
            className={`p-3 font-bold rounded-xl text-xs transition-all cursor-pointer ${
              witchMode === 'POISON'
                ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 disabled:opacity-40'
            }`}
          >
            ☠️ 使用毒藥毒人
          </button>

          <button
            onClick={() => {
              useWitchSkill(false, null);
              setActionDoneMsg('今晚不使用藥劑。');
            }}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            ❌ 不用藥
          </button>
        </div>

        {/* 下毒目標選擇器 */}
        {witchMode === 'POISON' && (
          <div className="p-4 bg-slate-900 rounded-xl border border-rose-600 mb-4 animate-fade-in">
            <h5 className="text-xs font-bold text-rose-400 mb-2">請選擇下毒目標：</h5>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {alivePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                    selectedTargetId === p.id
                      ? 'bg-rose-600 border-rose-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  #{p.seatNumber} {p.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                useWitchSkill(false, selectedTargetId);
                setActionDoneMsg('已送出毒藥！');
                setWitchMode(null);
              }}
              disabled={!selectedTargetId}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer"
            >
              確定施毒
            </button>
          </div>
        )}

        {actionDoneMsg && <p className="text-xs text-emerald-300 text-center">{actionDoneMsg}</p>}
      </div>
    );
  }

  // 5. 獵人開槍面板
  if (gamePhase === 'HUNTER_SHOOT' && role === 'HUNTER') {
    return (
      <div className="bg-amber-950/40 border border-amber-600 rounded-2xl p-6 shadow-xl animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💥</span>
          <div>
            <h4 className="text-lg font-bold text-amber-300">獵人開槍技能</h4>
            <p className="text-xs text-amber-200/70">您已出局，請選擇帶走一名玩家（或壓槍）</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {alivePlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedTargetId(p.id)}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                selectedTargetId === p.id
                  ? 'bg-amber-500 text-slate-950 border-white shadow-lg'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              #{p.seatNumber} {p.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => shootHunterTarget(selectedTargetId)}
            disabled={!selectedTargetId}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg disabled:opacity-50 cursor-pointer"
          >
            🎯 開槍帶走目標
          </button>
          <button
            onClick={() => shootHunterTarget(null)}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
          >
            ❌ 壓槍 (不出槍)
          </button>
        </div>
      </div>
    );
  }

  // 預設非技能發動狀態提示
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
      <span className="text-2xl block mb-2">⏳</span>
      <p className="text-sm">當前階段為【{gamePhase}】，請等待輪次指引...</p>
    </div>
  );
};

export default NightSkillPanel;
