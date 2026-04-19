import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useAudioEngine, Mood } from './hooks/useAudioEngine';
import { Upload, Play, Pause, Download, Music, Settings2, AlertCircle, Loader2, Maximize, Orbit, SlidersHorizontal } from 'lucide-react';
import { cn } from './lib/utils';
import { Waveform } from './components/Waveform';

export default function App() {
  const {
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
    pitch,
    setPitch,
    effects,
    setEffects,
    mood,
    setMood,
    bufferData,
    loadAudio,
    togglePlay,
    seek,
    exportAudio,
    playbackRate
  } = useAudioEngine();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      loadAudio(file);
    } else {
      alert('Please upload a valid audio file.');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      loadAudio(file);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = duration / playbackRate;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">
            VibeTune Lite
          </h1>
          <p className="text-white/50 text-lg md:text-xl font-medium tracking-wide">
            Slowed • Reverb • Lofi • SubBass
          </p>
        </header>

        {/* Upload Section */}
        {!isReady && !isProcessing && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group",
              isDragging 
                ? "border-purple-500 bg-purple-500/10" 
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-white/70" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Upload Audio</h3>
              <p className="text-white/40 text-sm">Drag & drop or click to browse (Max 10MB)</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="border border-white/10 bg-white/5 rounded-3xl p-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-white/70 font-medium animate-pulse">Processing audio...</p>
          </div>
        )}

        {/* Player & Controls */}
        {isReady && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Player Card */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl shadow-purple-900/10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg truncate max-w-[200px] md:max-w-md">
                      {fileName}
                    </h3>
                    <p className="text-white/40 text-sm font-mono">
                      {formatTime(effectiveDuration)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar (Waveform) */}
              <div className="space-y-2 mb-8">
                <div className="h-24 w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                  <Waveform 
                    bufferData={bufferData} 
                    currentTime={progress} 
                    duration={effectiveDuration} 
                    onSeek={seek} 
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-white/40">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(effectiveDuration)}</span>
                </div>
              </div>

              {/* Play Controls */}
              <div className="flex justify-center">
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-1" />
                  )}
                </button>
              </div>
            </div>

            {/* Effects & Moods Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Manual Effects */}
              <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6 text-white/70">
                  <Settings2 className="w-5 h-5" />
                  <h3 className="font-semibold uppercase tracking-wider text-sm">Manual Effects</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <EffectButton
                    active={effects.slowed}
                    onClick={() => {
                      setEffects(prev => ({ ...prev, slowed: !prev.slowed }));
                      setMood('none');
                    }}
                    label="Slowed"
                  />
                  <EffectButton
                    active={effects.reverb}
                    onClick={() => {
                      setEffects(prev => ({ ...prev, reverb: !prev.reverb }));
                      setMood('none');
                    }}
                    label="Reverb"
                  />
                  <EffectButton
                    active={effects.lofi}
                    onClick={() => {
                      setEffects(prev => ({ ...prev, lofi: !prev.lofi }));
                      setMood('none');
                    }}
                    label="Lofi Filter"
                  />
                  <EffectButton
                    active={effects.subbass}
                    onClick={() => {
                      setEffects(prev => ({ ...prev, subbass: !prev.subbass }));
                      setMood('none');
                    }}
                    label="Deep SubBass"
                  />
                  <EffectButton
                    active={effects.eightD}
                    onClick={() => {
                      setEffects(prev => ({ ...prev, eightD: !prev.eightD }));
                      setMood('none');
                    }}
                    label="🎧 8D Audio"
                  />
                  <EffectButton
                    active={effects.slowed && effects.reverb && effects.lofi && effects.subbass && effects.eightD}
                    onClick={() => {
                      const allActive = effects.slowed && effects.reverb && effects.lofi && effects.subbass && effects.eightD;
                      setEffects({ slowed: !allActive, reverb: !allActive, lofi: !allActive, subbass: !allActive, eightD: !allActive });
                      setMood('none');
                    }}
                    label="All Effects Combined"
                    className="col-span-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border-purple-500/30"
                  />
                </div>

                <div className="mt-8 space-y-6">
                  {/* Pitch Slider */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-white/70">
                      <SlidersHorizontal className="w-4 h-4" />
                      <h3 className="font-semibold uppercase tracking-wider text-xs">Pitch Level (Semitones)</h3>
                      <span className="ml-auto text-xs font-mono text-purple-400">
                        {pitch > 0 ? `+${pitch}` : pitch} st
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={pitch}
                      onChange={(e) => {
                        setPitch(Number(e.target.value));
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 mt-2 font-mono">
                      <span>-12</span>
                      <span>0</span>
                      <span>+12</span>
                    </div>
                  </div>

                  {/* Room Size Slider */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-white/70">
                      <Maximize className="w-4 h-4" />
                      <h3 className="font-semibold uppercase tracking-wider text-xs">Reverb Room Size</h3>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.85}
                      step={0.01}
                      value={roomSize}
                      onChange={(e) => {
                        setRoomSize(Number(e.target.value));
                        if (!effects.reverb && mood === 'none') {
                          setEffects(prev => ({ ...prev, reverb: true }));
                        }
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 mt-2 font-mono">
                      <span>Small Space</span>
                      <span>Arena</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mood Presets */}
              <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6 text-white/70">
                  <Music className="w-5 h-5" />
                  <h3 className="font-semibold uppercase tracking-wider text-sm">Mood Presets</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MoodButton
                    active={mood === 'sad'}
                    onClick={() => {
                      setMood('sad');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="🌧️ Sad (Slow, Echoey)"
                  />
                  <MoodButton
                    active={mood === 'chill'}
                    onClick={() => {
                      setMood('chill');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="☕ Chill Study (Tape Warmth)"
                  />
                  <MoodButton
                    active={mood === 'night'}
                    onClick={() => {
                      setMood('night');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="🌃 Night Drive (Super Bass)"
                  />
                  <MoodButton
                    active={mood === 'vaporwave'}
                    onClick={() => {
                      setMood('vaporwave');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="🦩 Vaporwave (80s vibe)"
                  />
                  <MoodButton
                    active={mood === 'underwater'}
                    onClick={() => {
                      setMood('underwater');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="🌊 Underwater (Drowning)"
                  />
                  <MoodButton
                    active={mood === 'concert'}
                    onClick={() => {
                      setMood('concert');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="🏟️ Live Concert (Arena)"
                  />
                  <MoodButton
                    active={mood === 'dreamy'}
                    onClick={() => {
                      setMood('dreamy');
                      setEffects({ slowed: false, reverb: false, lofi: false, subbass: false });
                    }}
                    label="☁️ Dreamy (Floaty, Airy)"
                  />
                </div>
              </div>
            </div>

            {/* Big Export Section */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-6 shadow-2xl shadow-purple-900/10">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Ready to save?</h3>
                <p className="text-white/40 text-sm">Export your processed audio as a high-quality WAV file.</p>
              </div>
              
              <button
                onClick={exportAudio}
                disabled={isExporting}
                className="w-full md:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
              >
                {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                <span>{isExporting ? 'Processing Export...' : 'Export Full Song'}</span>
              </button>

              {isExporting && (
                <div className="w-full max-w-md space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-between text-sm text-white/70 font-mono">
                    <span>Exporting...</span>
                    <span>{Math.round(exportProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer / Legal Notice */}
        <footer className="mt-auto pt-8 border-t border-white/10 flex items-start gap-3 text-white/40 text-xs md:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Legal Notice:</strong> This tool only processes user-uploaded audio locally in your browser. 
            No data is sent to any server. Do not upload copyrighted content without permission.
          </p>
        </footer>
      </main>
    </div>
  );
}

function EffectButton({ active, onClick, label, className }: { active: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-2xl border text-sm font-medium transition-all duration-300",
        active 
          ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
        className
      )}
    >
      {label}
    </button>
  );
}

function MoodButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-2xl border text-sm font-medium transition-all duration-300 text-left w-full",
        active 
          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}
