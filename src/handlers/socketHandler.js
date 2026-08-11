const roomManager = require('../managers/RoomManager');
const Player = require('../models/Player');
const SOCKET_EVENTS = require('../constants/socketEvents');
const { GAME_PHASES, PHASE_DURATIONS } = require('../constants/gameStates');
const { ROLES, ROLE_DEFINITIONS } = require('../constants/roles');

/**
 * 註冊所有 Socket.io 事件處理器
 * @param {import('socket.io').Server} io
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    // ----------------------------------------------------
    // 1. 房務管理事件 (Room Management)
    // ----------------------------------------------------

    // 創建房間
    socket.on(SOCKET_EVENTS.ROOM.CREATE, ({ roomName, maxPlayers, roleConfig, playerName }) => {
      try {
        const pName = (playerName && playerName.trim()) || `玩家_${socket.id.slice(0, 4)}`;
        const rName = (roomName && roomName.trim()) || `${pName} 的狼人殺房間`;
        const mPlayers = parseInt(maxPlayers, 10) || 6;

        const room = roomManager.createRoom({
          name: rName,
          maxPlayers: Math.min(Math.max(mPlayers, 6), 9),
          roleConfig,
        });

        const player = new Player(socket.id, socket.id, pName, 1, true);
        room.addPlayer(player);
        roomManager.bindSocket(socket.id, room.id, player.id);

        socket.join(room.id);

        // 回傳成功與房間狀態
        socket.emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
        io.emit('lobby:list', roomManager.getLobbyList());
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: err.message || '創建房間失敗' });
      }
    });

    // 加入房間
    socket.on(SOCKET_EVENTS.ROOM.JOIN, ({ roomId, playerName }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: '查無此房間代碼！' });
        }

        const pName = (playerName && playerName.trim()) || `玩家_${socket.id.slice(0, 4)}`;
        const player = new Player(socket.id, socket.id, pName);

        const result = room.addPlayer(player);
        if (!result.success) {
          return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: result.message });
        }

        roomManager.bindSocket(socket.id, room.id, player.id);
        socket.join(room.id);

        // 廣播房間新狀態
        io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `玩家【${player.name}】進入了房間（座位 ${player.seatNumber}）。`,
        });
        io.emit('lobby:list', roomManager.getLobbyList());
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: err.message || '加入房間失敗' });
      }
    });

    // 切換準備狀態
    socket.on(SOCKET_EVENTS.ROOM.TOGGLE_READY, () => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player) return;

      room.toggleReady(player.id);
      io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
    });

    // 房主修改房間設定
    socket.on(SOCKET_EVENTS.ROOM.UPDATE_CONFIG, ({ maxPlayers, roleConfig, name }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player || !player.isHost) return;

      room.updateConfig({ maxPlayers, roleConfig, name });
      io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
    });

    // 房主踢人
    socket.on(SOCKET_EVENTS.ROOM.KICK_PLAYER, ({ targetPlayerId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player || !player.isHost) return;
      if (player.id === targetPlayerId) return;

      const targetPlayer = room.players.get(targetPlayerId);
      if (targetPlayer) {
        room.removePlayer(targetPlayerId);
        roomManager.unbindSocket(targetPlayer.socketId);

        const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
        if (targetSocket) {
          targetSocket.leave(room.id);
          targetSocket.emit(SOCKET_EVENTS.ROOM.KICKED, { message: '您已被房主請出房間。' });
        }

        io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `玩家【${targetPlayer.name}】已被房主請出房間。`,
        });
      }
    });

    // 離開房間
    socket.on(SOCKET_EVENTS.ROOM.LEAVE, () => {
      handlePlayerLeave(io, socket);
    });

    // 斷線處理
    socket.on('disconnect', () => {
      handlePlayerLeave(io, socket);
    });

    // ----------------------------------------------------
    // 2. 遊戲流程控制事件 (Game Flow Control)
    // ----------------------------------------------------

    // 房主開始遊戲
    socket.on(SOCKET_EVENTS.GAME.START, () => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player || !player.isHost) return;

      const check = room.canStartGame();
      if (!check.canStart) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: check.message });
      }

      // 開始遊戲發牌
      const game = room.startGame();
      io.to(room.id).emit(SOCKET_EVENTS.GAME.STARTED);
      io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());

      // 私密推送各自的角色底牌與技能說明 (狼人獲取狼隊友清單)
      const werewolves = Array.from(room.players.values())
        .filter((w) => w.role === 'WEREWOLF')
        .map((w) => ({
          id: w.id,
          seatNumber: w.seatNumber,
          name: w.name,
          isAlive: w.isAlive,
        }));

      room.players.forEach((p) => {
        const roleDef = ROLE_DEFINITIONS[p.role];
        const isWolf = p.role === 'WEREWOLF';
        const pSocket = io.sockets.sockets.get(p.socketId);
        if (pSocket) {
          pSocket.emit(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
            player: p.toPrivateJSON(),
            roleInfo: roleDef,
            werewolfTeammates: isWolf ? werewolves : [],
          });
        }
      });

      io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '🎲 角色已隨機發放！遊戲即將開始，請確認您的身分底牌...',
      });

      // 進入發牌展示階段倒數 (5 秒)，隨後進入夜晚
      startPhase(io, room, GAME_PHASES.ASSIGNING_ROLES, PHASE_DURATIONS[GAME_PHASES.ASSIGNING_ROLES], () => {
        startNightFlow(io, room);
      });
    });

    // 重開對局
    socket.on(SOCKET_EVENTS.GAME.RESTART, () => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player || !player.isHost) return;

      room.clearTimer();
      room.game = null;
      room.players.forEach(p => {
        p.resetGameState();
        p.isReady = p.isHost;
      });

      io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
      io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '🔄 房主重置了遊戲，回到房間大廳準備階段。',
      });
    });

    // ----------------------------------------------------
    // 3. 夜晚行動事件 (Night Skill Actions)
    // ----------------------------------------------------

    // 邱比特牽線
    socket.on(SOCKET_EVENTS.ACTION.CUPID_LINK, ({ target1Id, target2Id }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.NIGHT_CUPID) return;

      const result = room.game.handleCupidLink(player.id, target1Id, target2Id);
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: result.message });
      }

      // 1. 回覆邱比特
      socket.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💘 您已將【#${result.p1.seatNumber} ${result.p1.name}】與【#${result.p2.seatNumber} ${result.p2.name}】連為情侶！`,
      });

      // 2. 私密更新與通知兩位情侶
      const s1 = io.sockets.sockets.get(result.p1.socketId);
      if (s1) {
        s1.emit(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
          player: result.p1.toPrivateJSON(),
          roleInfo: ROLE_DEFINITIONS[result.p1.role],
        });
        s1.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💘 邱比特已將您與【#${result.p2.seatNumber} ${result.p2.name}】連結為生死情侶！若對方死亡，您也將殉情出局。`,
        });
      }

      const s2 = io.sockets.sockets.get(result.p2.socketId);
      if (s2) {
        s2.emit(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
          player: result.p2.toPrivateJSON(),
          roleInfo: ROLE_DEFINITIONS[result.p2.role],
        });
        s2.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💘 邱比特已將您與【#${result.p1.seatNumber} ${result.p1.name}】連結為生死情侶！若對方死亡，您也將殉情出局。`,
        });
      }
    });

    // 守衛守護
    socket.on(SOCKET_EVENTS.ACTION.GUARD_PROTECT, ({ targetId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.NIGHT_GUARD) return;

      const result = room.game.handleGuardProtect(player.id, targetId);
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: result.message });
      }

      socket.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: targetId ? `🛡️ 您選擇了守護 ${targetId} 號玩家。` : '🛡️ 今晚您選擇空守（不守護任何人）。',
      });
    });

    // 狼人選擇/切換目標
    socket.on(SOCKET_EVENTS.ACTION.WEREWOLF_SELECT, ({ targetId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.NIGHT_WEREWOLF) return;

      const result = room.game.handleWerewolfSelect(player.id, targetId);
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: result.message });
      }

      // 同步狼隊所有隊友的選票情況 (含覺醒隱狼)
      const normalWolves = room.game.getAlivePlayersByRole(ROLES.WEREWOLF);
      const activeWolves = normalWolves.length > 0
        ? normalWolves
        : room.game.getAlivePlayersByRole(ROLES.HIDDEN_WOLF);

      activeWolves.forEach(w => {
        const wSocket = io.sockets.sockets.get(w.socketId);
        if (wSocket) {
          wSocket.emit(SOCKET_EVENTS.ACTION.WEREWOLF_TEAM_SYNC, {
            votes: result.votes,
            consensusTargetId: result.consensusTargetId,
          });
        }
      });
    });

    // 預言家查驗 (嚴格限制：每晚僅限查驗 1 位存活玩家)
    socket.on(SOCKET_EVENTS.ACTION.SEER_CHECK, ({ targetId, targetIds }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.NIGHT_SEER) return;

      const tId = targetId || (Array.isArray(targetIds) ? targetIds[0] : targetIds);
      const checkRes = room.game.handleSeerCheck(player.id, tId);
      if (!checkRes.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: checkRes.message });
      }

      // 私密回傳查驗結果
      socket.emit(SOCKET_EVENTS.ACTION.SEER_RESULT, checkRes.result);
      socket.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🔮 查驗結果：【#${checkRes.result.seatNumber} ${checkRes.result.targetName}】身分為 ${checkRes.result.factionName}`,
      });
    });

    // 女巫行動
    socket.on(SOCKET_EVENTS.ACTION.WITCH_ACTION, ({ useAntidote, poisonTargetId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.NIGHT_WITCH) return;

      const result = room.game.handleWitchAction(player.id, { useAntidote, poisonTargetId });
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: result.message });
      }

      let msg = '🧪 女巫今晚選擇不使用藥劑。';
      if (useAntidote) msg = '🧪 女巫使用了【解藥】救治今晚中刀者。';
      else if (poisonTargetId) msg = '🧪 女巫使用了【毒藥】。';

      socket.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: msg });
      // 更新女巫個人私密狀態
      socket.emit(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
        player: player.toPrivateJSON(),
        roleInfo: ROLE_DEFINITIONS[ROLES.WITCH],
      });
    });

    // ----------------------------------------------------
    // 4. 白天發言與投票事件 (Day Speech & Voting)
    // ----------------------------------------------------

    // 發送聊天/發言訊息
    socket.on(SOCKET_EVENTS.ACTION.SEND_CHAT, ({ message }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !player || !message || !message.trim()) return;

      io.to(room.id).emit(SOCKET_EVENTS.ACTION.RECEIVE_CHAT, {
        senderId: player.id,
        senderName: player.name,
        seatNumber: player.seatNumber,
        isAlive: player.isAlive,
        message: message.trim(),
        timestamp: Date.now(),
      });
    });

    // 白天放逐投票
    socket.on(SOCKET_EVENTS.ACTION.CAST_VOTE, ({ targetId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.DAY_VOTING) return;

      const res = room.game.handleDayVote(player.id, targetId);
      if (!res.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: res.message });
      }

      socket.emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: targetId ? `🗳️ 您已成功投票。` : `🗳️ 您選擇了棄票。`,
      });
    });

    // 白天跳過發言投票
    socket.on(SOCKET_EVENTS.ACTION.VOTE_SKIP_DISCUSSION, ({ skip } = {}) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.DAY_DISCUSSION) return;
      if (!player || !player.isAlive) return;

      if (!room.game.discussionSkipVotes) {
        room.game.discussionSkipVotes = new Set();
      }

      if (skip === undefined) {
        if (room.game.discussionSkipVotes.has(player.id)) {
          room.game.discussionSkipVotes.delete(player.id);
        } else {
          room.game.discussionSkipVotes.add(player.id);
        }
      } else if (skip) {
        room.game.discussionSkipVotes.add(player.id);
      } else {
        room.game.discussionSkipVotes.delete(player.id);
      }

      const alivePlayers = room.game.players.filter((p) => p.isAlive);
      const aliveCount = alivePlayers.length;
      const neededVotes = Math.max(1, Math.ceil(aliveCount * (2 / 3)));
      const skipVoters = Array.from(room.game.discussionSkipVotes);
      const hasPassed = skipVoters.length >= neededVotes;

      io.to(room.id).emit(SOCKET_EVENTS.ACTION.SKIP_DISCUSSION_UPDATE, {
        skipVoters,
        aliveCount,
        neededVotes,
        hasPassed,
      });

      if (hasPassed) {
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `⏩ 投票通過！已達 2/3 存活玩家同意跳過發言（${skipVoters.length}/${neededVotes} 票），立即進入白天放逐投票！`,
        });
        room.clearTimer();
        startDayVotingFlow(io, room);
      } else {
        const isVotedNow = room.game.discussionSkipVotes.has(player.id);
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `⏩ 玩家【#${player.seatNumber} ${player.name}】${isVotedNow ? '投票同意跳過發言' : '取消了跳過發言'}（目前 ${skipVoters.length}/${neededVotes} 票，達 2/3 即跳過）`,
        });
      }
    });

    // 獵人開槍技能
    socket.on(SOCKET_EVENTS.ACTION.HUNTER_SHOOT, ({ targetId }) => {
      const { room, player } = roomManager.findPlayerBySocketId(socket.id);
      if (!room || !room.game || room.game.phase !== GAME_PHASES.HUNTER_SHOOT) return;

      const res = room.game.handleHunterShoot(player.id, targetId);
      if (!res.success) {
        return socket.emit(SOCKET_EVENTS.ROOM.ERROR, { message: res.message });
      }

      if (res.shotPlayer) {
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💥 獵人【${player.name}】開槍帶走了【${res.shotPlayer.seatNumber}號 ${res.shotPlayer.name}】！`,
        });
      } else {
        io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💥 獵人【${player.name}】選擇壓槍（不開槍）。`,
        });
      }

      // 檢查開槍後是否觸發結束
      const winCheck = room.game.checkWinCondition();
      if (winCheck.isOver) {
        return handleGameOver(io, room);
      }

      // 恢復原本該進行的階段（若夜晚獵人中刀開槍則轉入白天；若白天被票開槍則轉入下一夜）
      proceedAfterHunterShoot(io, room, room.game.pendingHunterSource);
    });
  });
}

// ----------------------------------------------------
// 5. 遊戲階段推進輔助函式 (Phase Progression Utilities)
// ----------------------------------------------------

/**
 * 啟動通用階段計時與廣播
 */
function startPhase(io, room, phaseName, duration, onComplete) {
  if (!room || !room.game) return;

  room.game.phase = phaseName;
  io.to(room.id).emit(SOCKET_EVENTS.GAME.PHASE_CHANGE, {
    phase: phaseName,
    round: room.game.round,
    duration,
  });
  io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());

  room.startTimer(
    duration,
    (remaining) => {
      // 可以在這裡廣播每秒秒數（若需要）
    },
    () => {
      if (onComplete) onComplete();
    }
  );
}

/**
 * 夜晚流程排程控制器
 */
function startNightFlow(io, room) {
  if (!room || !room.game) return;

  room.game.resetNightActions();

  // 1. 夜幕降臨（閉眼動畫 3s）
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
    message: `🌙 第 ${room.game.round} 夜降臨，天黑請閉眼...`,
  });

  startPhase(io, room, GAME_PHASES.NIGHT_START, PHASE_DURATIONS[GAME_PHASES.NIGHT_START], () => {
    // 守衛階段 (若有存活守衛)
    handleGuardTurn(io, room);
  });
}

function handleGuardTurn(io, room) {
  const aliveGuards = room.game.getAlivePlayersByRole(ROLES.GUARD);
  if (aliveGuards.length > 0) {
    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🛡️ 守衛請睜眼，選擇今晚要守護的玩家...' });
    startPhase(io, room, GAME_PHASES.NIGHT_GUARD, PHASE_DURATIONS[GAME_PHASES.NIGHT_GUARD], () => {
      handleWerewolfTurn(io, room);
    });
  } else {
    // 無守衛，直接推進狼人階段
    handleWerewolfTurn(io, room);
  }
}

function handleWerewolfTurn(io, room) {
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🐺 狼人請睜眼，商議今晚擊殺目標...' });

  startPhase(io, room, GAME_PHASES.NIGHT_WEREWOLF, PHASE_DURATIONS[GAME_PHASES.NIGHT_WEREWOLF], () => {
    handleSeerTurn(io, room);
  });
}

function handleSeerTurn(io, room) {
  const aliveSeers = room.game.getAlivePlayersByRole(ROLES.SEER);
  if (aliveSeers.length > 0) {
    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🔮 預言家請睜眼，選擇今晚要查驗身分的玩家...' });
    startPhase(io, room, GAME_PHASES.NIGHT_SEER, PHASE_DURATIONS[GAME_PHASES.NIGHT_SEER], () => {
      handleWitchTurn(io, room);
    });
  } else {
    handleWitchTurn(io, room);
  }
}

function handleWitchTurn(io, room) {
  const aliveWitches = room.game.getAlivePlayersByRole(ROLES.WITCH);
  if (aliveWitches.length > 0) {
    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🧪 女巫請睜眼，選擇是否使用藥劑...' });

    // 通知女巫今晚誰中刀 (如果解藥尚未使用)
    const witch = aliveWitches[0];
    const witchSocket = io.sockets.sockets.get(witch.socketId);
    if (witchSocket) {
      const wolfTargetId = room.game.nightActions.werewolfFinalTargetId;
      const targetPlayer = wolfTargetId ? room.players.get(wolfTargetId) : null;
      witchSocket.emit(SOCKET_EVENTS.ACTION.WITCH_NIGHT_INFO, {
        targetId: wolfTargetId,
        targetSeat: targetPlayer ? targetPlayer.seatNumber : null,
        targetName: targetPlayer ? targetPlayer.name : null,
        hasUsedAntidote: witch.hasUsedAntidote,
        hasUsedPoison: witch.hasUsedPoison,
      });
    }

    startPhase(io, room, GAME_PHASES.NIGHT_WITCH, PHASE_DURATIONS[GAME_PHASES.NIGHT_WITCH], () => {
      settleNightAndProceed(io, room);
    });
  } else {
    settleNightAndProceed(io, room);
  }
}

/**
 * 結算夜晚死亡並決定轉向白天或獵人技能
 */
function settleNightAndProceed(io, room) {
  const deaths = room.game.settleNight();

  // 檢查勝負判定
  const winCheck = room.game.checkWinCondition();
  if (winCheck.isOver) {
    return handleGameOver(io, room);
  }

  // 檢查是否有獵人中刀開槍
  if (room.game.pendingHunter) {
    triggerHunterShoot(io, room, 'NIGHT');
  } else {
    startDayFlow(io, room);
  }
}

/**
 * 白天流程排程控制器
 */
function startDayFlow(io, room) {
  // 1. 公布死訊 (5s)
  const deaths = room.game.lastNightDeaths;
  let deathMsg = '☀️ 天亮了！昨夜是【平安夜】，無人出局。';
  if (deaths.length > 0) {
    const names = deaths.map(d => `${d.player.seatNumber}號【${d.player.name}】`).join('、');
    deathMsg = `☀️ 天亮了！昨夜出局玩家：${names}。`;
  }

  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: deathMsg });
  io.to(room.id).emit(SOCKET_EVENTS.GAME.DEATH_ANNOUNCE, {
    deaths: deaths.map(d => ({
      playerId: d.player.id,
      seatNumber: d.player.seatNumber,
      name: d.player.name,
      reason: d.reason,
    })),
  });

  startPhase(io, room, GAME_PHASES.DAY_ANNOUNCE, PHASE_DURATIONS[GAME_PHASES.DAY_ANNOUNCE], () => {
    // 2. 自由討論發言階段 (60s)
    room.game.discussionSkipVotes = new Set();
    const alivePlayers = room.game.players.filter((p) => p.isAlive);
    const aliveCount = alivePlayers.length;
    const neededVotes = Math.max(1, Math.ceil(aliveCount * (2 / 3)));

    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `💬 進入白天發言階段，請玩家自由發言交流（超過 2/3 存活玩家同意即可跳過討論，需 ${neededVotes} 票）...`,
    });

    io.to(room.id).emit(SOCKET_EVENTS.ACTION.SKIP_DISCUSSION_UPDATE, {
      skipVoters: [],
      aliveCount,
      neededVotes,
      hasPassed: false,
    });

    startPhase(io, room, GAME_PHASES.DAY_DISCUSSION, PHASE_DURATIONS[GAME_PHASES.DAY_DISCUSSION], () => {
      startDayVotingFlow(io, room);
    });
  });
}

/**
 * 啟動白天放逐投票階段流程
 */
function startDayVotingFlow(io, room) {
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
    message: '🗳️ 進入白天放逐投票階段，請存活玩家進行投票！',
  });
  room.game.dayVotes.clear();

  startPhase(io, room, GAME_PHASES.DAY_VOTING, PHASE_DURATIONS[GAME_PHASES.DAY_VOTING], () => {
    settleDayVoteAndProceed(io, room);
  });
}

/**
 * 結算白天放逐投票
 */
function settleDayVoteAndProceed(io, room) {
  const result = room.game.settleDayVote();

  // 廣播票數明細
  io.to(room.id).emit(SOCKET_EVENTS.GAME.VOTE_TALLY, result);

  // 公開廣播每位玩家具體投給誰
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
    message: '🗳️【放逐投票公開開票結果】',
  });

  result.voteDetails.forEach((v) => {
    const targetText = v.isAbstain
      ? '【選擇棄票 🕊️】'
      : `➡️ 投給【#${v.targetSeat} ${v.targetName}】`;
    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `• #${v.voterSeat} ${v.voterName} ${targetText}`,
    });
  });

  // 公開最終裁決
  let voteMsg = '';
  if (result.isTie) {
    voteMsg = `⚖️ 裁決結果：最高得票玩家出現平票（${result.maxVotes} 票），無人票數大於其他所有選擇，今日無人被放逐！`;
  } else if (result.isAbstainDominant) {
    voteMsg = `🕊️ 裁決結果：最高候選人得票（${result.maxVotes} 票）未大於棄票數（${result.abstainCount} 票），今日無人被放逐！`;
  } else if (result.isIdiotSaved) {
    voteMsg = `🤡 裁決結果：【#${result.exiledPlayer.seatNumber} ${result.exiledPlayer.name}】身分為白痴，翻牌免死！但失去後續投票權。`;
  } else if (result.exiledPlayer) {
    voteMsg = `⚰️ 裁決結果：【#${result.exiledPlayer.seatNumber} ${result.exiledPlayer.name}】得票數 (${result.maxVotes} 票) 大於其他所有選擇，遭到放逐出局！`;
  } else {
    voteMsg = '🕊️ 裁決結果：全員棄票，今日無人被放逐！';
  }

  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: voteMsg });

  startPhase(io, room, GAME_PHASES.DAY_VOTE_RESULT, PHASE_DURATIONS[GAME_PHASES.DAY_VOTE_RESULT], () => {
    // 檢查勝負判定
    const winCheck = room.game.checkWinCondition();
    if (winCheck.isOver) {
      return handleGameOver(io, room);
    }

    // 檢查獵人是否被票出發動技能
    if (room.game.pendingHunter) {
      triggerHunterShoot(io, room, 'DAY_VOTE');
    } else {
      // 進入下一夜
      room.game.round++;
      startNightFlow(io, room);
    }
  });
}

/**
 * 觸發獵人開槍技能階段
 */
function triggerHunterShoot(io, room, triggerSource) {
  room.game.pendingHunterSource = triggerSource;
  const hunter = room.game.pendingHunter.hunterPlayer;
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
    message: `💥 獵人【${hunter.seatNumber}號 ${hunter.name}】出局發動技能！請選擇開槍目標...`,
  });

  const hunterSocket = io.sockets.sockets.get(hunter.socketId);
  if (hunterSocket) {
    hunterSocket.emit(SOCKET_EVENTS.ACTION.HUNTER_STATUS, { canShoot: true });
  }

  startPhase(io, room, GAME_PHASES.HUNTER_SHOOT, PHASE_DURATIONS[GAME_PHASES.HUNTER_SHOOT], () => {
    // 若超時未開槍，自動壓槍
    if (room.game.pendingHunter) {
      room.game.handleHunterShoot(hunter.id, null);
      io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💥 獵人【${hunter.name}】超時未開槍，視為壓槍。`,
      });
    }

    const winCheck = room.game.checkWinCondition();
    if (winCheck.isOver) {
      return handleGameOver(io, room);
    }

    proceedAfterHunterShoot(io, room, triggerSource);
  });
}

/**
 * 獵人開槍後續流程
 */
function proceedAfterHunterShoot(io, room, triggerSource) {
  if (triggerSource === 'NIGHT' || (room.game && room.game.phase === GAME_PHASES.NIGHT_SETTLE)) {
    startDayFlow(io, room);
  } else {
    room.game.round++;
    startNightFlow(io, room);
  }
}

/**
 * 遊戲結束廣播
 */
function handleGameOver(io, room) {
  room.clearTimer();
  room.game.phase = GAME_PHASES.GAME_OVER;

  const winData = {
    winner: room.game.winner,
    reason: room.game.winReason,
    allPlayers: Array.from(room.players.values()).map(p => p.toGameOverJSON()),
  };

  io.to(room.id).emit(SOCKET_EVENTS.GAME.OVER, winData);
  io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
    message: `🏆 遊戲結束！${room.game.winReason}`,
  });
  io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
}

/**
 * 處理玩家離開或斷線
 */
function handlePlayerLeave(io, socket) {
  const { room, player } = roomManager.findPlayerBySocketId(socket.id);
  if (!room || !player) return;

  room.removePlayer(player.id);
  roomManager.unbindSocket(socket.id);
  socket.leave(room.id);

  if (room.players.size === 0) {
    roomManager.deleteRoom(room.id);
  } else {
    io.to(room.id).emit(SOCKET_EVENTS.ROOM.STATE_UPDATE, room.toPublicJSON());
    io.to(room.id).emit(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `玩家【${player.name}】離開了房間。`,
    });
  }

  io.emit('lobby:list', roomManager.getLobbyList());
}

module.exports = setupSocketHandlers;
