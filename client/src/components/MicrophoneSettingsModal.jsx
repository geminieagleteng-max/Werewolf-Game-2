import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { voiceManager } from '../engine/VoiceManager';

export const MicrophoneSettingsModal = ({ isOpen, onClose }) => {
  const { isMicMuted, toggleMic, isMicInitialized, initMic } = useSocket();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(voiceManager.selectedDeviceId || '');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [settings, setSettings] = useState({
    echoCancellation: voiceManager.settings.echoCancellation,
    noiseSuppression: voiceManager.settings.noiseSuppression,
    autoGainControl: voiceManager.settings.autoGainControl,
    sensitivity: voiceManager.settings.sensitivity,
    outputVolume: Math.round(voiceManager.settings.outputVolume * 100),
  });

  const [permissionError, setPermissionError] = useState(false);

  // 監聽即時音量變化與設備清單
  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      if (!voiceManager.isInitialized) {
        const res = await initMic();
        if (!res?.success) {
          setPermissionError(true);
        }
      }
      const devList = await voiceManager.refreshDevices();
      setDevices(devList);
      setSelectedDevice(voiceManager.selectedDeviceId || '');
    };

    loadDevices();

    const prevVolumeCb = voiceManager.onVolumeChange;
    voiceManager.onVolumeChange = (vol) => {
      setVolumeLevel(vol);
      if (prevVolumeCb) prevVolumeCb(vol);
    };

    return () => {
      voiceManager.onVolumeChange = prevVolumeCb;
    };
  }, [isOpen, initMic]);

  if (!isOpen) return null;

  const handleDeviceChange = async (e) => {
    const devId = e.target.value;
    setSelectedDevice(devId);
    await voiceManager.switchDevice(devId);
    setPermissionError(false);
  };

  const handleSettingToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    voiceManager.updateSettings({ [key]: updated[key] });
  };

  const handleSensitivityChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setSettings((prev) => ({ ...prev, sensitivity: val }));
    voiceManager.updateSettings({ sensitivity: val });
  };

  const handleOutputVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setSettings((prev) => ({ ...prev, outputVolume: val }));
    voiceManager.updateSettings({ outputVolume: val / 100 });
  };

  const getMeterColor = (val) => {
    if (val > 75) return 'from-amber-400 to-red-500';
    if (val > 40) return 'from-emerald-400 to-amber-400';
    return 'from-teal-400 to-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 頂部 Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎙️</span>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                麥克風與語音設定
              </h3>
              <p className="text-xs text-zinc-400">
                配置音訊輸入設備、即時收音檢測與降噪參數
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 麥克風未授權提示 */}
          {permissionError && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="font-bold text-red-300">尚未取得麥克風存取權限</div>
                <div className="text-red-400/90 mt-0.5 leading-relaxed">
                  請點擊瀏覽器網址列旁的鎖頭或麥克風圖示，允許此網站使用麥克風後重試。
                </div>
              </div>
            </div>
          )}

          {/* 1. 音訊輸入設備選單 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>🎤</span> 麥克風輸入設備
              </label>
              <button
                type="button"
                onClick={async () => {
                  const devList = await voiceManager.refreshDevices();
                  setDevices(devList);
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🔄</span> 重新整理設備
              </button>
            </div>

            <select
              value={selectedDevice}
              onChange={handleDeviceChange}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer"
            >
              {devices.length > 0 ? (
                devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `麥克風設備 ${idx + 1}`}
                  </option>
                ))
              ) : (
                <option value="">預設系統麥克風 (Default)</option>
              )}
            </select>
          </div>

          {/* 2. 即時收音音量檢測測試條 */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>📊</span> 即時收音測試
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  {isMicMuted ? '已靜音 (0%)' : `${volumeLevel}%`}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMicMuted ? 'bg-red-500' : volumeLevel > 10 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`}
                />
              </div>
            </div>

            {/* 音量動態能量條 */}
            <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-75 bg-gradient-to-r ${getMeterColor(
                  volumeLevel
                )}`}
                style={{ width: `${isMicMuted ? 0 : volumeLevel}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-500">
              請對著麥克風說話，觀察音量條是否正常跳動以確認收音。
            </p>
          </div>

          {/* 3. 麥克風開關與發言敏感度 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
              <div>
                <div className="text-xs font-semibold text-zinc-200">麥克風收音狀態</div>
                <div className="text-[11px] text-zinc-500">切換自己的麥克風是否向全房發送聲音</div>
              </div>
              <button
                type="button"
                onClick={toggleMic}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isMicMuted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>{!isMicMuted ? '🎙️ 開麥中' : '🔇 已靜音'}</span>
              </button>
            </div>

            {/* 發言判定敏感度 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-300">說話偵測敏感度閥值</span>
                <span className="font-mono text-zinc-400">{settings.sensitivity}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={settings.sensitivity}
                onChange={handleSensitivityChange}
                className="w-full accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>極靈敏 (輕聲可辨)</span>
                <span>標準</span>
                <span>抗噪高 (大聲才觸發)</span>
              </div>
            </div>

            {/* 遠端語音音量 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-300">其他玩家語音音量</span>
                <span className="font-mono text-zinc-400">{settings.outputVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.outputVolume}
                onChange={handleOutputVolumeChange}
                className="w-full accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* 4. 專業降噪與音訊處理開關 */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              🛠️ 專業音訊增強與降噪
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <div>
                  <div className="font-medium text-zinc-200">迴音消除 (Echo Cancellation)</div>
                  <div className="text-[11px] text-zinc-500">防止揚聲器播放的聲音被麥克風重複錄入</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.echoCancellation}
                  onChange={() => handleSettingToggle('echoCancellation')}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <div>
                  <div className="font-medium text-zinc-200">背景雜音抑制 (Noise Suppression)</div>
                  <div className="text-[11px] text-zinc-500">過濾鍵盤敲擊聲、風扇與環境雜音</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={() => handleSettingToggle('noiseSuppression')}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <div>
                  <div className="font-medium text-zinc-200">自動音量增益 (Auto Gain Control)</div>
                  <div className="text-[11px] text-zinc-500">自動平準發言音量，防止過輕或爆音</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoGainControl}
                  onChange={() => handleSettingToggle('autoGainControl')}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicrophoneSettingsModal;
