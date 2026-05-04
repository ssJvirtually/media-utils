import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

function LocalPlayer() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!videoRef.current) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          if (e.target.tagName === 'INPUT') return; // Don't trigger on spacebar when typing in the input
          e.preventDefault(); // Prevent scrolling
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
          break;
        case 'f':
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          toggleFullScreen();
          break;
        case 'arrowright':
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          videoRef.current.currentTime += 10;
          break;
        case 'arrowleft':
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          videoRef.current.currentTime -= 10;
          break;
        case 'arrowup':
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
          break;
        case 'arrowdown':
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      alert("Please select a valid video file.");
      return;
    }
    
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }
    
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setFileName(file.name);
    setUrlInput('');
  };

  const handleLoadUrl = () => {
    if (!urlInput.trim()) return;
    
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }
    
    setVideoSrc(urlInput.trim());
    setFileName(`Network Stream: ${urlInput.trim()}`);
  };

  const handleOpenFile = async () => {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Videos',
            accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.m3u8'] }
          }],
          excludeAcceptAllOption: false,
          multiple: false
        });
        const file = await fileHandle.getFile();
        loadFile(file);
      } else {
        // Fallback for browsers that don't support File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
          if (e.target.files.length > 0) loadFile(e.target.files[0]);
        };
        input.click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error opening file:", err);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Link to="/" className="back-link">← Back to Home</Link>
      <h1>📺 Universal Video Player</h1>
      <p className="description">Play local videos instantly or stream directly from a network URL.</p>

      <div className="settings-row" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
        <button className="button" onClick={handleOpenFile}>
          📁 Open Local File
        </button>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>OR</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="url"
            className="duration-input"
            style={{ width: '300px', maxWidth: '100%' }}
            placeholder="Paste Video URL here..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
          />
          <button className="button secondary" onClick={handleLoadUrl} style={{ minWidth: 'auto', padding: '12px 24px' }}>
            🌐 Play URL
          </button>
        </div>
      </div>

      <div className="player-container" ref={containerRef}>
        {isDragging && (
          <div className="drop-overlay">
            <h2>Drop Video Here</h2>
          </div>
        )}
        
        {videoSrc ? (
          <video 
            ref={videoRef} 
            src={videoSrc} 
            controls 
            autoPlay 
            onDoubleClick={toggleFullScreen}
          />
        ) : (
          <div className="player-empty-state">
            <div className="icon">📂</div>
            <h3>No Video Selected</h3>
            <p>Open a file, drag & drop, or paste a network stream URL.</p>
            <small style={{ marginTop: '1rem', opacity: 0.7 }}>
              Shortcuts: [Space] Play/Pause, [F] Fullscreen, [Arrows] Seek/Volume
            </small>
          </div>
        )}
      </div>

      {fileName && (
        <p style={{ marginTop: '1rem', fontWeight: 'bold', wordBreak: 'break-all' }}>Playing: {fileName}</p>
      )}
    </div>
  );
}

export default LocalPlayer;