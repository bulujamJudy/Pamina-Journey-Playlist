import type { PlaybackState } from '../types/PlaybackState';
const REQUEST = 'STILL_DASHBOARD_REQUEST';
const UPDATE = 'STILL_PLAYBACK_UPDATE';
const AUDIO = 'STILL_AUDIO_LEVELS';
const CAPTURE = 'STILL_CAPTURE_STATUS';
function validPlayback(value: unknown): value is PlaybackState {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PlaybackState>;
  return typeof item.title === 'string' && typeof item.artist === 'string' && typeof item.duration === 'number' && typeof item.currentTime === 'number' && typeof item.isPlaying === 'boolean' && typeof item.updatedAt === 'number';
}
export class ExtensionBridge {
  private listeners = new Set<(state: PlaybackState) => void>();
  private connected = false;
  private audioListeners = new Set<(levels: number[]) => void>();
  private captureListeners = new Set<(active: boolean) => void>();
  constructor() { window.addEventListener('message', this.onMessage); window.postMessage({ source: 'still-dashboard', type: REQUEST }, location.origin); }
  private onMessage = (event: MessageEvent) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'still-extension') return;
    if (event.data.type === CAPTURE && typeof event.data.payload === 'boolean') { this.captureListeners.forEach((listener) => listener(event.data.payload as boolean)); return; }
    if (event.data.type === AUDIO && Array.isArray(event.data.payload) && event.data.payload.every((value: unknown) => typeof value === 'number' && value >= 0 && value <= 1)) { this.audioListeners.forEach((listener) => listener(event.data.payload as number[])); return; }
    if (event.data.type !== UPDATE || !validPlayback(event.data.payload)) return;
    this.connected = true; this.listeners.forEach((listener) => listener(event.data.payload));
  };
  subscribe(listener: (state: PlaybackState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeAudio(listener: (levels: number[]) => void): () => void { this.audioListeners.add(listener); return () => this.audioListeners.delete(listener); }
  subscribeCapture(listener: (active: boolean) => void): () => void { this.captureListeners.add(listener); return () => this.captureListeners.delete(listener); }
  get isConnected(): boolean { return this.connected; }
  destroy(): void { window.removeEventListener('message', this.onMessage); this.listeners.clear(); this.audioListeners.clear(); this.captureListeners.clear(); }
}
