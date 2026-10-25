const DASHBOARD_ORIGINS = new Set(['https://bulujamjudy.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const allowed = DASHBOARD_ORIGINS.has(location.origin);
function relay(message: unknown): void { if (allowed) window.postMessage({ source: 'still-extension', type: 'STILL_PLAYBACK_UPDATE', payload: message }, location.origin); }
if (allowed) {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'still-dashboard') return;
    if (event.data.type === 'STILL_DASHBOARD_REQUEST') chrome.runtime.sendMessage({ type: 'GET_PLAYBACK' }).then(relay).catch(() => {});
    if (event.data.type === 'STILL_AUDIO_START') window.postMessage({ source: 'still-extension', type: 'STILL_AUDIO_HINT' }, location.origin);
  });
  chrome.runtime.onMessage.addListener((message) => { if (message?.type === 'PLAYBACK_UPDATE') relay(message.payload); if (message?.type === 'AUDIO_LEVELS') window.postMessage({ source: 'still-extension', type: 'STILL_AUDIO_LEVELS', payload: message.payload }, location.origin); if (message?.type === 'AUDIO_CAPTURE_STATUS') window.postMessage({ source: 'still-extension', type: 'STILL_CAPTURE_STATUS', payload: message.payload }, location.origin); });
  window.postMessage({ source: 'still-extension', type: 'STILL_EXTENSION_READY' }, location.origin);
}
