"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { auth } from "@/firebase";
import { ChatIcon, TrophyIcon, SparklesIcon, PlayIcon } from "@/components/Icon";
import FaceOverlay from './xray/FaceOverlay';

export default function VideoPlayer({
  src,
  poster,
  title = "Video",
  onTimeUpdate = () => {},
  autoPlay = false,
  onPlayPauseChange = () => {},
  movieId,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const startTimeRef = useRef(null);

  const sendWatchTimeUpdate = async (eventStatus) => {
    if (!movieId || !auth.currentUser) return;
    
    let activeSec = 0;
    if (startTimeRef.current) {
      activeSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (activeSec < 0) activeSec = 0;
      if (activeSec > 3600) activeSec = 3600; // clamp to max 1 hour
      startTimeRef.current = Date.now(); // reset timer for next segment
    }

    if (activeSec <= 0 && eventStatus !== "complete") return;

    try {
      const token = await auth.currentUser.getIdToken();
      await fetch("/api/watch-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          movieId,
          title,
          posterImage: poster || "",
          currentTime: Math.floor(videoRef.current?.currentTime || 0),
          duration: videoRef.current?.duration || 0,
          activeTime: activeSec,
          status: eventStatus
        })
      });
    } catch (err) {
      console.warn("Failed to report watch history segment:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (startTimeRef.current) {
        sendWatchTimeUpdate("stop");
      }
    };
  }, []);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState("1080p");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [showXRay, setShowXRay] = useState(false);
  
  // Floating comments list
  const [activeComment, setActiveComment] = useState(null);

  const controlsTimeoutRef = useRef(null);

  const QUALITIES = ["480p", "720p", "1080p", "4K"];
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Curated Mock X-Ray & timed comment database for premium simulation
  const xrayData = {
    cast: [
      { name: "Elena Rostova", role: "Lead Detective", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2", start: 0, end: 300 },
      { name: "Marcus Vance", role: "The Informant", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d", start: 10, end: 120 },
      { name: "Dr. Aris Thorne", role: "Cyber Geneticist", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", start: 40, end: 280 }
    ],
    music: [
      { title: "Cypher Grid (Synth Theme)", artist: "Modulator-8", time: 12 },
      { title: "Neon Rainfall", artist: "Tokio Midnight", time: 75 }
    ],
    trivia: [
      { text: "TRIVIA: The ambient synth score in this sequence was composed entirely on vintage 1980s analog synthesizers.", time: 8 },
      { text: "TRIVIA: The lead actress performed her own stunt leaps in this rainy cyberpunk alley sequence.", time: 42 },
      { text: "TRIVIA: The code flashing on the scientist's holographic monitor is actual Linux kernel source code.", time: 90 }
    ]
  };

  const timedComments = [
    { user: "Cinephile99", text: "That transition was absolutely legendary! 🔥", time: 6 },
    { user: "CyberpunkFan", text: "Look at the lighting in this background grid! 🌌", time: 24 },
    { user: "SoundtrackLover", text: "This soundtrack synth drop is giving me goosebumps.", time: 76 },
    { user: "MovieCritic", text: "The cinematography here is top tier. Easily a contender for best visual effects.", time: 105 }
  ];

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying || !containerRef.current) return;

    const hideControls = () => {
      if (!hovering) {
        setShowControls(false);
      }
    };

    controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, hovering, currentTime]);

  // Sync floating comments corresponding to playtime
  useEffect(() => {
    const comment = timedComments.find(
      (c) => currentTime >= c.time && currentTime < c.time + 3.5
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveComment(comment || null);
  }, [currentTime]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setShowXRay(true); // Auto-open X-Ray when paused (Premium feature like Prime Video!)
      } else {
        videoRef.current.play();
        setShowXRay(false);
      }
      setIsPlaying(!isPlaying);
      onPlayPauseChange(!isPlaying);
    }
  };

  const handleTimeChange = (e) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onTimeUpdate(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handlePlaybackSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(!isFullscreen);
        });
        setIsFullscreen(true);
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours > 0 ? hours + ":" : ""}${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const skipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 35; // Jump past intro scene
      setCurrentTime(35);
    }
  };

  // Determine active components on screen based on timestamp
  const currentActors = xrayData.cast.filter(
    (actor) => currentTime >= actor.start && currentTime <= actor.end
  );

  const currentSong = xrayData.music.find(
    (song) => currentTime >= song.time && currentTime <= song.time + 15
  );

  const currentTrivia = xrayData.trivia.find(
    (triv) => currentTime >= triv.time && currentTime <= triv.time + 10
  );

  const isMuted = volume === 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden select-none ${
        isFullscreen ? "fixed inset-0 z-[9999]" : "aspect-video rounded-[2rem] border border-white/10"
      }`}
      onMouseEnter={() => {
        setShowControls(true);
        setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={() => {
        setShowControls(true);
        clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 120)}
        onTimeUpdate={() => {
          setCurrentTime(videoRef.current?.currentTime || 0);
          const now = Date.now();
          if (startTimeRef.current && now - startTimeRef.current >= 10000) {
            sendWatchTimeUpdate("watching");
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setShowXRay(false);
          onPlayPauseChange(true);
          startTimeRef.current = Date.now();
          sendWatchTimeUpdate("resume");
        }}
        onPause={() => {
          setIsPlaying(false);
          onPlayPauseChange(false);
          sendWatchTimeUpdate("pause");
          startTimeRef.current = null;
        }}
        onEnded={() => {
          setIsPlaying(false);
          onPlayPauseChange(false);
          sendWatchTimeUpdate("complete");
          startTimeRef.current = null;
        }}
        onClick={handlePlayPause}
      />

      {/* Face bounding boxes overlay */}
      {movieId && (
        <FaceOverlay videoRef={videoRef} mediaId={movieId} currentTimeMs={Math.floor(currentTime*1000)} />
      )}

      {/* Floating Timed Comments Screen Display */}
      <AnimatePresence>
        {activeComment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="absolute top-6 left-6 z-40 max-w-sm glass-card border border-cyan-400/30 px-4 py-2.5 rounded-2xl flex items-start gap-2.5 shadow-[0_8px_32px_rgba(0,212,255,0.15)]"
          >
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/40 text-cyan-300 shrink-0">
              <ChatIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-cyan-300 font-extrabold tracking-wider">
                @{activeComment.user}
              </p>
              <p className="text-xs text-white/90 mt-0.5 leading-normal">
                {activeComment.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Overlay */}
      <AnimatePresence>
        {!isPlaying && !showXRay && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/30"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-400/20 border border-cyan-300/40 backdrop-blur-md flex items-center justify-center hover:bg-cyan-400/30 hover:scale-105 transition duration-300 shadow-[0_0_50px_rgba(0,212,255,0.3)]">
              <span className="text-white text-3xl ml-1">▶</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip Intro Button Overlay */}
      <AnimatePresence>
        {isPlaying && currentTime >= 8 && currentTime <= 28 && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={skipIntro}
            className="absolute bottom-20 right-6 z-40 bg-[#080c18]/90 border border-cyan-400/40 px-5 py-2.5 rounded-full font-black text-sm text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-500/10 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-1.5"
          >
            <span>Skip Intro</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quiz Prompt Challenge Overlay (Near end of movie) */}
      <AnimatePresence>
        {movieId && duration > 0 && currentTime >= duration - 25 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 glass-card border border-yellow-400/40 p-6 rounded-3xl text-center max-w-sm"
          >
            <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2 fill-current" />
            <h3 className="text-lg font-black text-yellow-300">Trivia Challenge!</h3>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Test your knowledge on this film! Complete the quiz to earn XP points and rank up.
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <Link
                href={`/movie/${movieId}/quiz`}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs px-5 py-2.5 rounded-full transition"
              >
                Start Quiz
              </Link>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = duration - 1;
                  }
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-xs px-5 py-2.5 rounded-full transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* X-Ray Slide-out Panel Overlay */}
      <AnimatePresence>
        {showXRay && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="absolute top-0 right-0 bottom-0 w-80 z-30 bg-[#060a18]/95 border-l border-white/10 backdrop-blur-xl p-5 overflow-y-auto flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs font-black tracking-widest text-cyan-400 uppercase">
                  ✦ X-Ray Panel
                </span>
                <button
                  onClick={() => setShowXRay(false)}
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  ✕ Close
                </button>
              </div>

              {/* Active Actors */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-extrabold">
                  In This Scene
                </h4>
                {currentActors.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No cast profiles loaded for this timestamp.</p>
                ) : (
                  <div className="space-y-3">
                    {currentActors.map((actor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 rounded-2xl hover:border-cyan-400/30 transition"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/20">
                          <img
                            src={actor.photo}
                            alt={actor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">{actor.name}</p>
                          <p className="text-[10px] text-cyan-300 font-medium">{actor.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scene Soundtrack */}
              {currentSong && (
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-400/25 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-cyan-400 font-black flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    Soundtrack playing
                  </h4>
                  <div>
                    <p className="text-xs font-black text-white">{currentSong.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">by {currentSong.artist}</p>
                  </div>
                </div>
              )}

              {/* Trivia Tidbits */}
              {currentTrivia && (
                <div className="bg-yellow-500/10 border border-yellow-400/20 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-yellow-400 font-black flex items-center gap-1">
                    <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" /> Production Trivia
                  </h4>
                  <p className="text-[11px] text-yellow-100/90 leading-relaxed font-medium">
                    {currentTrivia.text}
                  </p>
                </div>
              )}
            </div>

            {/* Panel Quick Actions */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handlePlayPause}
                className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-black py-2.5 rounded-full text-xs transition flex items-center justify-center gap-1"
              >
                Resume Playback <PlayIcon className="w-3 h-3 text-black fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playback Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-x-0 bottom-0 p-4 z-30 pointer-events-none"
          >
            <div className="pointer-events-auto space-y-3 bg-gradient-to-t from-[#04060e] via-[#04060e]/80 to-transparent p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
              {/* Progress Slider with timed comment dot markers */}
              <div className="relative group">
                <input
                  type="range"
                  min="0"
                  max={duration || 120}
                  value={currentTime}
                  onChange={handleTimeChange}
                  className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer appearance-none slider relative z-10"
                  style={{
                    background: `linear-gradient(to right, #00d4ff 0%, #00d4ff ${
                      duration ? (currentTime / duration) * 100 : 0
                    }%, rgba(255, 255, 255, 0.1) ${
                      duration ? (currentTime / duration) * 100 : 0
                    }%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                />

                {/* Comment marker dots overlay on timeline */}
                {duration > 0 &&
                  timedComments.map((comment, idx) => (
                    <div
                      key={idx}
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black cursor-pointer hover:scale-125 hover:bg-yellow-400 transition-all z-20"
                      style={{
                        left: `calc(${(comment.time / duration) * 100}% - 5px)`,
                      }}
                      title={`Comment by @${comment.user}`}
                    />
                  ))}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-4">
                {/* Left controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/40 text-white flex items-center justify-center hover:bg-cyan-500 hover:text-black transition"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVolume(isMuted ? 1 : 0)}
                      className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center transition"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/20 rounded cursor-pointer"
                    />
                  </div>

                  <span className="text-xs text-gray-300 font-medium ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {/* Playback speed trigger */}
                  <div className="relative group">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black text-gray-300 hover:text-white">
                      {playbackSpeed}x
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#080d1a] rounded-xl border border-white/10 overflow-hidden shadow-xl w-24">
                      {SPEEDS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handlePlaybackSpeedChange(speed)}
                          className={`w-full text-left px-3.5 py-2 text-[11px] hover:bg-white/10 transition ${
                            playbackSpeed === speed ? "text-cyan-300 font-black" : "text-gray-400"
                          }`}
                        >
                          {speed}x speed
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality select */}
                  <div className="relative group">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black text-gray-300 hover:text-white">
                      {quality}
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#080d1a] rounded-xl border border-white/10 overflow-hidden shadow-xl w-24">
                      {QUALITIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`w-full text-left px-3.5 py-2 text-[11px] hover:bg-white/10 transition ${
                            quality === q ? "text-cyan-300 font-black" : "text-gray-400"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* X-Ray manual toggle */}
                  <button
                    onClick={() => setShowXRay(!showXRay)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-black transition ${
                      showXRay
                        ? "bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                        : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                    }`}
                  >
                    X-Ray
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={handleFullscreen}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center transition"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    ⛶
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
          position: relative;
          z-index: 12;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
          position: relative;
          z-index: 12;
        }
      `}</style>
    </div>
  );
}
