import React, { useRef, useEffect, useMemo, useCallback } from 'react';

interface WaveformProps {
  bufferData: Float32Array | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function Waveform({ bufferData, currentTime, duration, onSeek }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-compute the waveform peaks to save rendering time
  const peaks = useMemo(() => {
    if (!bufferData || bufferData.length === 0) return [];
    
    // We'll draw 120 bars
    const bars = 120;
    const blockSize = Math.floor(bufferData.length / bars);
    const computedPeaks = [];
    
    let max = 0;
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(bufferData[i * blockSize + j]);
      }
      const avg = sum / blockSize;
      if (avg > max) max = avg;
      computedPeaks.push(avg);
    }
    
    // Normalize relative to maximum peak + some boost
    const multiplier = max > 0 ? (1 / max) * 0.8 : 1; 
    return computedPeaks.map(p => Math.min(1, p * multiplier));
  }, [bufferData]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use CSS geometry to deal with high DPI screens if needed
    const { width, height } = containerRef.current.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (peaks.length === 0) {
      // Draw empty decorative line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, height / 2 - 1, width, 2);
      return;
    }

    const bars = peaks.length;
    const barWidth = (width / bars) - 2;
    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const progressWidth = width * progressRatio;

    for (let i = 0; i < bars; i++) {
      const normalizedHeight = peaks[i];
      const barHeight = Math.max(4, normalizedHeight * height);

      const x = i * (width / bars);
      const y = (height - barHeight) / 2;

      // Active part vs Inactive part
      ctx.fillStyle = x < progressWidth ? '#a855f7' : 'rgba(255, 255, 255, 0.2)';
      
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();
    }
  }, [peaks, currentTime, duration]);

  // Handle Resize and Time update
  useEffect(() => {
    draw();
    
    const handleResize = () => requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Click to seek handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer" title="Click to seek">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full absolute top-0 left-0"
      />
    </div>
  );
}
