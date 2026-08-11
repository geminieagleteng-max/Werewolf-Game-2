import React, { useState, useEffect, useRef } from 'react';
import { googleAuthManager } from '../engine/GoogleAuthManager';

export const AuthProfileModal = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState(() => googleAuthManager.currentUser);
  const [isLinked, setIsLinked] = useState(() => googleAuthManager.isGoogleLinked());
  const [clientIdInput, setClientIdInput] = useState(() => googleAuthManager.clientId);
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    const unsub = googleAuthManager.subscribe((user, linked) => {
      setCurrentUser({ ...user });
      setIsLinked(linked);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen && googleBtnRef.current) {
      googleAuthManager.renderGoogleButton(googleBtnRef.current, {
        width: 280,
        text: isLinked ? 'signin_with' : 'signup_with',
      });
    }
  }, [isOpen, isLinked]);

  if (!isOpen) return null;

  const handleSaveClientId = (e) => {
    e.preventDefault();
    googleAuthManager.setCustomClientId(clientIdInput);
    setShowConfig(false);
  };

  const handleDemoLogin = () => {
    googleAuthManager.loginWithDemoGoogle(currentUser?.name || '狼人殺大師');
  };

  const handleUnbind = () => {
    if (window.confirm('確定要解除當前 Google 帳號綁定並返回訪客模式嗎？')) {
      googleAuthManager.unbindGoogleAccount();
    }
  };

  const copyClientId = () => {
    navigator.clipboard.writeText(googleAuthManager.clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl shadow-blue-950/20 overflow-hidden flex flex-col">
        {/* 頂部 Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shadow-lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Google 帳號管理中心</span>
                {isLinked ? (
                  <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                    已綁定
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
                    訪客模式
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400">
                Google Identity Services (GIS) & OAuth 2.0
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* 內容主體 */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 個人檔案展示卡片 */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl text-zinc-400">
                  👤
                </div>
              )}
              {isLinked && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md p-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-base font-bold text-white truncate">{currentUser.name}</h4>
                {isLinked && (
                  <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono">
                    Google
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                {currentUser.email || '訪客身分 (未綁定 Email)'}
              </div>
              {currentUser.boundAt && (
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  綁定時間: {new Date(currentUser.boundAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Google 登入與綁定區塊 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                {isLinked ? '切換或重新驗證 Google 帳號' : '透過 Google Identity 一鍵登入 / 綁定'}
              </h4>
              <p className="text-xs text-zinc-400">
                綁定 Google 帳號後，您的 Google 大頭貼將同步展示在座位席、導航欄與發言訊息中。
              </p>
            </div>

            {/* Google 原生按鈕容器 */}
            <div className="flex flex-col items-center justify-center p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-3">
              <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />
              
              <div className="w-full flex items-center gap-2">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-[10px] text-zinc-500 font-medium">或</span>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>

              {/* 快速體驗 / 測試按鈕 */}
              <button
                onClick={handleDemoLogin}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>快速體驗 Google 登入（測試虛擬身分）</span>
              </button>
            </div>

            {isLinked && (
              <button
                onClick={handleUnbind}
                className="w-full py-2 bg-zinc-900 hover:bg-red-950 hover:border-red-800 border border-zinc-700 text-zinc-400 hover:text-red-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                解除 Google 帳號綁定 (切換回訪客)
              </button>
            )}
          </div>

          {/* 帳號權益說明 */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              <span className="text-lg block mb-1">🖼️</span>
              <div className="font-bold text-zinc-200 text-[11px]">專屬大頭貼</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">全場展示 Google 頭像</div>
            </div>
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              <span className="text-lg block mb-1">🛡️</span>
              <div className="font-bold text-zinc-200 text-[11px]">成就戰績保存</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">永久綁定榮譽成就</div>
            </div>
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              <span className="text-lg block mb-1">⚡</span>
              <div className="font-bold text-zinc-200 text-[11px]">一鍵免密登入</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">OAuth 2.0 安全驗證</div>
            </div>
          </div>

          {/* Google OAuth 2.0 Client ID 進階設定 (折疊) */}
          <div className="border-t border-zinc-800 pt-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-between w-full cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>⚙️</span>
                <span>Google OAuth 2.0 Client ID 設定</span>
              </span>
              <span className="text-[10px] text-zinc-500">{showConfig ? '收起 ▲' : '展開 ▼'}</span>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveClientId} className="mt-3 p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    自訂 Web Client ID (來自 Google Cloud Console)
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="例: 123456789-xxx.apps.googleusercontent.com"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copyClientId}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {copied ? '✓ 已複製當前 ID' : '📋 複製當前 ID'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    儲存 Client ID
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthProfileModal;
