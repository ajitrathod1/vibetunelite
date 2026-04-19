import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { audioBufferToWav } from '../lib/audioBufferToWav';

export type Mood = 'none' | 'sad' | 'chill' | 'night' | 'vaporwave' | 'underwater' | 'concert' | 'dreamy';

export function useAudioEngine() {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [roomSize, setRoomSize] = useState(0.5); // Range 0.1 to 0.9
  
  const [effects, setEffects] = useState({
    slowed: false,
    reverb: false,
    lofi: false,
    subbass: false,
  });
  const [mood, setMood] = useState<Mood>('none');

  const playerRef = useRef<Tone.Player | null>(null);
  const eqRef = useRef<Tone.EQ3 | null>(null);
  const reverbRef = useRef<Tone.Freeverb | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const distRef = useRef<Tone.Distortion | null>(null);
  const compressorRef = useRef<Tone.Compressor | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize nodes
  useEffect(() => {
    const player = new Tone.Player();
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0, lowFrequency: 80 }); // Moved to 80Hz for tighter sub
    const reverb = new Tone.Freeverb({ roomSize: 0.5, dampening: 4000, wet: 0 }); // 4000Hz smooths out the ultra-high piercing ringing
    const filter = new Tone.Filter({ frequency: 20000, type: 'lowpass', rolloff: -24 });
    const dist = new Tone.Distortion({ distortion: 0.02, wet: 0 }); // Extremely low distortion
    const compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.05, release: 0.25 }); // Studio compression to prevent clipping smoothly
    const limiter = new Tone.Limiter(-1); // Safety ceiling

    player.chain(eq, filter, dist, reverb, compressor, limiter, Tone.Destination);

    playerRef.current = player;
    eqRef.current = eq;
    reverbRef.current = reverb;
    filterRef.current = filter;
    distRef.current = dist;
    compressorRef.current = compressor;
    limiterRef.current = limiter;

    return () => {
      player.dispose();
      eq.dispose();
      reverb.dispose();
      filter.dispose();
      dist.dispose();
      compressor.dispose();
      limiter.dispose();
    };
  }, []);

  // Apply Effects
  useEffect(() => {
    if (!playerRef.current || !eqRef.current || !reverbRef.current || !filterRef.current || !distRef.current) return;

    const p = playerRef.current;
    const eq = eqRef.current;
    const r = reverbRef.current;
    const f = filterRef.current;
    const d = distRef.current;

    // Base values
    let playbackRate = 1;
    let reverbWet = 0;
    let currentRoomSize = roomSize;
    let filterFreq = 20000;
    let distWet = 0;
    let bassBoost = 0;
    let mainVol = -2; // Base headroom to prevent WebAudio clipping

    // Apply manual effects
    if (effects.slowed) playbackRate = 0.8;
    if (effects.reverb) reverbWet = 0.25;
    if (effects.lofi) {
      filterFreq = 3500;
      distWet = 0.015;
    }
    if (effects.subbass) {
      bassBoost = 6; 
      mainVol = Math.min(mainVol, -8); // Drastic volume drop to absolutely prevent limiter from clipping the bass
    }

    // Apply mood overrides
    switch (mood) {
      case 'sad': 
        playbackRate = 0.7;
        reverbWet = 0.4;
        currentRoomSize = 0.75;
        filterFreq = 8000; 
        bassBoost = 2;
        mainVol = Math.min(mainVol, -4);
        break;
      case 'chill': 
        playbackRate = 0.85;
        reverbWet = 0.2;
        currentRoomSize = 0.5;
        filterFreq = 3500;
        distWet = 0; // Removed distortion
        bassBoost = 2;
        mainVol = Math.min(mainVol, -3);
        break;
      case 'night': 
        playbackRate = 0.75;
        reverbWet = 0.35;
        currentRoomSize = 0.75;
        filterFreq = 2000;
        distWet = 0; 
        bassBoost = 6;
        mainVol = Math.min(mainVol, -8); // Huge headroom for bass
        break;
      case 'vaporwave': 
        playbackRate = 0.65;
        reverbWet = 0.45;
        currentRoomSize = 0.78;
        filterFreq = 5000;
        distWet = 0.02; // Small analog crunch
        bassBoost = 0;
        mainVol = Math.min(mainVol, -3);
        break;
      case 'underwater': 
        playbackRate = 0.8;
        reverbWet = 0.5;
        currentRoomSize = 0.3; 
        filterFreq = 500; 
        distWet = 0;
        bassBoost = 5;
        mainVol = Math.min(mainVol, -6);
        break;
      case 'concert': 
        playbackRate = 1.0;
        reverbWet = 0.5;
        currentRoomSize = 0.78; 
        filterFreq = 16000;
        distWet = 0;
        bassBoost = 4;
        mainVol = Math.min(mainVol, -5); 
        break;
      case 'dreamy': 
        playbackRate = 0.8;
        reverbWet = 0.6;
        currentRoomSize = 0.78;
        filterFreq = 10000;
        distWet = 0;
        bassBoost = 0;
        mainVol = Math.min(mainVol, -4);
        break;
    }

    // Safety clamp to totally eliminate Freeverb ringing
    currentRoomSize = Math.min(currentRoomSize, 0.78);

    // Smoothly ramp parameters to avoid clicks
    p.playbackRate = playbackRate;
    p.volume.rampTo(mainVol, 0.1);
    eq.low.rampTo(bassBoost, 0.1);
    r.wet.value = reverbWet;
    r.roomSize.value = currentRoomSize;
    f.frequency.rampTo(filterFreq, 0.1);
    d.wet.rampTo(distWet, 0.1);

  }, [effects, mood, roomSize]);

  // Load Audio
  const loadAudio = async (file: File) => {
    if (!playerRef.current) return;
    setIsProcessing(true);
    
    try {
      await Tone.start();
      const url = URL.createObjectURL(file);
      await playerRef.current.load(url);
      
      setFileName(file.name);
      setDuration(playerRef.current.buffer.duration);
      setIsReady(true);
      setProgress(0);
      setIsPlaying(false);
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      
      // Sync player to transport
      playerRef.current.sync().start(0);
    } catch (err) {
      console.error("Error loading audio:", err);
      alert("Failed to load audio. Please ensure it's a valid audio file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Playback Control
  const togglePlay = async () => {
    if (!isReady) return;
    await Tone.start();
    
    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  // Seek
  const seek = (time: number) => {
    if (!isReady) return;
    Tone.Transport.seconds = time;
    setProgress(time);
  };

  // Progress Loop
  useEffect(() => {
    const updateLoop = () => {
      if (isPlaying && isReady && playerRef.current) {
        setProgress(Tone.Transport.seconds);
        
        const currentRate = playerRef.current.playbackRate;
        const effectiveDuration = duration / currentRate;
        
        if (Tone.Transport.seconds >= effectiveDuration) {
          Tone.Transport.stop();
          Tone.Transport.position = 0;
          setIsPlaying(false);
          setProgress(0);
        }
      }
      animationRef.current = requestAnimationFrame(updateLoop);
    };
    
    animationRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isReady, duration]);

  // Export
  const exportAudio = async () => {
    if (!isReady || !playerRef.current || !eqRef.current || !reverbRef.current || !filterRef.current || !distRef.current || !limiterRef.current) return;
    
    setIsExporting(true);
    setExportProgress(0);

    // Initial progress bar animation for the "rendering" phase
    const progressInterval = setInterval(() => {
      setExportProgress(p => {
        const increment = (30 - p) * 0.1; // Slow down at 30% while Tone.Offline renders
        return p + increment;
      });
    }, 100);

    try {
      const currentRate = playerRef.current.playbackRate;
      const currentVol = playerRef.current.volume.value;
      const effectiveDuration = duration / currentRate;
      
      const currentBass = eqRef.current.low.value;
      const rSize = reverbRef.current.roomSize.value;
      const rWet = reverbRef.current.wet.value;
      const fFreq = filterRef.current.frequency.value;
      const dWet = distRef.current.wet.value;
      const buffer = playerRef.current.buffer;

      // Render offline 
      const renderedBuffer = await Tone.Offline(async ({ transport }) => {
        const offlinePlayer = new Tone.Player(buffer);
        const offlineEq = new Tone.EQ3({ low: currentBass, mid: 0, high: 0, lowFrequency: 80 });
        const offlineReverb = new Tone.Freeverb({ roomSize: Math.min(rSize, 0.78), dampening: 4000, wet: rWet });
        
        const offlineFilter = new Tone.Filter({ frequency: fFreq, type: 'lowpass', rolloff: -24 });
        const offlineDist = new Tone.Distortion({ distortion: 0.02, wet: dWet });
        const offlineCompressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.05, release: 0.25 });
        const offlineLimiter = new Tone.Limiter(-1);
        
        offlinePlayer.playbackRate = currentRate;
        offlinePlayer.volume.value = currentVol;
        
        offlinePlayer.chain(offlineEq, offlineFilter, offlineDist, offlineReverb, offlineCompressor, offlineLimiter).toDestination();
        
        offlinePlayer.sync().start(0);
        transport.start(0);
      }, effectiveDuration + 5); // Add fixed tail since freeverb doesn't have length
      
      clearInterval(progressInterval);
      setExportProgress(30);

      // Convert to WAV - this is the heavy part, so we pass progress updates (30% to 100%)
      const wavBlob = await audioBufferToWav(renderedBuffer.get(), (p) => {
        setExportProgress(30 + (p * 0.7)); // Map 0-100 to 30-100
      });
      
      // Download
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VibeTune_${fileName?.replace(/\.[^/.]+$/, "") || "export"}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export audio: " + (err instanceof Error ? err.message : String(err)));
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1500);
    }
  };

  return {
    isReady,
    isPlaying,
    progress,
    duration,
    fileName,
    isProcessing,
    isExporting,
    exportProgress,
    roomSize,
    setRoomSize,
    effects,
    setEffects,
    mood,
    setMood,
    loadAudio,
    togglePlay,
    seek,
    exportAudio,
    playbackRate: playerRef.current?.playbackRate || 1
  };
}
