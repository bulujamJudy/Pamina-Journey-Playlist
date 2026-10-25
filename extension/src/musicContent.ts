interface PlaybackState { title: string; artist: string; album?: string; albumCover?: string; duration: number; currentTime: number; isPlaying: boolean; videoId?: string; playbackRate?: number; updatedAt: number }
const text = (selectors: string[]): string => {
  for (const selector of selectors) { const el = document.querySelector(selector); const value = el?.textContent?.trim(); if (value) return value; }
  return '';
};
const attr = (selectors: string[], name: string): string | undefined => {
  for (const selector of selectors) { const value = document.querySelector(selector)?.getAttribute(name); if (value) return value; }
  return undefined;
};
function readState(): PlaybackState | null {
  const title = text(['ytmusic-player-bar .title', 'ytmusic-player-bar #title', '.content-info-wrapper .title', 'ytmusic-player-bar [title]']);
  const artist = text(['ytmusic-player-bar .byline', 'ytmusic-player-bar #byline', '.content-info-wrapper .byline']);
  const video = document.querySelector('video');
  if (!title || !artist) return null;
  const cover = attr(['ytmusic-player-bar img.image', 'ytmusic-player-bar #img', 'ytmusic-player-bar img'], 'src');
  const album = text(['ytmusic-player-bar .album']);
  const videoId = new URL(location.href).searchParams.get('v') ?? undefined;
  return { title, artist: artist.replace(/\s*•\s*.*$/, '').trim(), ...(album ? { album } : {}), ...(cover ? { albumCover: cover.replace(/\bw\d+-h\d+/, 'w600-h600') } : {}), duration: video?.duration && Number.isFinite(video.duration) ? video.duration : 0, currentTime: video?.currentTime ?? 0, isPlaying: Boolean(video && !video.paused && !video.ended), ...(videoId ? { videoId } : {}), playbackRate: video?.playbackRate ?? 1, updatedAt: Date.now() };
}
let last = '';
function publish(): void {
  const state = readState(); if (!state) return;
  const signature = JSON.stringify(state);
  if (signature !== last) { last = signature; chrome.runtime.sendMessage({ type: 'PLAYBACK_UPDATE', payload: state }).catch(() => {}); }
}
const observer = new MutationObserver(() => publish());
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'title'] });
setInterval(publish, 1000);
document.addEventListener('yt-navigate-finish', publish);
