import type { Settings } from '../settings/defaultSettings';
export class WaveformRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 0; private height = 0; private frame = 0; private time = 0; private levels: number[] = [];
  private visible = true; private active = true; private audio: number[] | null = null;
  constructor(
    private canvas: HTMLCanvasElement,
    private settings: () => Settings,
    private playing: () => boolean,
    private onMiddleLevel: (level: number | null) => void = () => {},
  ) {
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D unavailable'); this.ctx = context;
    new ResizeObserver(() => this.resize()).observe(canvas); document.addEventListener('visibilitychange', this.visibility); this.resize(); this.frame = requestAnimationFrame(this.draw);
  }
  setAudioLevels(levels: number[] | null): void { this.audio = levels; }
  private resize(): void { const rect = this.canvas.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2); this.width = rect.width; this.height = rect.height; this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  private visibility = (): void => { this.visible = !document.hidden; if (this.visible && this.active) this.frame = requestAnimationFrame(this.draw); else cancelAnimationFrame(this.frame); };
  private draw = (now: number): void => {
    if (!this.active || !this.visible) return;
    this.time = now / 1000; const s = this.settings(); const requestedPairs = Math.ceil(s.bars / 2); const barWidth = Math.max(1, s.barWidth); const spacing = Math.max(0, s.barSpacing); const pairCapacity = Math.floor((this.width + spacing) / (2 * (barWidth + spacing))); const pairCount = Math.max(1, Math.min(requestedPairs, pairCapacity)); const step = barWidth + spacing; const mid = this.width * .5; const max = Math.min(this.height * s.maxHeight, 230); const centerY = this.height * .5;
    this.ctx.clearRect(0, 0, this.width, this.height); this.ctx.fillStyle = s.waveformColor; this.ctx.globalAlpha = this.playing() ? .92 : .38;
    let middleLevel: number | null = null;
    const middlePair = Math.floor(pairCount / 2);
    for (let i = 0; i < pairCount; i++) {
      const t = i / pairCount; const envelope = .23 + .77 * Math.pow(Math.sin(Math.PI * t), .72);
      const pulse = .5 + .21 * Math.sin(this.time * 1.7 + i * .11) + .16 * Math.sin(this.time * .73 - i * .21) + .08 * Math.cos(this.time * 2.2 + i * .08);
      const audio = s.mode === 'real' ? this.audio?.[Math.min(this.audio.length - 1, Math.floor(t * (this.audio?.length ?? 1)))] : undefined;
      let value = (audio ?? pulse) * envelope * (this.playing() ? 1 : .18) * s.sensitivity;
      value = Math.max(.025, Math.min(1, value)); this.levels[i] ??= value; this.levels[i] += (value - this.levels[i]) * (1 - s.smoothing);
      if (i === middlePair && s.mode === 'real' && this.audio) middleLevel = this.levels[i] ?? null;
      const h = Math.max(3, this.levels[i] * max); const radius = Math.min(barWidth / 2, 5);
      const offset = spacing / 2 + barWidth / 2 + i * step;
      for (const x of [mid - offset - barWidth / 2, mid + offset - barWidth / 2]) {
        this.ctx.beginPath(); this.ctx.roundRect(x, centerY - h, barWidth, h * 2, radius); this.ctx.fill();
      }
    }
    this.onMiddleLevel(middleLevel);
    this.ctx.globalAlpha = 1; this.frame = requestAnimationFrame(this.draw);
  };
  destroy(): void { this.active = false; cancelAnimationFrame(this.frame); document.removeEventListener('visibilitychange', this.visibility); }
}
