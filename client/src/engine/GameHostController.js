import { Room } from './Room';
import { Player } from './Player';
import { Game } from './Game';
import { ROLES, ROLE_DEFINITIONS } from './roles';
import { GAME_PHASES, PHASE_DURATIONS } from './gameStates';
import { SOCKET_EVENTS } from './socketEvents';
import { getRandomBotName, generateBotSpeech, getBotNightAction, getBotDayVote } from './aiBots';

/**
 * 房主遊戲裁判控制器 (GameHostController)
 * 負責處理房間管理、發牌、狀態機推進、計時器管理、AI 機器人排程與廣播派發
 */
export class GameHostController {
  /**
   * @param {Object} broadcastAdapter
   * @param {Function} broadcastAdapter.broadcast - 廣播給所有人 (event, data)
   * @param {Function} broadcastAdapter.sendTo - 傳送給特定玩家 (playerId, event, data)
   */
  constructor(broadcastAdapter) {
    this.adapter = broadcastAdapter;
    this.room = null;
    this.botTimers = [];
    this.discussionSkipVotes = new Set();
  }

  createRoom({ roomId, roomName, maxPlayers, roleConfig, playerName, hostId }) {
    const rId = roomId || Math.random().toString(36).substring(2, 8).toUpperCase();
    const rName = (roomName && roomName.trim()) || '狼人殺';
    const mPlayers = (roleConfig && roleConfig.length) ? roleConfig.length : (parseInt(maxPlayers, 10) || 6);

    this.room = new Room(rId, rName, mPlayers, hostId);
    if (roleConfig && Array.isArray(roleConfig) && roleConfig.length >= 3) {
      this.room.roleConfig = [...roleConfig];
      this.room.maxPlayers = roleConfig.length;
    }

    const hostPlayer = new Player(hostId, hostId, playerName || '房主', 1, true, false);
    this.room.addPlayer(hostPlayer);

    this.broadcastState();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `🏰 房間【${this.room.name}】（代碼：${this.room.id}）已成功建立！`,
    });

    return { room: this.room, player: hostPlayer };
  }

  addRemotePlayer(playerId, playerName) {
    if (!this.room) return { success: false, message: '房間尚未建立' };

    const pName = playerName || `玩家_${playerId.slice(0, 4)}`;
    const player = new Player(playerId, playerId, pName, 1, false, false);
    const res = this.room.addPlayer(player);

    if (!res.success) {
      return res;
    }

    this.broadcastState();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `👋 玩家【${player.name}】加入了房間（#${player.seatNumber} 號位）。`,
    });

    return { success: true, player };
  }

  addBotPlayer() {
    if (!this.room) return false;
    if (this.room.players.size >= this.room.maxPlayers) return false;

    const existingNames = Array.from(this.room.players.values()).map((p) => p.name);
    const botName = getRandomBotName(existingNames);
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const botPlayer = new Player(botId, botId, botName, 1, false, true);

    const res = this.room.addPlayer(botPlayer);
    if (res.success) {
      this.broadcastState();
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🤖 【${botPlayer.name}】已加入房間（#${botPlayer.seatNumber} 號位）。`,
      });
      return true;
    }
    return false;
  }

  fillWithBots() {
    if (!this.room) return;
    while (this.room.players.size < this.room.maxPlayers) {
      this.addBotPlayer();
    }
  }

  removePlayer(playerId) {
    if (!this.room) return;
    const p = this.room.players.get(playerId);
    if (p) {
      this.room.removePlayer(playerId);
      this.broadcastState();
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🚪 玩家【${p.name}】離開了房間。`,
      });
    }
  }

  toggleReady(playerId) {
    if (!this.room) return;
    const p = this.room.players.get(playerId);
    if (p && !p.isHost) {
      p.isReady = !p.isReady;
      this.broadcastState();
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `${p.isReady ? '✅' : '⏳'} 玩家【${p.name}】${p.isReady ? '已就緒' : '取消就緒'}。`,
      });
    }
  }

  startGame() {
    if (!this.room) return;
    const check = this.room.canStartGame();
    if (!check.canStart) {
      this.adapter.broadcast(SOCKET_EVENTS.ROOM.ERROR, { message: check.message });
      return;
    }

    const game = this.room.startGame();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.STARTED);
    this.broadcastState();

    // 私密分發個人身分卡
    this.room.players.forEach((p) => {
      const roleDef = ROLE_DEFINITIONS[p.role];
      this.adapter.sendTo(p.id, SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
        player: p.toPrivateJSON(),
        roleInfo: roleDef,
      });
    });

    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: '🎲 身分牌已分發完成！請確認您的底牌與專屬技能說明...',
    });

    // 進入發牌階段 (5 秒) 後切入夜晚
    this.startPhase(GAME_PHASES.ASSIGNING_ROLES, PHASE_DURATIONS[GAME_PHASES.ASSIGNING_ROLES], () => {
      this.startNightFlow();
    });
  }

  restartGame() {
    if (!this.room) return;
    this.clearBotTimers();
    this.room.clearTimer();
    this.discussionSkipVotes = new Set();
    this.room.game = null;
    this.room.players.forEach((p) => {
      p.resetGameState();
    });

    this.broadcastState();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: '🔄 房主重置了遊戲，回到大廳準備階段。',
    });
  }

  startPhase(phaseName, duration, onComplete) {
    if (!this.room || !this.room.game) return;

    this.room.game.phase = phaseName;
    this.adapter.broadcast(SOCKET_EVENTS.GAME.PHASE_CHANGE, {
      phase: phaseName,
      round: this.room.game.round,
      duration,
    });
    this.broadcastState();

    this.room.startTimer(
      duration,
      (remaining) => {},
      () => {
        if (onComplete) onComplete();
      }
    );
  }

  startNightFlow() {
    if (!this.room || !this.room.game) return;
    this.room.game.resetNightActions();

    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `🌙 第 ${this.room.game.round} 夜降臨，天黑請閉眼...`,
    });

    this.startPhase(GAME_PHASES.NIGHT_START, PHASE_DURATIONS[GAME_PHASES.NIGHT_START], () => {
      this.handleCupidTurn();
    });
  }

  // 1. 邱比特 (首夜)
  handleCupidTurn() {
    const aliveCupids = this.room.game.getAlivePlayersByRole(ROLES.CUPID);
    if (this.room.game.round === 1 && aliveCupids.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '💘 邱比特請睜眼，選擇兩名玩家連為【情侶】...' });

      aliveCupids.filter((c) => c.isBot).forEach((bot) => {
        this.scheduleBotAction(3000, () => {
          const act = getBotNightAction(bot, this.room.game);
          if (act) this.handleCupidLink(bot.id, act.target1Id, act.target2Id);
        });
      });

      this.startPhase(GAME_PHASES.NIGHT_CUPID, PHASE_DURATIONS[GAME_PHASES.NIGHT_CUPID], () => {
        this.handleDreamcatcherTurn();
      });
    } else {
      this.handleDreamcatcherTurn();
    }
  }

  // 2. 攝夢人
  handleDreamcatcherTurn() {
    const aliveDreamers = this.room.game.getAlivePlayersByRole(ROLES.DREAMCATCHER);
    if (aliveDreamers.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '💤 攝夢人請睜眼，選擇今晚要攝夢的玩家...' });

      aliveDreamers.filter((d) => d.isBot).forEach((bot) => {
        this.scheduleBotAction(3000, () => {
          const act = getBotNightAction(bot, this.room.game);
          if (act) this.handleDreamcatcherDream(bot.id, act.targetId);
        });
      });

      this.startPhase(GAME_PHASES.NIGHT_DREAMCATCHER, PHASE_DURATIONS[GAME_PHASES.NIGHT_DREAMCATCHER], () => {
        this.handleGuardTurn();
      });
    } else {
      this.handleGuardTurn();
    }
  }

  // 3. 守衛
  handleGuardTurn() {
    const aliveGuards = this.room.game.getAlivePlayersByRole(ROLES.GUARD);
    if (aliveGuards.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🛡️ 守衛請睜眼，選擇今晚要守護的玩家...' });

      aliveGuards.filter((g) => g.isBot).forEach((bot) => {
        this.scheduleBotAction(3000, () => {
          const act = getBotNightAction(bot, this.room.game);
          if (act) this.handleGuardProtect(bot.id, act.targetId);
        });
      });

      this.startPhase(GAME_PHASES.NIGHT_GUARD, PHASE_DURATIONS[GAME_PHASES.NIGHT_GUARD], () => {
        this.handleWerewolfTurn();
      });
    } else {
      this.handleWerewolfTurn();
    }
  }

  // 4. 狼人
  handleWerewolfTurn() {
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🐺 狼人請睜眼，商議今晚擊殺目標...' });

    const wolves = this.room.game.getAlivePlayersByRole(ROLES.WEREWOLF);
    wolves.filter((w) => w.isBot).forEach((bot, idx) => {
      this.scheduleBotAction(3000 + idx * 1500, () => {
        const act = getBotNightAction(bot, this.room.game);
        if (act) this.handleWerewolfSelect(bot.id, act.targetId);
      });
    });

    this.startPhase(GAME_PHASES.NIGHT_WEREWOLF, PHASE_DURATIONS[GAME_PHASES.NIGHT_WEREWOLF], () => {
      this.handleSeerTurn();
    });
  }

  // 5. 預言家
  handleSeerTurn() {
    const aliveSeers = this.room.game.getAlivePlayersByRole(ROLES.SEER);
    if (aliveSeers.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🔮 預言家請睜眼，選擇今晚要查驗身分的玩家...' });

      aliveSeers.filter((s) => s.isBot).forEach((bot) => {
        this.scheduleBotAction(3000, () => {
          const act = getBotNightAction(bot, this.room.game);
          if (act) this.handleSeerCheck(bot.id, act.targetId);
        });
      });

      this.startPhase(GAME_PHASES.NIGHT_SEER, PHASE_DURATIONS[GAME_PHASES.NIGHT_SEER], () => {
        this.handleWitchTurn();
      });
    } else {
      this.handleWitchTurn();
    }
  }

  // 6. 女巫
  handleWitchTurn() {
    const aliveWitches = this.room.game.getAlivePlayersByRole(ROLES.WITCH);
    if (aliveWitches.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🧪 女巫請睜眼，選擇是否使用藥劑...' });

      const witch = aliveWitches[0];
      const wolfTargetId = this.room.game.nightActions.werewolfFinalTargetId;
      const targetPlayer = wolfTargetId ? this.room.players.get(wolfTargetId) : null;

      this.adapter.sendTo(witch.id, SOCKET_EVENTS.ACTION.WITCH_NIGHT_INFO, {
        targetId: wolfTargetId,
        targetSeat: targetPlayer ? targetPlayer.seatNumber : null,
        targetName: targetPlayer ? targetPlayer.name : null,
        hasUsedAntidote: witch.hasUsedAntidote,
        hasUsedPoison: witch.hasUsedPoison,
      });

      if (witch.isBot) {
        this.scheduleBotAction(3500, () => {
          const act = getBotNightAction(witch, this.room.game);
          if (act) this.handleWitchAction(witch.id, act);
        });
      }

      this.startPhase(GAME_PHASES.NIGHT_WITCH, PHASE_DURATIONS[GAME_PHASES.NIGHT_WITCH], () => {
        this.handleSilencerTurn();
      });
    } else {
      this.handleSilencerTurn();
    }
  }

  // 7. 禁言長老
  handleSilencerTurn() {
    const aliveSilencers = this.room.game.getAlivePlayersByRole(ROLES.SILENCER);
    if (aliveSilencers.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🤐 禁言長老請睜眼，指定明日禁言目標...' });

      aliveSilencers.filter((s) => s.isBot).forEach((bot) => {
        this.scheduleBotAction(3000, () => {
          const act = getBotNightAction(bot, this.room.game);
          if (act) this.handleSilencerSilence(bot.id, act.targetId);
        });
      });

      this.startPhase(GAME_PHASES.NIGHT_SILENCER, PHASE_DURATIONS[GAME_PHASES.NIGHT_SILENCER], () => {
        this.settleNightAndProceed();
      });
    } else {
      this.settleNightAndProceed();
    }
  }

  settleNightAndProceed() {
    const deaths = this.room.game.settleNight();
    const winCheck = this.room.game.checkWinCondition();
    if (winCheck.isOver) {
      return this.handleGameOver();
    }

    if (this.room.game.pendingHunter) {
      this.handleHunterTurn();
    } else {
      this.startDayFlow(deaths);
    }
  }

  startDayFlow(nightDeaths) {
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `☀️ 天亮了！公佈昨夜情況...`,
    });

    if (nightDeaths.length === 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '🕊️ 昨夜是個平安夜，無人倒牌出局！',
      });
    } else {
      const deathDetails = nightDeaths
        .map((d) => `#${d.player.seatNumber} 號【${d.player.name}】`)
        .join('、');
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `☠️ 昨夜倒牌出局的玩家有：${deathDetails}。`,
      });
    }

    // 提示禁言玩家
    const silencedPlayers = this.room.game.players.filter((p) => p.isAlive && p.isSilenced);
    silencedPlayers.forEach((p) => {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🤐 【#${p.seatNumber} ${p.name}】今日被禁言，無法在聊天室發言（但保有放逐投票權）！`,
      });
    });

    this.broadcastState();

    this.startPhase(GAME_PHASES.DAY_ANNOUNCE, PHASE_DURATIONS[GAME_PHASES.DAY_ANNOUNCE], () => {
      this.startDayDiscussion();
    });
  }

  startDayDiscussion() {
    this.discussionSkipVotes = new Set();
    const alivePlayers = Array.from(this.room.players.values()).filter((p) => p.isAlive);
    const aliveCount = alivePlayers.length;
    const neededVotes = Math.max(1, Math.ceil(aliveCount * (2 / 3)));

    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `💬 進入白天發言階段，請玩家自由發言（超過 2/3 存活玩家同意即可跳過討論，需 ${neededVotes} 票）...`,
    });

    this.adapter.broadcast(SOCKET_EVENTS.ACTION.SKIP_DISCUSSION_UPDATE, {
      skipVoters: [],
      aliveCount,
      neededVotes,
      hasPassed: false,
    });

    // AI 機器人發言模擬與評估跳過
    const aliveBots = this.room.game.players.filter((p) => p.isAlive && p.isBot && !p.isSilenced);
    aliveBots.forEach((bot, idx) => {
      this.scheduleBotAction(6000 + idx * 8000, () => {
        if (this.room?.game?.phase === GAME_PHASES.DAY_DISCUSSION && bot.isAlive && !bot.isSilenced) {
          const speech = generateBotSpeech(bot);
          this.handleSendChat(bot.id, speech);

          // 機器人在說完話後有一定機率主動同意跳過發言
          this.scheduleBotAction(3000, () => {
            if (this.room?.game?.phase === GAME_PHASES.DAY_DISCUSSION && bot.isAlive) {
              if (Math.random() > 0.4 || this.discussionSkipVotes.size > 0) {
                this.handleVoteSkipDiscussion(bot.id, true);
              }
            }
          });
        }
      });
    });

    this.startPhase(GAME_PHASES.DAY_DISCUSSION, PHASE_DURATIONS[GAME_PHASES.DAY_DISCUSSION], () => {
      this.startDayVoting();
    });
  }

  handleVoteSkipDiscussion(playerId, skip) {
    if (!this.room?.game || this.room.game.phase !== GAME_PHASES.DAY_DISCUSSION) return;
    const player = this.room.players.get(playerId);
    if (!player || !player.isAlive) return;

    if (skip === undefined) {
      if (this.discussionSkipVotes.has(playerId)) {
        this.discussionSkipVotes.delete(playerId);
      } else {
        this.discussionSkipVotes.add(playerId);
      }
    } else if (skip) {
      this.discussionSkipVotes.add(playerId);
    } else {
      this.discussionSkipVotes.delete(playerId);
    }

    const alivePlayers = Array.from(this.room.players.values()).filter((p) => p.isAlive);
    const aliveCount = alivePlayers.length;
    const neededVotes = Math.max(1, Math.ceil(aliveCount * (2 / 3)));
    const skipVoters = Array.from(this.discussionSkipVotes);
    const hasPassed = skipVoters.length >= neededVotes;

    this.adapter.broadcast(SOCKET_EVENTS.ACTION.SKIP_DISCUSSION_UPDATE, {
      skipVoters,
      aliveCount,
      neededVotes,
      hasPassed,
    });

    if (hasPassed) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `⏩ 投票通過！已達 2/3 存活玩家同意跳過發言（${skipVoters.length}/${neededVotes} 票），立即進入白天放逐投票！`,
      });
      this.clearBotTimers();
      this.room.clearTimer();
      this.startDayVoting();
    } else {
      const isVotedNow = this.discussionSkipVotes.has(playerId);
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `⏩ 玩家【#${player.seatNumber} ${player.name}】${isVotedNow ? '投票同意跳過發言' : '取消了跳過發言'}（目前 ${skipVoters.length}/${neededVotes} 票，達 2/3 即跳過）`,
      });
    }
  }

  startDayVoting() {
    this.room.game.dayVotes.clear();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: '🗳️ 進入放逐投票階段！請選出您認為最有嫌疑的玩家...',
    });

    // AI 機器人投票排程
    const aliveBots = this.room.game.players.filter((p) => p.isAlive && p.isBot && p.canVote);
    aliveBots.forEach((bot, idx) => {
      this.scheduleBotAction(2000 + idx * 1000, () => {
        if (this.room?.game?.phase === GAME_PHASES.DAY_VOTING && bot.isAlive && bot.canVote) {
          const targetId = getBotDayVote(bot, this.room.game);
          this.handleDayVote(bot.id, targetId);
        }
      });
    });

    this.startPhase(GAME_PHASES.DAY_VOTING, PHASE_DURATIONS[GAME_PHASES.DAY_VOTING], () => {
      this.settleDayVoting();
    });
  }

  settleDayVoting() {
    const result = this.room.game.settleDayVote();

    this.adapter.broadcast(SOCKET_EVENTS.GAME.VOTE_TALLY, {
      voteDetails: result.voteDetails,
      maxVotes: result.maxVotes,
      isTie: result.isTie,
      exiledPlayer: result.exiledPlayer,
      isIdiotSaved: result.isIdiotSaved,
    });

    if (result.isTie) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '⚖️ 最高得票數平票，今日無人被放逐！',
      });
    } else if (result.isIdiotSaved) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🤡 【${result.exiledPlayer.name}】身分為白痴，翻牌免死！但失去後續投票權。`,
      });
    } else if (result.exiledPlayer) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `⚰️ 投票結果：【#${result.exiledPlayer.seatNumber} ${result.exiledPlayer.name}】獲得最高票 (${result.maxVotes} 票) 被放逐出局！`,
      });
    } else {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '🕊️ 全員棄票，今日無人被放逐！',
      });
    }

    this.broadcastState();

    const winCheck = this.room.game.checkWinCondition();
    if (winCheck.isOver) {
      return this.handleGameOver();
    }

    if (result.hasHunterSkill && this.room.game.pendingHunter) {
      this.handleHunterTurn();
    } else {
      this.startPhase(GAME_PHASES.DAY_VOTE_RESULT, PHASE_DURATIONS[GAME_PHASES.DAY_VOTE_RESULT], () => {
        this.room.game.round++;
        this.startNightFlow();
      });
    }
  }

  handleHunterTurn() {
    const hunter = this.room.game.pendingHunter.hunterPlayer;
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `💥 獵人【${hunter.name}】已出局，發動開槍技能！`,
    });

    if (hunter.isBot) {
      this.scheduleBotAction(4000, () => {
        const aliveOthers = this.room.game.players.filter((p) => p.isAlive && p.id !== hunter.id);
        const target = aliveOthers.length > 0 ? aliveOthers[Math.floor(Math.random() * aliveOthers.length)] : null;
        this.handleHunterShoot(hunter.id, target ? target.id : null);
      });
    }

    this.startPhase(GAME_PHASES.HUNTER_SHOOT, PHASE_DURATIONS[GAME_PHASES.HUNTER_SHOOT], () => {
      if (this.room.game.pendingHunter) {
        this.handleHunterShoot(hunter.id, null);
      }
    });
  }

  // 邱比特連線操作
  handleCupidLink(playerId, target1Id, target2Id) {
    if (!this.room?.game) return;
    const res = this.room.game.handleCupidLink(playerId, target1Id, target2Id);
    if (res.success) {
      this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💘 您已將【${res.p1.name}】與【${res.p2.name}】連為情侶！`,
      });
      this.adapter.sendTo(res.p1.id, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💘 邱比特已將您與【#${res.p2.seatNumber} ${res.p2.name}】連為生死情侶！`,
      });
      this.adapter.sendTo(res.p2.id, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💘 邱比特已將您與【#${res.p1.seatNumber} ${res.p1.name}】連為生死情侶！`,
      });
    }
  }

  // 攝夢人入夢操作
  handleDreamcatcherDream(playerId, targetId) {
    if (!this.room?.game) return;
    this.room.game.handleDreamcatcherDream(playerId, targetId);
    const target = targetId ? this.room.players.get(targetId) : null;
    this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: target ? `💤 今晚選擇攝夢【#${target.seatNumber} ${target.name}】。` : '💤 今晚選擇空夢。',
    });
  }

  // 守衛守護
  handleGuardProtect(playerId, targetId) {
    if (!this.room?.game) return;
    this.room.game.handleGuardProtect(playerId, targetId);
    this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: targetId ? `🛡️ 您已選擇守護該玩家。` : '🛡️ 今晚選擇空守。',
    });
  }

  // 狼人選人
  handleWerewolfSelect(playerId, targetId) {
    if (!this.room?.game) return;
    const res = this.room.game.handleWerewolfSelect(playerId, targetId);
    if (!res.success) return;

    const werewolves = this.room.game.getAlivePlayersByRole(ROLES.WEREWOLF);
    werewolves.forEach((w) => {
      this.adapter.sendTo(w.id, SOCKET_EVENTS.ACTION.WEREWOLF_TEAM_SYNC, {
        votes: res.votes,
        consensusTargetId: res.consensusTargetId,
      });
    });
  }

  // 預言家查驗
  handleSeerCheck(playerId, targetId) {
    if (!this.room?.game) return;
    const res = this.room.game.handleSeerCheck(playerId, targetId);
    if (res.success) {
      this.adapter.sendTo(playerId, SOCKET_EVENTS.ACTION.SEER_RESULT, res.result);
      this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🔮 查驗結果：【${res.result.seatNumber}號 ${res.result.targetName}】身分為 ${res.result.factionName}`,
      });
    }
  }

  // 女巫行動
  handleWitchAction(playerId, { useAntidote, poisonTargetId }) {
    if (!this.room?.game) return;
    const res = this.room.game.handleWitchAction(playerId, { useAntidote, poisonTargetId });
    if (res.success) {
      const player = this.room.players.get(playerId);
      this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.ROLE_ASSIGNED, {
        player: player.toPrivateJSON(),
        roleInfo: ROLE_DEFINITIONS[ROLES.WITCH],
      });
      this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: useAntidote ? '🧪 使用了解藥。' : poisonTargetId ? '🧪 使用了毒藥。' : '🧪 今晚未使用藥劑。',
      });
    }
  }

  // 禁言長老禁言
  handleSilencerSilence(playerId, targetId) {
    if (!this.room?.game) return;
    this.room.game.handleSilencerSilence(playerId, targetId);
    const target = targetId ? this.room.players.get(targetId) : null;
    this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: target ? `🤐 今晚指定禁言【#${target.seatNumber} ${target.name}】。` : '🤐 今晚選擇空過。',
    });
  }

  // 騎士決鬥 (白天階段)
  handleKnightDuel(playerId, targetId) {
    if (!this.room?.game || this.room.game.phase !== GAME_PHASES.DAY_DISCUSSION) return;
    const res = this.room.game.handleKnightDuel(playerId, targetId);
    if (!res.success) return;

    this.clearBotTimers();
    this.room.clearTimer();

    const knight = this.room.players.get(playerId);
    const target = this.room.players.get(targetId);

    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: `⚔️ 騎士【${knight.name}】拔劍翻牌，向【#${target.seatNumber} ${target.name}】發動決鬥！`,
    });

    if (res.isWolf) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `⚔️ 決鬥成功！【#${target.seatNumber} ${target.name}】身分確為狼人，當場被騎士斬殺！直接進入黑夜！`,
      });
    } else {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `💔 決鬥失敗！【#${target.seatNumber} ${target.name}】為好人玩家，騎士【${knight.name}】以死謝罪出局！白天發言繼續。`,
      });
    }

    this.broadcastState();

    this.startPhase(GAME_PHASES.KNIGHT_DUEL, PHASE_DURATIONS[GAME_PHASES.KNIGHT_DUEL], () => {
      const winCheck = this.room.game.checkWinCondition();
      if (winCheck.isOver) {
        return this.handleGameOver();
      }

      if (res.isWolf) {
        // 狼人被殺直接入夜
        this.room.game.round++;
        this.startNightFlow();
      } else {
        // 騎士死亡繼續發言
        this.startDayDiscussion();
      }
    });
  }

  handleDayVote(playerId, targetId) {
    if (!this.room?.game) return;
    this.room.game.handleDayVote(playerId, targetId);
  }

  handleHunterShoot(playerId, targetId) {
    if (!this.room?.game) return;
    const res = this.room.game.handleHunterShoot(playerId, targetId);
    if (res.success) {
      const hunter = this.room.players.get(playerId);
      if (res.shotPlayer) {
        this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💥 獵人【${hunter?.name}】開槍帶走了【#${res.shotPlayer.seatNumber} ${res.shotPlayer.name}】！`,
        });
      } else {
        this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `💥 獵人【${hunter?.name}】選擇壓槍（不開槍）。`,
        });
      }

      this.broadcastState();

      const winCheck = this.room.game.checkWinCondition();
      if (winCheck.isOver) {
        return this.handleGameOver();
      }

      this.room.game.round++;
      this.startNightFlow();
    }
  }

  handleSendChat(senderId, message) {
    if (!this.room || !message) return;
    const player = this.room.players.get(senderId);
    if (!player || player.isSilenced) return; // 禁言玩家無法發言

    this.adapter.broadcast(SOCKET_EVENTS.ACTION.RECEIVE_CHAT, {
      senderId: player.id,
      senderName: player.name,
      seatNumber: player.seatNumber,
      isAlive: player.isAlive,
      message: message.trim(),
      timestamp: Date.now(),
    });
  }

  handleGameOver() {
    this.clearBotTimers();
    const data = {
      winner: this.room.game.winner,
      reason: this.room.game.winReason,
      allPlayers: Array.from(this.room.players.values()).map((p) => p.toGameOverJSON()),
    };

    this.adapter.broadcast(SOCKET_EVENTS.GAME.OVER, data);
    this.broadcastState();
  }

  scheduleBotAction(delayMs, fn) {
    const t = setTimeout(fn, delayMs);
    this.botTimers.push(t);
  }

  clearBotTimers() {
    this.botTimers.forEach((t) => clearTimeout(t));
    this.botTimers = [];
  }

  broadcastState() {
    if (!this.room) return;
    this.adapter.broadcast(SOCKET_EVENTS.ROOM.STATE_UPDATE, this.room.toPublicJSON());
  }
}
