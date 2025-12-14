
import { SoundtrackMood } from './baiduService';

/**
 * AudioEngine
 * Handles 1) Sequential TTS Playback (Queue) - 使用浏览器 Web Speech API
 *         2) Background Music - 播放本地音频文件（从 /public/audio/ 目录）
 * 
 * 背景音乐文件需要放在 public/audio/ 目录下，文件名格式：
 * - neutral.mp3 (或 .ogg/.wav)
 * - mystery.mp3
 * - tension.mp3
 * - melancholy.mp3
 * - epiphany.mp3
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  
  // TTS State (使用浏览器 Web Speech API)
  private ttsQueue: string[] = [];
  private isPlayingTTS = false;
  private currentSpeechUtterance: SpeechSynthesisUtterance | null = null;

  // Music State
  private isMusicEnabled = false;
  private masterGain: GainNode | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private currentAudioBuffer: AudioBuffer | null = null;
  private currentMood: SoundtrackMood = 'neutral';
  private audioBuffers: Map<SoundtrackMood, AudioBuffer> = new Map();
  private hasInitializedMusic = false; // 标记是否已初始化音乐

  // Volume Constants
  private readonly MUSIC_VOL_NORMAL = 0.25; // 背景音乐音量
  private readonly MUSIC_VOL_DUCKED = 0.05;


  constructor() {}

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
      }
    }
    
    // 加载 Web Speech API 的语音列表（某些浏览器需要）
    if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        // 语音列表已加载
      }, { once: true });
    }
  }

  // --- TTS Handling (使用浏览器 Web Speech API) ---
  async queueTTS(text: string) {
    if (!text || !('speechSynthesis' in window)) {
      console.warn("Web Speech API not supported");
      return;
    }
    
    this.ttsQueue.push(text);
    this.processTTSQueue();
  }

  stopAllTTS() {
    this.ttsQueue = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentSpeechUtterance) {
      this.currentSpeechUtterance = null;
    }
    this.isPlayingTTS = false;
    this.unduckMusic();
    // 确保状态完全重置，以便下次可以正常播放
  }

  private processTTSQueue() {
    if (this.isPlayingTTS) return;
    if (this.ttsQueue.length === 0) {
        this.unduckMusic();
        return;
    }
    
    if (!('speechSynthesis' in window)) {
      console.warn("Web Speech API not supported");
      return;
    }
    
    this.duckMusic();
    const text = this.ttsQueue.shift();
    if (!text) return;

    this.isPlayingTTS = true;
    this.currentSpeechUtterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    this.currentSpeechUtterance.rate = 1.0;
    this.currentSpeechUtterance.pitch = 1.0;
    this.currentSpeechUtterance.volume = 1.0;
    
    // 尝试选择合适语言的语音（如果可用）
    const voices = window.speechSynthesis.getVoices();
    // 优先选择中文语音，如果没有则使用默认语音
    const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
    if (chineseVoice) {
      this.currentSpeechUtterance.voice = chineseVoice;
    } else if (voices.length > 0) {
      // 使用第一个可用语音
      this.currentSpeechUtterance.voice = voices[0];
    }
    
    this.currentSpeechUtterance.onend = () => {
      this.isPlayingTTS = false;
      this.currentSpeechUtterance = null;
      this.processTTSQueue();
    };
    
    this.currentSpeechUtterance.onerror = (error) => {
      console.error("Speech synthesis error:", error);
      this.isPlayingTTS = false;
      this.currentSpeechUtterance = null;
      this.processTTSQueue();
    };
    
    window.speechSynthesis.speak(this.currentSpeechUtterance);
  }

  // --- Classical Music Logic ---

  toggleMusic(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (enabled) {
      // 如果还没有初始化过音乐，随机选择一个 mood
      if (!this.hasInitializedMusic) {
        this.initializeRandomMusic();
      } else {
        this.startMusic();
      }
    } else {
      this.stopMusic();
    }
  }

  /**
   * 初始化时随机选择一个 mood 并播放
   * 注意：由于浏览器限制，实际播放需要等待用户交互
   */
  private async initializeRandomMusic() {
    const moods: SoundtrackMood[] = ['neutral', 'mystery', 'tension', 'melancholy', 'epiphany'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    this.currentMood = randomMood;
    this.hasInitializedMusic = true;
    console.log(`🎵 Randomly selected initial mood: ${randomMood}`);
    
    // 尝试启动音乐（如果 AudioContext 已激活）
    // 如果未激活，会在用户首次交互时通过 handleGlobalInteraction 触发
    try {
      await this.startMusic();
    } catch (e) {
      console.log("⏸️ Music will start after user interaction");
    }
  }

  async setMood(mood: SoundtrackMood) {
    const previousMood = this.currentMood;
    this.currentMood = mood;
    
    // 标记已经根据对话设置了 mood（不再是随机初始 mood）
    this.hasInitializedMusic = true;
    
    // 如果音乐正在播放且 mood 改变了，切换音乐
    if (this.isMusicEnabled && previousMood !== mood) {
      await this.loadAndPlayMusic(mood);
    }
  }

  /**
   * 加载音频文件
   */
  private async loadAudioFile(mood: SoundtrackMood): Promise<AudioBuffer | null> {
    if (!this.ctx) await this.init();
    if (!this.ctx) return null;

    // 如果已经加载过，直接返回
    if (this.audioBuffers.has(mood)) {
      return this.audioBuffers.get(mood)!;
    }

    try {
      // 尝试加载音频文件（支持 mp3, ogg, wav）
      const extensions = ['mp3', 'ogg', 'wav'];
      let audioBuffer: AudioBuffer | null = null;

      for (const ext of extensions) {
        try {
          const response = await fetch(`/audio/${mood}.${ext}`);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(mood, audioBuffer);
            console.log(`✅ Loaded audio for mood: ${mood} (${ext})`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个格式
          continue;
        }
      }

      if (!audioBuffer) {
        console.warn(`⚠️ No audio file found for mood: ${mood}. Please add /audio/${mood}.mp3 (or .ogg/.wav)`);
      }

      return audioBuffer;
    } catch (error) {
      console.error(`❌ Failed to load audio for mood ${mood}:`, error);
      return null;
    }
  }

  /**
   * 加载并播放音乐
   */
  private async loadAndPlayMusic(mood: SoundtrackMood) {
    if (!this.ctx) await this.init();
    if (!this.ctx) return;

    // 停止当前播放的音乐（确保只有一个在播放）
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {
        // 可能已经停止了
      }
      this.currentAudioSource = null;
    }

    // 加载新音乐
    const buffer = await this.loadAudioFile(mood);
    if (!buffer) {
      console.warn(`⚠️ Cannot play music for mood ${mood}, audio file not found`);
      return;
    }

    this.currentAudioBuffer = buffer;
    await this.playAudioBuffer(buffer);
  }

  /**
   * 播放音频缓冲区（支持循环）
   */
  private async playAudioBuffer(buffer: AudioBuffer) {
    if (!this.ctx || !this.masterGain) return;

    // 确保 AudioContext 已恢复（浏览器要求用户交互后才能播放）
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
        return;
      }
    }

    // 确保停止之前的音频源（防止多个同时播放）
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {
        // 可能已经停止了
      }
      this.currentAudioSource = null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // 循环播放

    // 连接到主音量控制
    source.connect(this.masterGain);

    // 淡入效果
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.MUSIC_VOL_NORMAL, this.ctx.currentTime + 2);

    source.start(0);
    this.currentAudioSource = source;

    // 如果播放结束（虽然设置了循环，但以防万一）
    source.onended = () => {
      if (this.isMusicEnabled && this.currentAudioSource === source) {
        // 重新播放（异步调用）
        this.playAudioBuffer(buffer).catch(err => {
          console.error("Failed to replay audio:", err);
        });
      }
    };
  }

  private async startMusic() {
    if (!this.ctx) await this.init();
    if (!this.ctx) return;

    // 如果已经有音频在播放，先停止（确保只有一个在播放）
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {
        // 忽略错误
      }
      this.currentAudioSource = null;
    }

    // 如果 masterGain 已存在，先断开连接
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (e) {
        // 忽略错误
      }
    }

    // Setup Master Graph
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Start silent for fade-in
    this.masterGain.connect(this.ctx.destination);

    // 加载并播放当前 mood 的音乐
    await this.loadAndPlayMusic(this.currentMood);
  }

  private stopMusic() {
    if (!this.ctx) return;

    // Fade out
    if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        
        setTimeout(() => {
            // 停止音频源
            if (this.currentAudioSource) {
                try {
                    this.currentAudioSource.stop();
                } catch (e) {
                    // 可能已经停止了
                }
                this.currentAudioSource = null;
            }
            
            this.masterGain?.disconnect();
            this.masterGain = null;
        }, 2100);
    }
  }


  // --- Ducking Logic ---

  private duckMusic() {
      if (!this.masterGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.MUSIC_VOL_DUCKED, now + 0.5);
  }

  private unduckMusic() {
      if (!this.masterGain || !this.ctx || !this.isMusicEnabled) return;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.MUSIC_VOL_NORMAL, now + 2.0);
  }

}

export const audioEngine = new AudioEngine();
