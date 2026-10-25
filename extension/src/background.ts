interface PlaybackState { title: string; artist: string; album?: string; albumCover?: string; duration: number; currentTime: number; isPlaying: boolean; videoId?: string; playbackRate?: number; updatedAt: number }
const DASHBOARD_URLS = ['https://bulujamjudy.github.io/*', 'http://localhost:5173/*', 'http://127.0.0.1:5173/*'];
let latest: PlaybackState | null = null;
async function broadcast(type: string, payload: unknown): Promise<void> {
  const tabs = await chrome.tabs.query({ url: DASHBOARD_URLS });
  await Promise.all(tabs.filter((tab) => tab.id !== undefined).map((tab) => chrome.tabs.sendMessage(tab.id!, { type, payload }).catch(() => undefined)));
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'PLAYBACK_UPDATE' && sender.url?.startsWith('https://music.youtube.com/')) {
    latest = message.payload as PlaybackState; void broadcast('PLAYBACK_UPDATE', latest); respond?.({ ok: true });
  }
  if (message?.type === 'GET_PLAYBACK') { respond?.(latest); }
  if (message?.type === 'AUDIO_LEVELS') void broadcast('AUDIO_LEVELS', message.payload);
  if (message?.type === 'AUDIO_CAPTURE_STATUS') void broadcast('AUDIO_CAPTURE_STATUS', message.payload);
});
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const removed = await chrome.storage.session.get('musicTabId');
  if (removed.musicTabId === tabId) { latest = null; await chrome.storage.session.remove('musicTabId'); }
});
async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (!contexts.length) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Analyze authorized YouTube Music tab audio and route it back to the speakers.' });
}
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith('https://music.youtube.com/')) return;
  try {
    const captures = await chrome.tabCapture.getCapturedTabs();
    if (captures.some((capture) => capture.tabId === tab.id && capture.status !== 'stopped' && capture.status !== 'error')) {
      await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_CAPTURE' });
      await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
      return;
    }
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
    await ensureOffscreen(); await chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_CAPTURE', streamId });
    await chrome.storage.session.set({ musicTabId: tab.id });
    await chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
  } catch (error) { console.error('Audio capture could not start', error); }
});
chrome.tabCapture.onStatusChanged.addListener((info) => {
  if (info.status === 'stopped' || info.status === 'error') chrome.action.setBadgeText({ tabId: info.tabId, text: '' });
});
