import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
const ffmpeg = new FFmpeg();

export async function loadFFmpeg(setStatus) {
  if (ffmpeg.loaded) return;

  ffmpeg.on('log', ({ message }) => {
    console.log(message);
  });

  setStatus('Loading FFmpeg (~20MB from CDN)...');
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });
  setStatus('FFmpeg Ready');
}

export async function convertVideo(file, outputFormat, setProgress, setStatus) {
  let progressHandler;

  try {
    await loadFFmpeg(setStatus);

    progressHandler = ({ progress }) => {
      setProgress(Number((progress * 100).toFixed(2)));
    };
    ffmpeg.on('progress', progressHandler);

    setStatus(`Converting to ${outputFormat.toUpperCase()}...`);
    
    const outputName = `output.${outputFormat}`;

    // Cleanup previous files
    try {
      await ffmpeg.deleteFile('input');
      await ffmpeg.deleteFile(outputName);
    } catch (e) {}

    await ffmpeg.writeFile('input', await fetchFile(file));

    // Explicitly map audio and video streams for complex files like Blu-ray rips.
    // Copy video for speed, but convert audio to AAC for wide compatibility across formats.
    await ffmpeg.exec([
      '-i', 'input',
      '-map', '0:v:0',    // Map first video stream
      '-map', '0:a:0?',   // Map first audio stream if it exists
      '-c:v', 'copy',     // Copy video to retain quality and speed
      '-c:a', 'aac',      // Encode audio to AAC for better format compatibility (e.g., MP4)
      '-b:a', '192k',     // Audio bitrate
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    setStatus('Done');
    return { name: `converted.${outputFormat}`, data, format: outputFormat };
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error?.message || 'Failed to convert video'}`);
    throw error;
  } finally {
    if (progressHandler) {
      ffmpeg.off('progress', progressHandler);
    }
  }
}

export async function convertToAudio(file, setProgress, setStatus) {
  let progressHandler;

  try {
    await loadFFmpeg(setStatus);

    progressHandler = ({ progress }) => {
      setProgress(Number((progress * 100).toFixed(2)));
    };
    ffmpeg.on('progress', progressHandler);

    setStatus(`Extracting MP3...`);
    
    const outputName = `output.mp3`;

    // Cleanup previous files
    try {
      await ffmpeg.deleteFile('input');
      await ffmpeg.deleteFile(outputName);
    } catch (e) {}

    await ffmpeg.writeFile('input', await fetchFile(file));

    await ffmpeg.exec([
      '-i', 'input',
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', '192k',
      '-ar', '44100',
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    setStatus('Done');
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    return { name: `${originalName}.mp3`, data, format: 'mp3' };
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error?.message || 'Failed to extract MP3'}`);
    throw error;
  } finally {
    if (progressHandler) {
      ffmpeg.off('progress', progressHandler);
    }
  }
}

export async function splitVideo(file, segmentTime, setProgress, setStatus) {
  let progressHandler;

  try {
    await loadFFmpeg(setStatus);

    progressHandler = ({ progress }) => {
      setProgress(Number((progress * 100).toFixed(2)));
    };
    ffmpeg.on('progress', progressHandler);

    setStatus('Processing video...');

    const existingFiles = await ffmpeg.listDir('/');
    for (const f of existingFiles) {
      if (f.name.startsWith('chunk_') || f.name === 'input.mp4') {
        try {
          await ffmpeg.deleteFile(f.name);
        } catch {
          // Ignore cleanup failures; they should not block the new split.
        }
      }
    }

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c', 'copy',
      '-map', '0:v:0',    // Explicitly map first video stream
      '-map', '0:a:0?',   // Explicitly map first audio stream if exists
      '-sn',              // Disable subtitle mapping
      '-dn',              // Disable data mapping
      '-ignore_unknown',  // Safety for metadata
      '-segment_time', String(segmentTime),
      '-f', 'segment',
      'chunk_%03d.mp4'
    ]);

    const files = await ffmpeg.listDir('/');
    const chunkFiles = files.filter((entry) => !entry.isDir && entry.name.startsWith('chunk_'));

    const chunks = [];
    for (const chunk of chunkFiles) {
      const data = await ffmpeg.readFile(chunk.name);
      chunks.push({ name: chunk.name, data });
    }

    setStatus('Done');
    return chunks;
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error?.message || 'Failed to split video'}`);
    throw error;
  } finally {
    if (progressHandler) {
      ffmpeg.off('progress', progressHandler);
    }
  }
}
