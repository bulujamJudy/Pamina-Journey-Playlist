export class ComputerAudioCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timer = 0;
  private active = false;

  constructor(
    private onLevels: (levels: number[] | null) => void,
    private onStatus: (active: boolean) => void,
  ) {}

  get isActive(): boolean { return this.active; }

  async start(): Promise<void> {
    if (this.active) return;
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('This browser does not support shared audio capture. Try a recent version of Chrome or Edge.');

    let stream: MediaStream;
    try {
      const options = {
        video: true,
        audio: { suppressLocalAudioPlayback: false },
        systemAudio: 'include',
        windowAudio: 'system',
        selfBrowserSurface: 'exclude',
      } as unknown as DisplayMediaStreamOptions;
      stream = await navigator.mediaDevices.getDisplayMedia(options);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw new Error('Audio sharing was cancelled. Choose a screen or tab and enable audio sharing.');
      throw error;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('No shared audio was provided. In the share picker, choose a tab or screen and turn on Share audio.');
    }
    // The screen image is never used; release its track as soon as audio is selected.
    stream.getVideoTracks().forEach((track) => track.stop());
    this.stream = stream;
    this.context = new AudioContext();
    await this.context.resume();
    this.source = this.context.createMediaStreamSource(stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;
    this.source.connect(this.analyser);
    this.active = true;
    this.onStatus(true);
    audioTrack.addEventListener('ended', this.handleEnded, { once: true });

    const values = new Uint8Array(this.analyser.frequencyBinCount);
    this.timer = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(values);
      const levels = Array.from({ length: 64 }, (_, index) => {
        const start = Math.floor(Math.pow(index / 64, 1.65) * values.length);
        const end = Math.max(start + 1, Math.floor(Math.pow((index + 1) / 64, 1.65) * values.length));
        let total = 0;
        for (let bin = start; bin < end; bin++) total += values[bin] ?? 0;
        return total / (end - start) / 255;
      });
      this.onLevels(levels);
    }, 50);
  }

  private handleEnded = (): void => { void this.stop(); };

  async stop(): Promise<void> {
    if (!this.active && !this.stream && !this.context) return;
    window.clearInterval(this.timer);
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.stream = null;
    this.context = null;
    this.source = null;
    this.analyser = null;
    this.active = false;
    this.onLevels(null);
    this.onStatus(false);
  }
}
