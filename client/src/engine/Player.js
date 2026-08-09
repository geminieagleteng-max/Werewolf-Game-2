import { ROLES } from './roles';

/**
 * 玩家資料模型 (ES Module)
 */
export class Player {
  /**
   * @param {string} id - 玩家唯一識別碼
   * @param {string} socketId - 當前 Socket / Peer 連線 ID
   * @param {string} name - 玩家名稱
   * @param {number} seatNumber - 座位號碼 (1 ~ N)
   * @param {boolean} isHost - 是否為房主
   * @param {boolean} isBot - 是否為 AI 機器人
   */
  constructor(id, socketId, name, seatNumber = 1, isHost = false, isBot = false) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.seatNumber = seatNumber;
    this.isHost = isHost;
    this.isBot = isBot;
    this.isReady = isHost || isBot; // 機器人預設已準備

    // 遊戲內身分與狀態
    this.role = null;
    this.isAlive = true;
    this.deathReason = null; // 'WEREWOLF' | 'POISON' | 'VOTE' | 'HUNTER'
    this.deathRound = null;
    this.canVote = true;

    // 女巫技能專用狀態
    this.hasUsedAntidote = false;
    this.hasUsedPoison = false;

    // 守衛技能專用狀態
    this.lastGuardedId = null;

    // 獵人技能專用狀態
    this.canShoot = true;

    // 白痴技能專用狀態
    this.isIdiotRevealed = false;

    // 連線狀態
    this.connected = true;
  }

  resetGameState() {
    this.role = null;
    this.isAlive = true;
    this.deathReason = null;
    this.deathRound = null;
    this.canVote = true;
    this.hasUsedAntidote = false;
    this.hasUsedPoison = false;
    this.lastGuardedId = null;
    this.canShoot = true;
    this.isIdiotRevealed = false;
    this.isReady = this.isHost || this.isBot;
  }

  kill(reason, round) {
    this.isAlive = false;
    this.deathReason = reason;
    this.deathRound = round;
    this.canVote = false;

    if (reason === 'POISON') {
      this.canShoot = false;
    }
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      seatNumber: this.seatNumber,
      isHost: this.isHost,
      isBot: this.isBot,
      isReady: this.isReady,
      isAlive: this.isAlive,
      isIdiotRevealed: this.isIdiotRevealed,
      canVote: this.canVote,
      deathReason: this.deathReason,
      connected: this.connected,
    };
  }

  toPrivateJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
      hasUsedAntidote: this.hasUsedAntidote,
      hasUsedPoison: this.hasUsedPoison,
      lastGuardedId: this.lastGuardedId,
      canShoot: this.canShoot,
    };
  }

  toGameOverJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
    };
  }
}
