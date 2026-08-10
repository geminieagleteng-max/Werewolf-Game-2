/**
 * WebRTC 語音通話與麥克風管理引擎 (VoiceManager)
 * 負責處理音訊串流獲取、設備枚舉、頻譜分析、發言波動偵測與遠端音訊播放
 */

export class VoiceManager {
  constructor() {
    this.localStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.animFrameId = null;

    this.isMuted = true;
    this.isInitialized = false;
    this.permissionDenied = false;
    this.selectedDeviceId = '';
    this.availableDevices = [];

    // 音訊增強設定
    this.settings = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sensitivity: 12, // 說話判定音量閥值 (0 ~ 100)
      outputVolume: 1.0, // 遠端輸出音量 (0.0 ~ 1.0)
    };

    // 監聽回呼
    this.onVolumeChange = null; // (volume: 0~100) => void
    this.onSpeakingChange = null; // (isSpeaking: boolean) => void
    this.onDevicesChange = null; // (devices: MediaDeviceInfo[]) => void
    this.onRemoteStream = null; // (peerId, stream) => void

    this.isCurrentlySpeaking = false;
    this.remoteStreams = new Map(); // peerId -> MediaStream
    this.remoteAudioElements = new Map(); // peerId -> HTMLAudioElement
  }

  /**
   * 初始化麥克風並請求權限
   */
  async init(deviceId = null) {
    try {
      this.cleanupLocal();

      const constraints = {
        audio: {
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: this.settings.autoGainControl,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      this.permissionDenied = false;
      this.isInitialized = true;

      // 預設為開麥或維持當前靜音狀態
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !this.isMuted;
        this.selectedDeviceId = audioTrack.getSettings().deviceId || deviceId || '';
      }

      this.setupAudioAnalysis(stream);
      await this.refreshDevices();

      return { success: true, stream };
    } catch (err) {
      console.warn('Microphone permission denied or device not found:', err);
      this.permissionDenied = true;
      this.isInitialized = false;
      return { success: false, error: err };
    }
  }

  /**
   * 刷新可用麥克風設備清單
   */
  async refreshDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter((d) => d.kind === 'audioinput');
      if (this.onDevicesChange) {
        this.onDevicesChange(this.availableDevices);
      }
      return this.availableDevices;
    } catch (e) {
      return [];
    }
  }

  /**
   * 設定 Web Audio API 頻譜分析器以偵測音量與說話狀態
   */
  setupAudioAnalysis(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.localStream) return;

        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volume = Math.min(100, Math.round((average / 128) * 100));

        if (this.onVolumeChange) {
          this.onVolumeChange(this.isMuted ? 0 : volume);
        }

        const isSpeaking = !this.isMuted && volume >= this.settings.sensitivity;
        if (isSpeaking !== this.isCurrentlySpeaking) {
          this.isCurrentlySpeaking = isSpeaking;
          if (this.onSpeakingChange) {
            this.onSpeakingChange(isSpeaking);
          }
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.animFrameId = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn('AudioContext analysis setup error:', err);
    }
  }

  /**
   * 開關麥克風靜音
   */
  setMuted(muted) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted && this.isCurrentlySpeaking) {
      this.isCurrentlySpeaking = false;
      if (this.onSpeakingChange) {
        this.onSpeakingChange(false);
      }
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  /**
   * 切換指定輸入設備
   */
  async switchDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    return this.init(deviceId);
  }

  /**
   * 更新進階設定
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.isInitialized) {
      return this.init(this.selectedDeviceId);
    }
  }

  /**
   * 綁定並播放遠端玩家語音
   */
  handleRemoteStream(peerId, remoteStream) {
    if (!remoteStream) return;
    this.remoteStreams.set(peerId, remoteStream);

    let audioEl = this.remoteAudioElements.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.style.display = 'none';
      audioEl.setAttribute('data-peer-id', peerId);
      document.body.appendChild(audioEl);
      this.remoteAudioElements.set(peerId, audioEl);
    }

    audioEl.srcObject = remoteStream;
    audioEl.volume = this.settings.outputVolume;

    // 解鎖並確保播放遠端音訊串流
    this.unlockAudioPlayback();

    if (this.onRemoteStream) {
      this.onRemoteStream(peerId, remoteStream);
    }
  }

  /**
   * 解鎖瀏覽器音訊自動播放限制 (Autoplay Policy)
   */
  unlockAudioPlayback() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this.remoteAudioElements.forEach((audioEl) => {
      if (audioEl.srcObject) {
        audioEl.play().catch((err) => {
          console.warn('Browser blocked audio autoplay, waiting for user interaction:', err);
          const resumeOnInteraction = () => {
            if (audioEl.srcObject) {
              audioEl.play().catch(() => {});
            }
            if (this.audioContext && this.audioContext.state === 'suspended') {
              this.audioContext.resume().catch(() => {});
            }
          };
          window.addEventListener('click', resumeOnInteraction, { once: true });
          window.addEventListener('touchstart', resumeOnInteraction, { once: true });
          window.addEventListener('keydown', resumeOnInteraction, { once: true });
        });
      }
    });
  }

  removeRemoteStream(peerId) {
    this.remoteStreams.delete(peerId);
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
  }

  cleanupLocal() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    this.isCurrentlySpeaking = false;
  }

  cleanup() {
    this.cleanupLocal();
    this.remoteAudioElements.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    this.remoteAudioElements.clear();
    this.remoteStreams.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }
  }
}

export const voiceManager = new VoiceManager();
