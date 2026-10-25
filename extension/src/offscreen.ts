let stream: MediaStream | null = null; let context: AudioContext | null = null; let source: MediaStreamAudioSourceNode | null = null; let analyser: AnalyserNode | null = null; let timer = 0;
async function stop(): Promise<void> { window.clearInterval(timer); source?.disconnect(); analyser?.disconnect(); stream?.getTracks().forEach((track) => track.stop()); if (context && context.state !== 'closed') await context.close(); stream = null; context = null; source = null; analyser = null; chrome.runtime.sendMessage({ type: 'AUDIO_CAPTURE_STATUS', payload: false }).catch(() => {}); }
chrome.runtime.onMessage.addListener((message) => {
  if (message?.target !== 'offscreen') return;
  if (message.type === 'STOP_CAPTURE') { void stop(); return; }
  if (message.type !== 'START_CAPTURE') return;
  void (async () => {
    await stop();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: message.streamId } } as MediaTrackConstraints, video: false });
    context = new AudioContext(); source = context.createMediaStreamSource(stream); analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .82;
    source.connect(analyser); analyser.connect(context.destination);
    chrome.runtime.sendMessage({ type: 'AUDIO_CAPTURE_STATUS', payload: true }).catch(() => {});
    stream.getAudioTracks().forEach((track) => track.addEventListener('ended', () => { void stop(); }));
    const values = new Uint8Array(analyser.frequencyBinCount);
    timer = window.setInterval(() => {
      if (!analyser) return; analyser.getByteFrequencyData(values);
      const bins = Array.from({ length: 48 }, (_, i) => { const start = Math.floor(Math.pow(i / 48, 1.7) * values.length); const end = Math.max(start + 1, Math.floor(Math.pow((i + 1) / 48, 1.7) * values.length)); let total = 0; for (let j = start; j < end; j++) total += values[j] ?? 0; return total / (end - start) / 255; });
      chrome.runtime.sendMessage({ type: 'AUDIO_LEVELS', payload: bins }).catch(() => {});
    }, 50);
  })().catch(async (error) => { console.error('Capture failed', error); await stop(); });
});
