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
   * @param {string|null} avatar - 頭像 URL (如 Google 頭像)
   * @param {string} authProvider - 登入驗證來源 ('GOOGLE' | 'GUEST')
   */
  constructor(id, socketId, name, seatNumber = 1, isHost = false, isBot = false, avatar = null, authProvider = 'GUEST') {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.seatNumber = seatNumber;
    this.isHost = isHost;
    this.isBot = isBot;
    this.avatar = avatar;
    this.authProvider = authProvider || (isBot ? 'BOT' : 'GUEST');
    this.isReady = isHost || isBot;

    // 遊戲內身分與狀態
    this.role = null;
    this.isAlive = true;
    this.deathReason = null; // 'WEREWOLF' | 'POISON' | 'VOTE' | 'HUNTER' | 'KNIGHT' | 'DREAM' | 'LOVER'
    this.deathRound = null;
    this.canVote = true;

    // 技能與特殊狀態
    this.hasUsedAntidote = false;
    this.hasUsedPoison = false;
    this.lastGuardedId = null;
    this.canShoot = true;
    this.isIdiotRevealed = false;

    // 新增神職專用狀態
    this.hasUsedKnightDuel = false; // 騎士決鬥
    this.isSilenced = false;        // 禁言長老禁言狀態
    this.lastSilencedId = null;     // 禁言長老上夜目標
    this.lastDreamedId = null;      // 攝夢人連續攝夢判定
    this.loverId = null;            // 邱比特情侶

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
    this.hasUsedKnightDuel = false;
    this.isSilenced = false;
    this.lastSilencedId = null;
    this.lastDreamedId = null;
    this.loverId = null;
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
      avatar: this.avatar,
      authProvider: this.authProvider,
      isReady: this.isReady,
      isAlive: this.isAlive,
      isIdiotRevealed: this.isIdiotRevealed,
      isSilenced: this.isSilenced,
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
      hasUsedKnightDuel: this.hasUsedKnightDuel,
      loverId: this.loverId,
    };
  }

  toGameOverJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
    };
  }
}
