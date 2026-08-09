import { Room } from './Room';
import { Player } from './Player';
import { GAME_PHASES, PHASE_DURATIONS } from './gameStates';
import { ROLES, ROLE_DEFINITIONS } from './roles';
import { SOCKET_EVENTS } from './socketEvents';
import { getRandomBotName, generateBotSpeech, getBotNightAction, getBotDayVote } from './aiBots';

/**
 * 本機/房主端遊戲流程控制器 (Game Host Controller)
 * 負責掌控房間狀態、階段計時、事件廣播與 AI 行為模擬
 */
export class GameHostController {
  /**
   * @param {Object} broadcastAdapter
   * broadcastAdapter 需提供:
   * - broadcast(event, data)
   * - sendTo(playerId, event, data)
   * - addSystemLog(text)
   */
  constructor(broadcastAdapter) {
    this.adapter = broadcastAdapter;
    this.room = null;
    this.botTimers = [];
  }

  createRoom({ roomId, roomName, maxPlayers, playerName, hostId }) {
    const rId = roomId || Math.random().toString(36).substring(2, 8).toUpperCase();
    const rName = (roomName && roomName.trim()) || '狼人殺';
    const mPlayers = parseInt(maxPlayers, 10) || 6;

    this.room = new Room(rId, rName, mPlayers, hostId);
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
    const removed = this.room.removePlayer(playerId);
    if (removed) {
      this.broadcastState();
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `👋 玩家【${removed.name}】已離開房間。`,
      });
    }
  }

  toggleReady(playerId) {
    if (!this.room) return;
    this.room.toggleReady(playerId);
    this.broadcastState();
  }

  kickPlayer(targetPlayerId) {
    if (!this.room) return;
    const player = this.room.players.get(targetPlayerId);
    if (player) {
      this.room.removePlayer(targetPlayerId);
      this.adapter.sendTo(targetPlayerId, SOCKET_EVENTS.ROOM.KICKED, { message: '您已被請出房間。' });
      this.broadcastState();
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: `🚫 【${player.name}】已被請出房間。`,
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
      this.handleGuardTurn();
    });
  }

  handleGuardTurn() {
    const aliveGuards = this.room.game.getAlivePlayersByRole(ROLES.GUARD);
    if (aliveGuards.length > 0) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🛡️ 守衛請睜眼，選擇今晚要守護的玩家...' });

      // 若守衛是 AI，排程行動
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

    this.broadcastState();

    this.startPhase(GAME_PHASES.DAY_ANNOUNCE, PHASE_DURATIONS[GAME_PHASES.DAY_ANNOUNCE], () => {
      this.startDayDiscussion();
    });
  }

  startDayDiscussion() {
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: '💬 進入白天發言階段，請玩家自由陳述線索與觀點...',
    });

    // AI 機器人發言模擬
    const aliveBots = this.room.game.players.filter((p) => p.isAlive && p.isBot);
    aliveBots.forEach((bot, idx) => {
      this.scheduleBotAction(6000 + idx * 8000, () => {
        if (this.room?.game?.phase === GAME_PHASES.DAY_DISCUSSION && bot.isAlive) {
          const speech = generateBotSpeech(bot);
          this.handleSendChat(bot.id, speech);
        }
      });
    });

    this.startPhase(GAME_PHASES.DAY_DISCUSSION, PHASE_DURATIONS[GAME_PHASES.DAY_DISCUSSION], () => {
      this.startDayVoting();
    });
  }

  startDayVoting() {
    this.room.game.dayVotes.clear();
    this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: '🗳️ 進入放逐投票階段！請選出您認為最有嫌疑的玩家...',
    });

    // AI 機器人投票排程
    const aliveBots = this.room.game.players.filter((p) => p.isAlive && p.isBot && p.canVote);
    aliveBots.forEach((bot, idx) => {
      this.scheduleBotAction(3000 + idx * 1200, () => {
        if (this.room?.game?.phase === GAME_PHASES.DAY_VOTING && bot.isAlive) {
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

    if (result.isTie) {
      this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
        message: '⚖️ 投票結果平票，今日無人被放逐！',
      });
    } else if (result.exiledPlayer) {
      if (result.isIdiotSaved) {
        this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `🃏 【${result.exiledPlayer.name}】身分為【白痴】，翻牌免除放逐！`,
        });
      } else {
        this.adapter.broadcast(SOCKET_EVENTS.GAME.SYSTEM_MSG, {
          message: `🗳️ 投票結算：【${result.exiledPlayer.name}】獲得最高票被放逐出局！`,
        });
      }
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
      // 倒數結束若未開槍則視為壓槍
      if (this.room.game.pendingHunter) {
        this.handleHunterShoot(hunter.id, null);
      }
    });
  }

  handleGuardProtect(playerId, targetId) {
    if (!this.room?.game) return;
    this.room.game.handleGuardProtect(playerId, targetId);
    this.adapter.sendTo(playerId, SOCKET_EVENTS.GAME.SYSTEM_MSG, {
      message: targetId ? `🛡️ 您已選擇守護該玩家。` : '🛡️ 今晚選擇空守。',
    });
  }

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
    if (!player) return;

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
