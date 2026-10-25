export interface PlaybackState {
  title: string;
  artist: string;
  album?: string;
  albumCover?: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  videoId?: string;
  playbackRate?: number;
  updatedAt: number;
}
