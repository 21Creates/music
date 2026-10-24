import { useState, useEffect, useCallback, useRef } from 'react';
import { audioManager } from '@/lib/audioManager';
import { getTrackAudioUrl } from '@/lib/audioUrl';
import { supabase } from '@/lib/supabase';
import type { Track } from '@/types';

function logPlay(track: Track) {
  supabase.from('track_plays').insert({
    room_id: track.room_id,
    track_id: track.id,
  }).then();
}

function updateMediaSession(track: Track | null, isPlaying: boolean) {
  if (!('mediaSession' in navigator) || !track) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.profiles?.display_name || 'Unknown artist',
    album: 'Vinyl',
    artwork: track.cover_url
      ? [{ src: track.cover_url, sizes: '512x512', type: 'image/png' }]
      : [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  mixMode: boolean;
}

let globalState: PlayerState = {
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  mixMode: false,
};

const listeners = new Set<() => void>();

function setState(updates: Partial<PlayerState>) {
  globalState = { ...globalState, ...updates };
  listeners.forEach((l) => l());
}

export function usePlayer() {
  const [, forceUpdate] = useState({});
  const ref = useRef(false);

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;

    audioManager.on('timeupdate', () => setState({ currentTime: audioManager.currentTime }));
    audioManager.on('durationchange', () => setState({ duration: audioManager.duration }));
    audioManager.on('ended', () => {
      if (globalState.queueIndex < globalState.queue.length - 1) {
        playQueueIndex(globalState.queueIndex + 1);
      } else {
        setState({ isPlaying: false });
      }
    });
    audioManager.on('play', () => setState({ isPlaying: true }));
    audioManager.on('pause', () => setState({ isPlaying: false }));

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => audioManager.play());
      navigator.mediaSession.setActionHandler('pause', () => audioManager.pause());
      navigator.mediaSession.setActionHandler('seekto', (d: MediaSessionActionDetails) => {
        if (d.seekTime != null) audioManager.seek(d.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (d: MediaSessionActionDetails) => {
        audioManager.seek(Math.max(0, audioManager.currentTime - (d.seekOffset || 10)));
      });
      navigator.mediaSession.setActionHandler('seekforward', (d: MediaSessionActionDetails) => {
        audioManager.seek(audioManager.currentTime + (d.seekOffset || 10));
      });
    }

    const onPageHide = () => {
      audioManager.pause();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const playQueueIndex = useCallback(async (index: number) => {
    const track = globalState.queue[index];
    if (!track) return;
    const url = await getTrackAudioUrl(track);
    if (!url) return;
    if (globalState.mixMode) {
      audioManager.crossfadeTo(url);
    } else {
      audioManager.load(url);
      audioManager.play();
    }
    setState({ currentTrack: track, queueIndex: index, isPlaying: true });
    updateMediaSession(track, true);
    logPlay(track);
  }, []);

  const playQueueIndexRef = useRef(playQueueIndex);
  playQueueIndexRef.current = playQueueIndex;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (globalState.queueIndex > 0) playQueueIndexRef.current(globalState.queueIndex - 1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (globalState.queueIndex < globalState.queue.length - 1) playQueueIndexRef.current(globalState.queueIndex + 1);
      });
    } catch {}
  }, []);

  const playTrack = useCallback(async (track: Track, queue?: Track[]) => {
    const q = queue && queue.length > 0 ? queue : [track];
    const index = q.findIndex((t) => t.id === track.id);
    setState({ queue: q, queueIndex: Math.max(0, index) });
    const url = await getTrackAudioUrl(track);
    if (!url) return;
    if (globalState.mixMode) {
      audioManager.crossfadeTo(url);
    } else {
      audioManager.load(url);
      audioManager.play();
    }
    setState({ currentTrack: track, isPlaying: true });
    updateMediaSession(track, true);
    logPlay(track);
  }, []);

  const togglePlay = useCallback(() => {
    if (globalState.isPlaying) {
      audioManager.pause();
      updateMediaSession(globalState.currentTrack, false);
    } else {
      audioManager.play();
      updateMediaSession(globalState.currentTrack, true);
    }
  }, []);

  const seek = useCallback((time: number) => {
    audioManager.seek(time);
    setState({ currentTime: time });
  }, []);

  const next = useCallback(() => {
    if (globalState.queueIndex < globalState.queue.length - 1) {
      playQueueIndex(globalState.queueIndex + 1);
    }
  }, [playQueueIndex]);

  const prev = useCallback(() => {
    if (globalState.currentTime > 3) {
      audioManager.seek(0);
      setState({ currentTime: 0 });
    } else if (globalState.queueIndex > 0) {
      playQueueIndex(globalState.queueIndex - 1);
    }
  }, [playQueueIndex]);

  const setVolume = useCallback((v: number) => {
    audioManager.setVolume(v);
    setState({ volume: v });
  }, []);

  const setMixMode = useCallback((enabled: boolean) => {
    audioManager.setMixMode(enabled);
    setState({ mixMode: enabled });
  }, []);

  const stop = useCallback(() => {
    audioManager.pause();
    audioManager.load('');
    setState({ currentTrack: null, isPlaying: false, currentTime: 0 });
  }, []);

  return {
    ...globalState,
    playTrack,
    playQueueIndex,
    togglePlay,
    seek,
    next,
    prev,
    setVolume,
    setMixMode,
    stop,
  };
}
