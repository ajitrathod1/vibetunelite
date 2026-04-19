export async function audioBufferToWav(
  buffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let offset = 0;

  function setUint16(data: number) {
    view.setUint16(offset, data, true);
    offset += 2;
  }

  function setUint32(data: number) {
    view.setUint32(offset, data, true);
    offset += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - offset - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let pos = 0;
  const CHUNK_SIZE = 44100 * 2; // Process 2 seconds at a time to keep UI responsive

  return new Promise((resolve) => {
    function processChunk() {
      const end = Math.min(pos + CHUNK_SIZE, buffer.length);
      
      while (pos < end) {
        for (let i = 0; i < numOfChan; i++) {
          let sample = channels[i][pos];
          sample = Math.max(-1, Math.min(1, sample)); // clamp
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
          view.setInt16(offset, sample, true); // write 16-bit sample
          offset += 2;
        }
        pos++;
      }

      if (pos < buffer.length) {
        if (onProgress) {
          onProgress((pos / buffer.length) * 100);
        }
        // Yield to main thread
        requestAnimationFrame(processChunk);
      } else {
        if (onProgress) {
          onProgress(100);
        }
        resolve(new Blob([out], { type: "audio/wav" }));
      }
    }
    
    // Start processing
    processChunk();
  });
}

