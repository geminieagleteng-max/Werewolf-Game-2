/**
 * Google Identity Services (GIS) 與 OAuth 2.0 認證管理核心 (ES Module)
 * 封裝 Google Sign-in One-Tap、JWT 憑證解碼、帳號綁定、頭像同步與狀態持久化
 */

const STORAGE_PROFILE_KEY = 'werewolf_user_profile_v1';
const STORAGE_CLIENT_ID_KEY = 'werewolf_google_client_id_v1';

// 預設示範 Google OAuth 2.0 Client ID (使用者可隨時於介面設定中填入自訂 Client ID)
const DEFAULT_CLIENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) ||
  '612345678901-werewolfonlineexampleclientid.apps.googleusercontent.com';

export class GoogleAuthManager {
  constructor() {
    this.clientId = this.loadClientId();
    this.currentUser = this.loadProfile();
    this.listeners = new Set();
    this.isSdkLoaded = false;
    this.isInitialized = false;

    // 監聽 SDK 腳本載入狀態
    this.checkSdkReady();
  }

  loadClientId() {
    try {
      return localStorage.getItem(STORAGE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
    } catch {
      return DEFAULT_CLIENT_ID;
    }
  }

  setCustomClientId(newId) {
    if (!newId || !newId.trim()) {
      this.clientId = DEFAULT_CLIENT_ID;
      localStorage.removeItem(STORAGE_CLIENT_ID_KEY);
    } else {
      this.clientId = newId.trim();
      localStorage.setItem(STORAGE_CLIENT_ID_KEY, this.clientId);
    }
    this.isInitialized = false;
    this.initGIS();
    this.notifyListeners();
  }

  loadProfile() {
    try {
      const data = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('載入 Google 帳號檔案失敗', e);
    }

    // 預設訪客身分
    const defaultName = localStorage.getItem('werewolf_player_name') || '玩家一';
    return {
      id: `guest_${Date.now()}`,
      name: defaultName,
      email: null,
      picture: null,
      authProvider: 'GUEST', // 'GOOGLE' | 'GUEST'
      boundAt: null,
    };
  }

  saveProfile(profile) {
    this.currentUser = profile;
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
      if (profile.name) {
        localStorage.setItem('werewolf_player_name', profile.name);
      }
      if (profile.picture) {
        localStorage.setItem('werewolf_player_avatar', profile.picture);
      }
    } catch (e) {
      console.error('儲存 Google 個人檔案失敗', e);
    }
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => fn(this.currentUser, this.isGoogleLinked()));
  }

  isGoogleLinked() {
    return this.currentUser?.authProvider === 'GOOGLE' && !!this.currentUser?.email;
  }

  /**
   * 檢查並等待 Google Identity Services SDK 就緒
   */
  checkSdkReady(retries = 20) {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      this.isSdkLoaded = true;
      this.initGIS();
      return;
    }
    if (retries > 0) {
      setTimeout(() => this.checkSdkReady(retries - 1), 300);
    }
  }

  /**
   * 初始化 Google Identity Services
   */
  initGIS() {
    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response) => this.handleCredentialResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('Google Identity Services 初始化警告:', err);
      return false;
    }
  }

  /**
   * 渲染 Google 原生登入按鈕
   * @param {HTMLElement|string} targetElement 容器元素或 ID
   * @param {Object} options 按鈕樣式選項
   */
  renderGoogleButton(targetElement, options = {}) {
    const el = typeof targetElement === 'string' ? document.getElementById(targetElement) : targetElement;
    if (!el || typeof window === 'undefined' || !window.google?.accounts?.id) {
      return false;
    }

    if (!this.isInitialized) {
      this.initGIS();
    }

    try {
      window.google.accounts.id.renderButton(el, {
        type: 'standard',
        shape: 'pill',
        theme: 'filled_black',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
        width: options.width || 240,
        ...options,
      });
      return true;
    } catch (e) {
      console.warn('渲染 Google 按鈕失敗', e);
      return false;
    }
  }

  /**
   * 觸發 Google One-Tap 快速登入浮動視窗
   */
  promptOneTap() {
    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      return;
    }
    if (!this.isInitialized) {
      this.initGIS();
    }
    try {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One-tap 略過或不顯示時無須中斷
        }
      });
    } catch (e) {
      console.warn('Google One-Tap 提示失敗', e);
    }
  }

  /**
   * 安全解析 Google JWT Credential ID Token (Base64 URL decode)
   */
  decodeJwtResponse(token) {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('解析 Google JWT 失敗:', e);
      return null;
    }
  }

  /**
   * 處理 Google 認證回傳憑證
   */
  handleCredentialResponse(response) {
    if (!response || !response.credential) {
      console.warn('未收到有效 Google 憑證');
      return { success: false, message: '未收到有效 Google 憑證' };
    }

    const payload = this.decodeJwtResponse(response.credential);
    if (!payload) {
      return { success: false, message: 'Google 憑證解析失敗' };
    }

    const newProfile = {
      id: payload.sub,
      googleId: payload.sub,
      name: payload.name || payload.given_name || 'Google 使用者',
      email: payload.email,
      picture: payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${payload.sub}`,
      emailVerified: payload.email_verified,
      authProvider: 'GOOGLE',
      boundAt: Date.now(),
    };

    this.saveProfile(newProfile);
    return { success: true, profile: newProfile };
  }

  /**
   * 體驗模式 / 開發者快速測試登入 (提供豐富預設 Google 虛擬身分)
   */
  loginWithDemoGoogle(customName = '狼人殺大師') {
    const demoId = `google_demo_${Math.random().toString(36).substring(2, 9)}`;
    const avatarList = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

    const demoProfile = {
      id: demoId,
      googleId: demoId,
      name: customName || 'Google 探險者',
      email: `${(customName || 'player').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      picture: randomAvatar,
      emailVerified: true,
      authProvider: 'GOOGLE',
      boundAt: Date.now(),
    };

    this.saveProfile(demoProfile);
    return demoProfile;
  }

  /**
   * 解除 Google 帳號綁定 / 切換回訪客身分
   */
  unbindGoogleAccount() {
    const guestProfile = {
      id: `guest_${Date.now()}`,
      name: this.currentUser?.name || '新晉村民',
      email: null,
      picture: null,
      authProvider: 'GUEST',
      boundAt: null,
    };
    this.saveProfile(guestProfile);
    localStorage.removeItem('werewolf_player_avatar');
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  /**
   * 登出 Google
   */
  logout() {
    this.unbindGoogleAccount();
  }
}

export const googleAuthManager = new GoogleAuthManager();
