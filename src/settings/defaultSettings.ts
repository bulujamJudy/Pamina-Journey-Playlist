export interface Settings {
  enabled: boolean;
  mode: 'simulated' | 'real';
  sensitivity: number;
  bars: number;
  barWidth: number;
  barSpacing: number;
  smoothing: number;
  maxHeight: number;
  waveformColor: string;
  backgroundColor: string;
  textColor: string;
  showArtwork: boolean;
  showProgress: boolean;
  colorOverlayEnabled: boolean;
  colorOverlaySource: 'custom' | 'album';
  colorOverlayColor: string;
  colorOverlayOpacity: number;
}
export const DEFAULT_SETTINGS: Settings = {
  enabled: true, mode: 'simulated', sensitivity: 1, bars: 72, barWidth: 5, barSpacing: 7, smoothing: 0.82, maxHeight: 0.33,
  waveformColor: '#ffffff', backgroundColor: '#000000', textColor: '#ffffff',
  showArtwork: true, showProgress: true,
  colorOverlayEnabled: false, colorOverlaySource: 'custom', colorOverlayColor: '#f4b9e8', colorOverlayOpacity: 60,
};
