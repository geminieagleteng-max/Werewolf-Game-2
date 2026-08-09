import { Game } from './Game';
import { DEFAULT_ROLE_CONFIGS } from './roles';
import { GAME_PHASES } from './gameStates';

/**
 * 房間資料與遊戲生命週期管理模型 (ES Module)
 */
export class Room {
  /**
   * @param {string} id - 房間代碼
   * @param {string} name - 房間名稱
   * @param {number} maxPlayers - 最大容納玩家數
   * @param {string} hostId - 初始房主 ID
   */
  constructor(id, name = '狼人殺房間', maxPlayers = 6, hostId = null) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.hostId = hostId;
    this.roleConfig = DEFAULT_ROLE_CONFIGS[maxPlayers] || DEFAULT_ROLE_CONFIGS[6];

    /** @type {Map<string, import('./Player').Player>} */
    this.players = new Map();

    /** @type {Game | null} */
    this.game = null;

    this.phaseInterval = null;
    this.timeRemaining = 0;
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: '房間已滿員！' };
    }

    if (this.game && this.game.phase !== GAME_PHASES.WAITING && this.game.phase !== GAME_PHASES.GAME_OVER) {
      return { success: false, message: '遊戲進行中，無法加入！' };
    }

    const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.seatNumber));
    let seat = 1;
    while (occupiedSeats.has(seat) && seat <= this.maxPlayers) {
      seat++;
    }
    player.seatNumber = seat;

    if (this.players.size === 0) {
      this.hostId = player.id;
      player.isHost = true;
      player.isReady = true;
    } else {
      player.isHost = (player.id === this.hostId);
    }

    this.players.set(player.id, player);
    return { success: true, player };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    this.players.delete(playerId);

    if (this.hostId === playerId && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      this.hostId = nextHost.id;
      nextHost.isHost = true;
      nextHost.isReady = true;
    }

    if (this.players.size === 0) {
      this.clearTimer();
    }

    return player;
  }

  toggleReady(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    if (player.isHost) return true;
    player.isReady = !player.isReady;
    return player.isReady;
  }

  updateConfig({ name, maxPlayers, roleConfig }) {
    if (name) this.name = name;
    if (maxPlayers && maxPlayers >= 6 && maxPlayers <= 9) {
      this.maxPlayers = maxPlayers;
      this.roleConfig = roleConfig || DEFAULT_ROLE_CONFIGS[maxPlayers];
    } else if (roleConfig) {
      this.roleConfig = roleConfig;
    }
  }

  canStartGame() {
    if (this.players.size !== this.maxPlayers) {
      return { canStart: false, message: `目前人數 (${this.players.size}/${this.maxPlayers}) 不足！` };
    }

    for (const player of this.players.values()) {
      if (!player.isHost && !player.isReady) {
        return { canStart: false, message: `玩家【${player.name}】尚未準備！` };
      }
    }

    return { canStart: true };
  }

  startGame() {
    const playersList = Array.from(this.players.values());
    this.game = new Game(this.id, playersList, this.roleConfig);
    this.game.assignRoles();
    return this.game;
  }

  startTimer(seconds, onTick, onTimeout) {
    this.clearTimer();
    this.timeRemaining = seconds;

    if (onTick) onTick(this.timeRemaining);

    this.phaseInterval = setInterval(() => {
      this.timeRemaining--;
      if (onTick) onTick(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.clearTimer();
        if (onTimeout) onTimeout();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.phaseInterval) {
      clearInterval(this.phaseInterval);
      this.phaseInterval = null;
    }
    this.timeRemaining = 0;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      maxPlayers: this.maxPlayers,
      hostId: this.hostId,
      playerCount: this.players.size,
      roleConfig: this.roleConfig,
      players: Array.from(this.players.values()).map(p => p.toPublicJSON()),
      gamePhase: this.game ? this.game.phase : GAME_PHASES.WAITING,
      gameRound: this.game ? this.game.round : 0,
      timeRemaining: this.timeRemaining,
    };
  }
}
