import { DEFAULT_SETTINGS, type Settings } from './defaultSettings';
const KEY = 'still-dashboard-settings';
const hex = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function loadSettings(): Settings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
    const value = raw as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_SETTINGS.enabled,
      mode: value.mode === 'real' || value.mode === 'simulated' ? value.mode : DEFAULT_SETTINGS.mode,
      sensitivity: typeof value.sensitivity === 'number' && value.sensitivity >= .5 && value.sensitivity <= 2 ? value.sensitivity : 1,
      barWidth: typeof value.barWidth === 'number' && value.barWidth >= 2 && value.barWidth <= 10 ? value.barWidth : 5,
      barSpacing: typeof value.barSpacing === 'number' && value.barSpacing >= 1 && value.barSpacing <= 14 ? value.barSpacing : 7,
      bars: typeof value.bars === 'number' && value.bars >= 32 && value.bars <= 112 ? Math.round(value.bars / 4) * 4 : 72,
      smoothing: typeof value.smoothing === 'number' && value.smoothing >= .5 && value.smoothing <= .98 ? value.smoothing : .82,
      maxHeight: typeof value.maxHeight === 'number' && value.maxHeight >= .1 && value.maxHeight <= .48 ? value.maxHeight : .33,
      waveformColor: hex(value.waveformColor, '#ffffff'), backgroundColor: hex(value.backgroundColor, '#000000'), textColor: hex(value.textColor, '#ffffff'),
      showArtwork: typeof value.showArtwork === 'boolean' ? value.showArtwork : true,
      showProgress: typeof value.showProgress === 'boolean' ? value.showProgress : true,
      colorOverlayEnabled: typeof value.colorOverlayEnabled === 'boolean' ? value.colorOverlayEnabled : DEFAULT_SETTINGS.colorOverlayEnabled,
      colorOverlaySource: value.colorOverlaySource === 'album' ? 'album' : 'custom',
      colorOverlayColor: hex(value.colorOverlayColor, DEFAULT_SETTINGS.colorOverlayColor),
      colorOverlayOpacity: typeof value.colorOverlayOpacity === 'number' && Number.isFinite(value.colorOverlayOpacity)
        ? Math.max(0, Math.min(100, value.colorOverlayOpacity))
        : DEFAULT_SETTINGS.colorOverlayOpacity,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(settings: Settings): void { localStorage.setItem(KEY, JSON.stringify(settings)); }
