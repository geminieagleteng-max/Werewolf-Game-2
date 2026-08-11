import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { peerNetwork } from '../network/PeerNetwork';
import { SOCKET_EVENTS } from '../engine/socketEvents';
import { voiceManager } from '../engine/VoiceManager';
import { achievementManager } from '../engine/AchievementManager';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  // 連線模式：預設 'P2P' (免伺服器即開即玩，支援好友跨網連線與AI人機)，亦支援自架 'SERVER'
  const [networkMode, setNetworkMode] = useState(() => localStorage.getItem('werewolf_network_mode') || 'P2P');
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('werewolf_server_url') || 'http://localhost:3000');

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(true); // P2P 模式下預設連線就緒

  const [room, setRoom] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [myRoleInfo, setMyRoleInfo] = useState(null);
  const [gamePhase, setGamePhase] = useState('WAITING');
  const [gameRound, setGameRound] = useState(0);
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [systemLogs, setSystemLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [seerCheckResult, setSeerCheckResult] = useState(null);
  const [witchNightInfo, setWitchNightInfo] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [skipDiscussionData, setSkipDiscussionData] = useState({
    skipVoters: [],
    aliveCount: 0,
    neededVotes: 0,
    hasPassed: false,
  });

  // 語音通話與麥克風狀態
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isMicInitialized, setIsMicInitialized] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingPlayerIds, setSpeakingPlayerIds] = useState([]);
  const [isMicSettingsOpen, setIsMicSettingsOpen] = useState(false);

  // 成就系統與榮譽稱號狀態
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [achievementSummary, setAchievementSummary] = useState(() => achievementManager.getSummary());
  const [equippedTitle, setEquippedTitle] = useState(() => achievementManager.stats.equippedTitle || '新晉村民');

  useEffect(() => {
    const unsub = achievementManager.subscribe((newStats, summary) => {
      setAchievementSummary(summary);
      setEquippedTitle(newStats.equippedTitle || '新晉村民');
    });
    return unsub;
  }, []);

  // 狼人隊友清單與即時暗殺投票同步 (僅狼人身分持有)
  const [werewolfTeammates, setWerewolfTeammates] = useState([]);
  const [werewolfTeamData, setWerewolfTeamData] = useState({ votes: [], consensusTargetId: null });

  const addSystemLog = useCallback((msg) => {
    setSystemLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text: msg, time: new Date() },
    ]);
  }, []);

  // ----------------------------------------------------
  // P2P 網路事件監聽掛載
  // ----------------------------------------------------
  useEffect(() => {
    if (networkMode !== 'P2P') return;

    setIsConnected(true);

    const unsubRoomUpdate = peerNetwork.on(SOCKET_EVENTS.ROOM.STATE_UPDATE, (updatedRoom) => {
      setRoom(updatedRoom);
      if (peerNetwork.myPeerId) {
        const me = updatedRoom.players.find((p) => p.id === peerNetwork.myPeerId);
        if (me) {
          setMyPlayer((prev) => ({
            ...me,
            role: prev?.role || me.role,
            hasUsedAntidote: prev?.hasUsedAntidote ?? me.hasUsedAntidote,
            hasUsedPoison: prev?.hasUsedPoison ?? me.hasUsedPoison,
            lastGuardedId: prev?.lastGuardedId ?? me.lastGuardedId,
            canShoot: prev?.canShoot ?? me.canShoot,
          }));
        }

        // 自動維護 P2P 全員雙向全網狀語音通話與解鎖播放
        if (updatedRoom?.players) {
          const peerIds = updatedRoom.players.map((p) => p.id);
          peerNetwork.updateFullMeshAudio(peerIds);
          voiceManager.unlockAudioPlayback();
        }
      }
    });

    const handleSystemMessageAchievement = (message) => {
      if (!message) return;
      if (message.includes('決鬥成功！')) {
        achievementManager.onKnightKilledWolf();
      }
      if (message.includes('開槍帶走了') && (message.includes('狼') || message.includes('WEREWOLF'))) {
        achievementManager.onHunterShotWolf();
      }
      if (message.includes('指定禁言')) {
        achievementManager.onSilencerSuccess();
      }
      if (message.includes('平安夜') || message.includes('無人倒在黑夜之中') || message.includes('守衛守護')) {
        achievementManager.onGuardSaved();
      }
      if (message.includes('翻牌公布身分') || message.includes('白痴')) {
        achievementManager.onIdiotRevealed();
      }
      if (message.includes('救起') || message.includes('使用解藥')) {
        achievementManager.onSilverWaterSaved();
      }
    };

    const unsubRoleAssigned = peerNetwork.on(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, ({ player, roleInfo, werewolfTeammates: teammates }) => {
      setMyPlayer(player);
      setMyRoleInfo(roleInfo);
      setWerewolfTeammates(teammates || []);
      achievementManager.onGameStarted(player);
      achievementManager.onRoleAssigned(roleInfo?.id, player?.id);
      addSystemLog(`🎴 您的身分牌已發放：【${roleInfo.name}】`);
      voiceManager.unlockAudioPlayback();
    });

    const unsubPhaseChange = peerNetwork.on(SOCKET_EVENTS.GAME.PHASE_CHANGE, ({ phase, round, duration }) => {
      setGamePhase(phase);
      setGameRound(round);
      setPhaseDuration(duration);
      voiceManager.unlockAudioPlayback();
      if (phase === 'DAY_ANNOUNCE') {
        achievementManager.onNightSurvived();
      }
      if (phase === 'NIGHT_START' || phase === 'NIGHT_SEER') {
        setSeerCheckResult(null);
      }
      if (phase === 'NIGHT_START') {
        setWitchNightInfo(null);
      }
    });

    const unsubSystemMsg = peerNetwork.on(SOCKET_EVENTS.GAME.SYSTEM_MSG, ({ message }) => {
      addSystemLog(message);
      handleSystemMessageAchievement(message);
    });

    const unsubChat = peerNetwork.on(SOCKET_EVENTS.ACTION.RECEIVE_CHAT, (chat) => {
      setChatMessages((prev) => [...prev, chat]);
    });

    const unsubSeer = peerNetwork.on(SOCKET_EVENTS.ACTION.SEER_RESULT, (result) => {
      setSeerCheckResult(result);
      achievementManager.onSeerResult(result);
    });

    const unsubWitch = peerNetwork.on(SOCKET_EVENTS.ACTION.WITCH_NIGHT_INFO, (info) => {
      setWitchNightInfo(info);
    });

    const unsubSkipDiscussion = peerNetwork.on(SOCKET_EVENTS.ACTION.SKIP_DISCUSSION_UPDATE, (data) => {
      setSkipDiscussionData(data);
    });

    const unsubWolfTeamSync = peerNetwork.on(SOCKET_EVENTS.ACTION.WEREWOLF_TEAM_SYNC, (data) => {
      setWerewolfTeamData(data);
    });

    const unsubSpeaking = peerNetwork.on(SOCKET_EVENTS.ACTION.SPEAKING_STATE, ({ playerId, isSpeaking: spk }) => {
      setSpeakingPlayerIds((prev) =>
        spk ? Array.from(new Set([...prev, playerId])) : prev.filter((id) => id !== playerId)
      );
    });

    const unsubGameOver = peerNetwork.on(SOCKET_EVENTS.GAME.OVER, (data) => {
      setGameOverData(data);
      achievementManager.onGameOver(data, myPlayer);
      addSystemLog(`🏆 遊戲結束！${data.reason}`);
    });

    const unsubKicked = peerNetwork.on(SOCKET_EVENTS.ROOM.KICKED, ({ message }) => {
      setRoom(null);
      setMyPlayer(null);
      setMyRoleInfo(null);
      setGamePhase('WAITING');
      setErrorMessage(message || '您已被房主請出房間。');
      addSystemLog(`⛔ ${message || '您已被房主請出房間。'}`);
    });

    const unsubError = peerNetwork.on(SOCKET_EVENTS.ROOM.ERROR, ({ message }) => {
      setErrorMessage(message);
      addSystemLog(`⚠️ 提示: ${message}`);
    });

    return () => {
      unsubRoomUpdate();
      unsubRoleAssigned();
      unsubPhaseChange();
      unsubSystemMsg();
      unsubChat();
      unsubSeer();
      unsubWitch();
      unsubSkipDiscussion();
      unsubWolfTeamSync();
      unsubSpeaking();
      unsubGameOver();
      unsubKicked();
      unsubError();
    };
  }, [networkMode, addSystemLog, myPlayer]);

  // ----------------------------------------------------
  // Socket.io 伺服器連線 (選擇自架伺服器模式時使用)
  // ----------------------------------------------------
  useEffect(() => {
    if (networkMode !== 'SERVER' || !serverUrl) return;

    const s = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      addSystemLog(`🟢 已成功連線至伺服器 [${serverUrl}]`);
    });

    s.on('connect_error', () => {
      setIsConnected(false);
      addSystemLog(`⚠️ 連線至 [${serverUrl}] 失敗，請確認後端已啟動。`);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      addSystemLog('🔴 與伺服器連線中斷');
    });

    s.on('room:state_update', (updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === s.id);
      if (me) {
        setMyPlayer((prev) => ({
          ...me,
          role: prev?.role || me.role,
          hasUsedAntidote: prev?.hasUsedAntidote ?? me.hasUsedAntidote,
          hasUsedPoison: prev?.hasUsedPoison ?? me.hasUsedPoison,
          lastGuardedId: prev?.lastGuardedId ?? me.lastGuardedId,
          canShoot: prev?.canShoot ?? me.canShoot,
        }));
      }
    });

    s.on('game:role_assigned', ({ player, roleInfo, werewolfTeammates: teammates }) => {
      setMyPlayer(player);
      setMyRoleInfo(roleInfo);
      setWerewolfTeammates(teammates || []);
      achievementManager.onGameStarted(player);
      achievementManager.onRoleAssigned(roleInfo?.id, player?.id);
      addSystemLog(`🎴 您的身分牌已發放：【${roleInfo.name}】`);
    });

    s.on('game:phase_change', ({ phase, round, duration }) => {
      setGamePhase(phase);
      setGameRound(round);
      setPhaseDuration(duration);
      if (phase === 'DAY_ANNOUNCE') {
        achievementManager.onNightSurvived();
      }
      if (phase === 'NIGHT_START' || phase === 'NIGHT_SEER') {
        setSeerCheckResult(null);
      }
      if (phase === 'NIGHT_START') {
        setWitchNightInfo(null);
      }
    });

    s.on('game:system_message', ({ message }) => {
      addSystemLog(message);
      if (message.includes('決鬥成功！')) {
        achievementManager.onKnightKilledWolf();
      }
      if (message.includes('開槍帶走了') && (message.includes('狼') || message.includes('WEREWOLF'))) {
        achievementManager.onHunterShotWolf();
      }
      if (message.includes('指定禁言')) {
        achievementManager.onSilencerSuccess();
      }
      if (message.includes('平安夜') || message.includes('無人倒在黑夜之中') || message.includes('守衛守護')) {
        achievementManager.onGuardSaved();
      }
      if (message.includes('翻牌公布身分') || message.includes('白痴')) {
        achievementManager.onIdiotRevealed();
      }
      if (message.includes('救起') || message.includes('使用解藥')) {
        achievementManager.onSilverWaterSaved();
      }
    });

    s.on('action:receive_chat', (chat) => {
      setChatMessages((prev) => [...prev, chat]);
    });

    s.on('action:seer_result', (result) => {
      setSeerCheckResult(result);
      achievementManager.onSeerResult(result);
    });

    s.on('action:witch_night_info', (info) => {
      setWitchNightInfo(info);
    });

    s.on('action:skip_discussion_update', (data) => {
      setSkipDiscussionData(data);
    });

    s.on('action:werewolf_team_sync', (data) => {
      setWerewolfTeamData(data);
    });

    s.on('action:speaking_state', ({ playerId, isSpeaking: spk }) => {
      setSpeakingPlayerIds((prev) =>
        spk ? Array.from(new Set([...prev, playerId])) : prev.filter((id) => id !== playerId)
      );
    });

    s.on('game:over', (data) => {
      setGameOverData(data);
      achievementManager.onGameOver(data, myPlayer);
      addSystemLog(`🏆 遊戲結束！${data.reason}`);
    });

    s.on('room:kicked', ({ message }) => {
      setRoom(null);
      setMyPlayer(null);
      setMyRoleInfo(null);
      setGamePhase('WAITING');
      setErrorMessage(message || '您已被房主請出房間。');
      addSystemLog(`⛔ ${message || '您已被房主請出房間。'}`);
    });

    s.on('room:error', ({ message }) => {
      setErrorMessage(message);
      addSystemLog(`⚠️ ${message}`);
    });

    return () => {
      s.disconnect();
    };
  }, [networkMode, serverUrl, addSystemLog]);

  // 切換網路模式
  const switchNetworkMode = (mode, customUrl) => {
    setNetworkMode(mode);
    localStorage.setItem('werewolf_network_mode', mode);
    if (customUrl) {
      const formatted = customUrl.trim().replace(/\/$/, '');
      setServerUrl(formatted);
      localStorage.setItem('werewolf_server_url', formatted);
    }
  };

  // ----------------------------------------------------
  // 操作派發方法 (統整 P2P 與 Socket.io)
  // ----------------------------------------------------
  const createRoom = async (playerName, roomName, maxPlayers, roleConfig) => {
    setErrorMessage(null);
    if (networkMode === 'P2P') {
      try {
        const { room: r, player: p } = await peerNetwork.hostRoom({
          roomName,
          maxPlayers,
          roleConfig,
          playerName,
        });
        setRoom(r.toPublicJSON());
        setMyPlayer(p.toPublicJSON());
      } catch (err) {
        setErrorMessage('建立房間失敗，請重新嘗試！');
      }
    } else {
      socket?.emit('room:create', { playerName, roomName, maxPlayers, roleConfig });
    }
  };

  const joinRoom = async (playerName, roomId) => {
    setErrorMessage(null);
    if (!roomId || !roomId.trim()) {
      setErrorMessage('請輸入 6 位房間代碼！');
      return;
    }

    if (networkMode === 'P2P') {
      try {
        await peerNetwork.joinRoom({ roomId: roomId.trim(), playerName });
      } catch (err) {
        setErrorMessage('加入房間失敗，請確認房號是否正確且房主在線上！');
      }
    } else {
      socket?.emit('room:join', { playerName, roomId: roomId.trim() });
    }
  };

  const addBot = () => {
    if (networkMode === 'P2P') {
      peerNetwork.addBot();
    }
  };

  const fillBots = () => {
    if (networkMode === 'P2P') {
      peerNetwork.fillBots();
    }
  };

  const toggleReady = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.TOGGLE_READY);
    } else {
      socket?.emit('room:toggle_ready');
    }
  };

  const startGame = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.GAME.START);
    } else {
      socket?.emit('game:start');
    }
  };

  const leaveRoom = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.LEAVE);
      peerNetwork.cleanup();
    } else {
      socket?.emit('room:leave');
    }
    setRoom(null);
    setMyPlayer(null);
    setMyRoleInfo(null);
    setGamePhase('WAITING');
    setGameOverData(null);
  };

  const kickPlayer = (targetPlayerId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.KICK_PLAYER, { targetPlayerId });
    } else {
      socket?.emit('room:kick_player', { targetPlayerId });
    }
  };

  const sendChat = (message) => {
    if (!message?.trim()) return;
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.SEND_CHAT, { message: message.trim() });
    } else {
      socket?.emit('action:send_chat', { message: message.trim() });
    }
    achievementManager.onChatSent();
  };

  const selectWerewolfTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.WEREWOLF_SELECT, { targetId });
    } else {
      socket?.emit('action:werewolf_select', { targetId });
    }
  };

  const checkSeerTarget = (targetIds) => {
    const ids = Array.isArray(targetIds) ? targetIds : [targetIds].filter(Boolean);
    const payload = { targetIds: ids, targetId: ids[0] };
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.SEER_CHECK, payload);
    } else {
      socket?.emit('action:seer_check', payload);
    }
  };

  const useWitchSkill = (useAntidote, poisonTargetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.WITCH_ACTION, { useAntidote, poisonTargetId });
    } else {
      socket?.emit('action:witch_action', { useAntidote, poisonTargetId });
    }
    if (useAntidote) {
      achievementManager.onWitchSaveSuccess();
    }
    if (poisonTargetId) {
      const target = room?.players?.find((p) => p.id === poisonTargetId);
      if (target?.role === 'WEREWOLF') {
        achievementManager.onWitchPoisonWolfSuccess();
      }
    }
  };

  const protectGuardTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.GUARD_PROTECT, { targetId });
    } else {
      socket?.emit('action:guard_protect', { targetId });
    }
  };

  const shootHunterTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.HUNTER_SHOOT, { targetId });
    } else {
      socket?.emit('action:hunter_shoot', { targetId });
    }
  };

  const castDayVote = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.CAST_VOTE, { targetId });
    } else {
      socket?.emit('action:cast_vote', { targetId });
    }
    if (targetId) {
      achievementManager.onDayVoted();
    }
  };

  const linkCupidTargets = (target1Id, target2Id) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.CUPID_LINK, { target1Id, target2Id });
    } else {
      socket?.emit('action:cupid_link', { target1Id, target2Id });
    }
  };

  const dreamcatcherDream = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.DREAMCATCHER_DREAM, { targetId });
    } else {
      socket?.emit('action:dreamcatcher_dream', { targetId });
    }
  };

  const silencerSilence = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.SILENCER_SILENCE, { targetId });
    } else {
      socket?.emit('action:silencer_silence', { targetId });
    }
  };

  const knightDuel = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.KNIGHT_DUEL, { targetId });
    } else {
      socket?.emit('action:knight_duel', { targetId });
    }
  };

  const voteSkipDiscussion = (skip) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.VOTE_SKIP_DISCUSSION, { skip });
    } else {
      socket?.emit('action:vote_skip_discussion', { skip });
    }
  };

  const trackRoleManualView = (roleKey) => {
    if (roleKey) {
      achievementManager.onRoleManualViewed(roleKey);
    }
  };

  // ----------------------------------------------------
  // 麥克風與語音控制方法
  // ----------------------------------------------------
  useEffect(() => {
    voiceManager.onVolumeChange = (vol) => {
      setMicLevel(vol);
    };

    voiceManager.onSpeakingChange = (speaking) => {
      setIsSpeaking(speaking);
      if (myPlayer?.id) {
        if (networkMode === 'P2P') {
          peerNetwork.emit(SOCKET_EVENTS.ACTION.SPEAKING_STATE, { isSpeaking: speaking });
        } else {
          socket?.emit('action:speaking_state', { isSpeaking: speaking });
        }
      }
    };

    return () => {
      voiceManager.onVolumeChange = null;
      voiceManager.onSpeakingChange = null;
    };
  }, [myPlayer?.id, networkMode, socket]);

  useEffect(() => {
    if (myPlayer && (!myPlayer.isAlive || myPlayer.isSilenced)) {
      voiceManager.setMuted(true);
      setIsMicMuted(true);
    }
  }, [myPlayer?.isAlive, myPlayer?.isSilenced]);

  const initMic = async (deviceId) => {
    const res = await voiceManager.init(deviceId);
    setIsMicInitialized(res.success);
    setIsMicMuted(voiceManager.isMuted);
    if (res.success) {
      voiceManager.unlockAudioPlayback();
      if (networkMode === 'P2P') {
        peerNetwork.connectAudioToAllPeers();
      }
    }
    return res;
  };

  const toggleMic = async () => {
    if (myPlayer && (!myPlayer.isAlive || myPlayer.isSilenced)) {
      addSystemLog('⚠️ 您當前處於出局或禁言狀態，無法開麥發言。');
      return;
    }
    if (!voiceManager.isInitialized) {
      const res = await initMic();
      if (!res.success) {
        setErrorMessage('請允許瀏覽器麥克風權限以使用語音通話！');
        return;
      }
    }
    const newMuted = voiceManager.toggleMute();
    setIsMicMuted(newMuted);
    voiceManager.unlockAudioPlayback();
    if (!newMuted) {
      achievementManager.onVoiceUsed();
      if (networkMode === 'P2P') {
        peerNetwork.connectAudioToAllPeers();
      }
    }
  };

  const restartGame = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.GAME.RESTART);
    } else {
      socket?.emit('game:restart');
    }
    setGameOverData(null);
    setMyRoleInfo(null);
    setWerewolfTeammates([]);
    setWerewolfTeamData({ votes: [], consensusTargetId: null });
    setSkipDiscussionData({ skipVoters: [], aliveCount: 0, neededVotes: 0, hasPassed: false });
  };

  const currentWerewolfTeammates = (werewolfTeammates || []).map((w) => {
    const p = room?.players.find((rp) => rp.id === w.id);
    return p ? { ...w, isAlive: p.isAlive, name: p.name, seatNumber: p.seatNumber } : w;
  });

  return (
    <SocketContext.Provider
      value={{
        socket,
        networkMode,
        serverUrl,
        switchNetworkMode,
        isConnected,
        room,
        myPlayer,
        myRoleInfo,
        werewolfTeammates: currentWerewolfTeammates,
        werewolfTeamData,
        gamePhase,
        gameRound,
        phaseDuration,
        systemLogs,
        chatMessages,
        seerCheckResult,
        setSeerCheckResult,
        witchNightInfo,
        gameOverData,
        errorMessage,
        setErrorMessage,
        skipDiscussionData,
        voteSkipDiscussion,
        isMicMuted,
        isMicInitialized,
        micLevel,
        isSpeaking,
        speakingPlayerIds,
        isMicSettingsOpen,
        setIsMicSettingsOpen,
        isAchievementsOpen,
        setIsAchievementsOpen,
        achievementSummary,
        equippedTitle,
        trackRoleManualView,
        initMic,
        toggleMic,
        createRoom,
        joinRoom,
        addBot,
        fillBots,
        toggleReady,
        startGame,
        leaveRoom,
        kickPlayer,
        sendChat,
        selectWerewolfTarget,
        checkSeerTarget,
        useWitchSkill,
        protectGuardTarget,
        shootHunterTarget,
        linkCupidTargets,
        dreamcatcherDream,
        silencerSilence,
        knightDuel,
        castDayVote,
        restartGame,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
