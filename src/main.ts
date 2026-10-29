import './style.css';
import { WaveformRenderer } from './audio/WaveformRenderer';
import { ComputerAudioCapture } from './audio/ComputerAudioCapture';
import { ExtensionBridge } from './services/ExtensionBridge';
import { loadSettings, saveSettings } from './settings/SettingsManager';
import type { Settings } from './settings/defaultSettings';
import type { PlaybackState } from './types/PlaybackState';
import { formatTime } from './utils/formatTime';
import { initializeSceneMotion, setSceneAudioLevel } from './visuals/SceneMotion';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const settings = loadSettings();
const bridge = new ExtensionBridge();
const canvas = $('waveform') as HTMLCanvasElement;
const DEFAULT_COVER = 'cover.png';
const DEFAULT_TITLE = 'In my Journey';
const DEFAULT_ARTIST = 'Pamina, Art by Judy';
const connection = $('connection');
const connectionLabel = $('connection-label');
const connectionDetail = $('connection-detail');
const demo: PlaybackState = { title: DEFAULT_TITLE, artist: DEFAULT_ARTIST, albumCover: DEFAULT_COVER, duration: 316, currentTime: 94, isPlaying: true, updatedAt: Date.now() };
let playback: PlaybackState = demo; let receivedExtension = false; let lastAudioAt = 0; let computerAudioActive = false; let extensionCaptureActive = false;
const isPlaying = () => playback.isPlaying && (!receivedExtension || Date.now() - playback.updatedAt < 5000);
const renderer = new WaveformRenderer(canvas, () => settings, isPlaying, setSceneAudioLevel);
initializeSceneMotion();

let albumColorRequest = 0;

function setAlbumAccentColor(color: string): void {
  $('album-display').style.setProperty('--album-accent', color);
  document.documentElement.style.setProperty('--album-accent', color);
}

function fallbackAlbumColor(source: string): string {
  // Keep the accent tied to the current artwork even when its host blocks canvas reads.
  let hash = 0;
  for (const character of source) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `hsl(${(hash >>> 0) % 360} 48% 78%)`;
}

function sampleAlbumColor(image: HTMLImageElement, source: string, requestId: number): void {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, 32, 32);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    const colors = new Map<string, number>();
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0; const green = pixels[index + 1] ?? 0; const blue = pixels[index + 2] ?? 0;
      const max = Math.max(red, green, blue); const min = Math.min(red, green, blue);
      if (max - min < 24 || max < 45 || min > 232) continue;
      const key = [red, green, blue].map((channel) => Math.round(channel / 32) * 32).join(',');
      colors.set(key, (colors.get(key) ?? 0) + 1);
    }
    const mainColor = [...colors.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
    if (!mainColor) throw new Error('No album color found');
    const [red, green, blue] = mainColor.split(',').map((channel) => Math.min(255, Number(channel)));
    if (requestId === albumColorRequest) setAlbumAccentColor(`rgb(${red}, ${green}, ${blue})`);
  } catch {
    if (requestId === albumColorRequest) setAlbumAccentColor(fallbackAlbumColor(source));
  }
}

function updateAlbumColor(source: string): void {
  const requestId = ++albumColorRequest;
  setAlbumAccentColor(fallbackAlbumColor(source));

  // Sample through a CORS-enabled image so remote artwork remains readable by canvas.
  // If the artwork host does not grant CORS access, the source-specific fallback remains.
  const sampler = new Image();
  sampler.crossOrigin = 'anonymous';
  sampler.onload = () => sampleAlbumColor(sampler, source, requestId);
  sampler.onerror = () => {
    if (requestId === albumColorRequest) setAlbumAccentColor(fallbackAlbumColor(source));
  };
  sampler.src = new URL(source, location.href).href;
}

const audioCapture = new ComputerAudioCapture(
  (levels) => { lastAudioAt = levels ? Date.now() : 0; renderer.setAudioLevels(levels); },
  (active) => { computerAudioActive = active; if (!active) setSceneAudioLevel(null); if (active) settings.mode = 'real'; saveSettings(settings); render(); },
);
bridge.subscribeAudio((levels) => { lastAudioAt = Date.now(); renderer.setAudioLevels(levels); });
bridge.subscribeCapture((active) => { extensionCaptureActive = active; if (!active) setSceneAudioLevel(null); render(); });

function nowPlayingTime(): number {
  if (!playback.isPlaying || !isPlaying()) return playback.currentTime;
  return Math.min(playback.duration, playback.currentTime + ((Date.now() - playback.updatedAt) / 1000) * (playback.playbackRate ?? 1));
}
function render(): void {
  const live = receivedExtension && Date.now() - playback.updatedAt < 5000;
  const genericAudioOnly = computerAudioActive && !extensionCaptureActive && !live;
  $('song-title').textContent = genericAudioOnly ? DEFAULT_TITLE : playback.title || 'Nothing playing'; $('song-artist').textContent = genericAudioOnly ? DEFAULT_ARTIST : playback.artist || 'Open YouTube Music to begin';
  const cover = $('album-cover') as HTMLImageElement;
  const sleeve = $('album-sleeve') as HTMLImageElement;
  const coverPath = genericAudioOnly ? DEFAULT_COVER : playback.albumCover || DEFAULT_COVER;
  if (cover.src !== new URL(coverPath, location.href).href) {
    cover.classList.add('changing'); sleeve.classList.add('changing'); cover.src = coverPath; sleeve.src = coverPath;
    cover.onload = () => { cover.classList.remove('changing'); sleeve.classList.remove('changing'); };
    updateAlbumColor(coverPath);
  }
  const duration = genericAudioOnly ? 0 : playback.duration;
  const elapsed = genericAudioOnly ? 0 : nowPlayingTime(); $('current-time').textContent = formatTime(elapsed); $('duration').textContent = formatTime(duration);
  const percent = duration > 0 ? Math.min(100, elapsed / duration * 100) : 0;
  $('progress-fill').style.width = `${percent}%`; $('progress-knob').style.left = `${percent}%`;
  connection.classList.toggle('connected', live); connection.classList.toggle('disconnected', receivedExtension && !live);
  const audioCaptureActive = computerAudioActive || extensionCaptureActive;
  connectionLabel.textContent = audioCaptureActive ? 'CAPTURING COMPUTER AUDIO' : !receivedExtension ? 'DEMO MODE' : !live ? 'DISCONNECTED' : isPlaying() ? 'CONNECTED · PLAYING' : 'CONNECTED · PAUSED';
  connectionDetail.textContent = genericAudioOnly ? 'Capturing computer audio. Track details are unavailable in this mode.' : !receivedExtension ? 'Demo playback is active. Install the extension to connect YouTube Music.' : live ? `YouTube Music connected · ${extensionCaptureActive ? 'audio capture active' : 'audio capture off'} · updated ${new Date(playback.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'The extension stopped sending updates. Check the YouTube Music tab or reconnect.';
  const captureButton = $('computer-audio-toggle') as HTMLButtonElement; captureButton.textContent = computerAudioActive ? 'STOP AUDIO CAPTURE' : 'CAPTURE COMPUTER AUDIO'; captureButton.classList.toggle('capturing', computerAudioActive);
}
function setSettingsClass(): void {
  document.body.classList.toggle('waveform-hidden', !settings.enabled); document.body.classList.toggle('artwork-hidden', !settings.showArtwork); document.body.classList.toggle('progress-hidden', !settings.showProgress);
  document.documentElement.style.setProperty('--bg', settings.backgroundColor); document.documentElement.style.setProperty('--ink', settings.textColor);
  document.documentElement.style.setProperty('--scene-overlay-color', settings.colorOverlayColor);
  document.documentElement.style.setProperty('--scene-overlay-opacity', String(settings.colorOverlayOpacity / 100));
  $('setting-overlay-opacity-value').textContent = `${settings.colorOverlayOpacity}%`;
  for (const id of ['scene-color-overlay', 'scene-color-overlay-front']) {
    const overlay = $(id);
    overlay.classList.toggle('active', settings.colorOverlayEnabled);
    overlay.dataset.source = settings.colorOverlaySource;
  }
  $('overlay-custom-color-row').hidden = settings.colorOverlaySource !== 'custom';
  settings.waveformColor ||= '#ffffff';
}
function updatePlayback(next: PlaybackState): void {
  playback = next; receivedExtension = true; render();
}
bridge.subscribe(updatePlayback);
setInterval(() => { if (Date.now() - lastAudioAt > 1500) renderer.setAudioLevels(null); render(); }, 250); render(); setSettingsClass();

const panel = $('settings-panel'); const trigger = $('settings-trigger'); const scrim = $('panel-scrim');
const fullscreenButton = $('fullscreen-toggle') as HTMLButtonElement;
function syncFullscreenButton(): void {
  const active = Boolean(document.fullscreenElement);
  const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreenButton.hidden = !document.fullscreenEnabled;
  fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.setAttribute('aria-pressed', String(active));
  fullscreenButton.title = label;
  document.getElementById('fullscreen-icon')?.setAttribute('d', active
    ? 'M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3'
    : 'M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5');
}
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    fullscreenButton.title = 'Fullscreen is unavailable. Please try opening this site in a browser tab.';
  }
});
document.addEventListener('fullscreenchange', syncFullscreenButton);
syncFullscreenButton();
function setPanel(open: boolean): void { panel.classList.toggle('open', open); scrim.classList.toggle('visible', open); panel.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); }
trigger.addEventListener('click', () => setPanel(true)); $('close-settings').addEventListener('click', () => setPanel(false)); scrim.addEventListener('click', () => setPanel(false)); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPanel(false); });
const controls: Record<string, keyof Settings> = { 'setting-waveform':'enabled', 'setting-mode':'mode', 'setting-sensitivity':'sensitivity', 'setting-bars':'bars', 'setting-bar-width':'barWidth', 'setting-bar-spacing':'barSpacing', 'setting-smoothing':'smoothing', 'setting-max-height':'maxHeight', 'setting-color':'waveformColor', 'setting-background':'backgroundColor', 'setting-text':'textColor', 'setting-artwork':'showArtwork', 'setting-progress':'showProgress', 'setting-color-overlay':'colorOverlayEnabled', 'setting-overlay-source':'colorOverlaySource', 'setting-overlay-color':'colorOverlayColor', 'setting-overlay-opacity':'colorOverlayOpacity' };
for (const [id, property] of Object.entries(controls)) {
  const control = $(id) as HTMLInputElement | HTMLSelectElement;
  const value = settings[property]; if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(value); else control.value = String(value);
  control.addEventListener('input', () => {
    const updated = control instanceof HTMLInputElement && control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
    (settings as unknown as Record<string, unknown>)[property] = updated; saveSettings(settings); setSettingsClass(); render();
  });
}
$('reset-settings').addEventListener('click', () => { localStorage.removeItem('still-dashboard-settings'); location.reload(); });
$('reconnect').addEventListener('click', () => { window.postMessage({ source:'still-dashboard', type:'STILL_DASHBOARD_REQUEST' }, location.origin); connectionDetail.textContent = 'Checking for the browser extension…'; });
async function toggleComputerAudio(): Promise<void> {
  const detail = $('connection-detail');
  try { if (audioCapture.isActive) await audioCapture.stop(); else await audioCapture.start(); }
  catch (error) { detail.textContent = error instanceof Error ? error.message : 'Audio capture could not start.'; }
}
$('computer-audio-toggle').addEventListener('click', () => { void toggleComputerAudio(); });
$('capture-audio').addEventListener('click', () => { void toggleComputerAudio(); });
