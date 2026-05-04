import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import VideoSplitter from './pages/VideoSplitter'
import VideoConverter from './pages/VideoConverter'
import VideoToMP3 from './pages/VideoToMP3'
import LocalPlayer from './pages/LocalPlayer'
import './style.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/splitter" element={<VideoSplitter />} />
        <Route path="/converter" element={<VideoConverter />} />
        <Route path="/video-to-mp3" element={<VideoToMP3 />} />
        <Route path="/player" element={<LocalPlayer />} />
      </Routes>
    </Router>
  )
}

export default App
