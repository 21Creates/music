import type { Track } from '@/types';
import { getTrackAudioUrl } from '@/lib/audioUrl';

interface AudioState {
  volume: number;
  crossfadeDuration: number;
}

class AudioManager {
  private audio: HTMLAudioElement;
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private mixMode = false;
  private _volume = 1;
  private _crossfadeDuration = 0;
  private _queue: Track[] = [];
  private _queueIndex = -1;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.setAttribute('playsinline', '');
  }

  private ensureContext() {
    if (this.context) return;
    try {
      this.audio.crossOrigin = 'anonymous';
      this.context = new AudioContext();
      this.source = this.context.createMediaElementSource(this.audio);
      this.gain = this.context.createGain();
      this.gain.gain.value = this._volume;
      this.source.connect(this.gain);
      this.gain.connect(this.context.destination);
    } catch {
      this.context = null;
    }
  }

  async play() {
    this.ensureContext();
    if (this.context?.state === 'suspended') await this.context.resume();
    try {
      await this.audio.play();
    } catch {
      // autoplay restrictions
    }
  }

  pause() {
    this.audio.pause();
  }

  load(url: string) {
    this.audio.src = url;
    this.audio.load();
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  get currentTime() {
    return this.audio.currentTime;
  }

  get duration() {
    return this.audio.duration || 0;
  }

  get paused() {
    return this.audio.paused;
  }

  setVolume(v: number) {
    this._volume = v;
    this.audio.volume = v;
    if (this.gain) this.gain.gain.value = v;
  }

  getVolume() {
    return this._volume;
  }

  getState(): AudioState {
    return { volume: this._volume, crossfadeDuration: this._crossfadeDuration };
  }

  setCrossfadeDuration(seconds: number) {
    this._crossfadeDuration = seconds;
    this.setMixMode(seconds > 0);
  }

  setMixMode(enabled: boolean) {
    this.mixMode = enabled;
    if (enabled) this.ensureContext();
  }

  getMixMode() {
    return this.mixMode;
  }

  async setQueue(tracks: Track[], startIndex: number) {
    this._queue = tracks;
    this._queueIndex = startIndex;
    if (startIndex >= 0 && startIndex < tracks.length) {
      const url = await getTrackAudioUrl(tracks[startIndex]);
      this.load(url);
      this.play();
    }
  }

  crossfadeTo(url: string, duration = 2000) {
    if (!this.mixMode || !this.gain || !this.context) {
      this.load(url);
      return;
    }
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
    setTimeout(() => {
      this.load(url);
      this.play();
      this.gain!.gain.setValueAtTime(0, this.context!.currentTime);
      this.gain!.gain.linearRampToValueAtTime(this._volume, this.context!.currentTime + duration / 1000);
    }, duration);
  }

  on(event: string, handler: () => void) {
    this.audio.addEventListener(event, handler);
    return () => this.audio.removeEventListener(event, handler);
  }
}

export const audioManager = new AudioManager();
