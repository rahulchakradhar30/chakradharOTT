"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const STORY_NODES = {
  START: {
    id: "START",
    title: "Mission Briefing",
    description: "You have arrived at the high-security CyberCorp HQ. The decryption key is locked in the mainframe vault on the 45th floor.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-street-with-neon-lights-at-night-40156-large.mp4",
    poster: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd",
    choices: [
      { text: "Option A: Infiltrate via the ventilation system", target: "VENTILATION", threatImpact: 10 },
      { text: "Option B: Bribe the front lobby receptionist", target: "LOBBY", threatImpact: 25 },
    ],
  },
  VENTILATION: {
    id: "VENTILATION",
    title: "Ventilation Shaft",
    description: "You are crawling through the cold metal shafts. Suddenly, you hear guards talking directly beneath you. You see a laser grid system blocking your path.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-hand-pressing-keys-on-a-glowing-computer-keyboard-43187-large.mp4",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
    choices: [
      { text: "Disable the laser grid manually by cutting the blue wire", target: "CUT_BLUE", threatImpact: 35 },
      { text: "Hack the console using your cyber-deck bypass link", target: "CYBER_DECK", threatImpact: 15 },
    ],
  },
  LOBBY: {
    id: "LOBBY",
    title: "Reception Lobby",
    description: "You approach the reception desk. The guard asks for your authorization badge. The alarm threat levels are starting to rise.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-working-with-holographic-interface-43184-large.mp4",
    poster: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
    choices: [
      { text: "Flash a forged ID card with a confident smile", target: "FORGED_ID", threatImpact: 20 },
      { text: "Create a fire alarm distraction in the restrooms", target: "FIRE_DISTRACTION", threatImpact: 40 },
    ],
  },
  CUT_BLUE: {
    id: "CUT_BLUE",
    title: "Laser Grid Alarm",
    description: "CRITICAL FAILURE. Cutting the blue wire cut the backup power instead, triggering a silent security lockout! Guards are closing in on your position.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-police-car-lights-flashing-at-night-42289-large.mp4",
    poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    choices: [
      { text: "Surrender peacefully to protect your cover identity", target: "CAPTURED", threatImpact: 100 },
      { text: "Engage smoke bomb and escape down the elevator shaft", target: "SMOKE_ESCAPE", threatImpact: 60 },
    ],
  },
  CYBER_DECK: {
    id: "CYBER_DECK",
    title: "Decryption Terminal",
    description: "SUCCESS. The cyber-deck bypass was perfect. You access the secure terminal database. The files are downloading, but a mainframe tracing sweep has started.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-binary-code-screensaver-41908-large.mp4",
    poster: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
    choices: [
      { text: "Copy data quickly and escape through the rooftop heliport", target: "ROOFTOP_ESCAPE", threatImpact: 30 },
      { text: "Inject a malware virus to mask your extraction tracks", target: "MALWARE_INJECT", threatImpact: 50 },
    ],
  },
  FORGED_ID: {
    id: "FORGED_ID",
    title: "Mainframe Vault",
    description: "Your forged badge works. You make it into the research vault. The decryption mainframe is directly ahead, but requires a physical keycard scan to download.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-hacker-typing-code-on-a-keyboard-31711-large.mp4",
    poster: "https://images.unsplash.com/photo-1563986768609-322da13575f3",
    choices: [
      { text: "Picklock the card reader slot with a nano-key tool", target: "MALWARE_INJECT", threatImpact: 35 },
      { text: "Bypass security grid using lobby control console", target: "CAPTURED", threatImpact: 90 },
    ],
  },
  FIRE_DISTRACTION: {
    id: "FIRE_DISTRACTION",
    title: "Smoke Escape",
    description: "Smoke triggers the fire sirens! Lobby clears out in chaos. You slide into the vault during the confusion. Time is running out before authorities arrive.",
    video: "https://assets.mixkit.co/videos/preview/mixkit-fireworks-bursting-in-the-night-sky-41604-large.mp4",
    poster: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7",
    choices: [
      { text: "Steal the data drive and escape with the crowd", target: "SUCCESS_ENDING", threatImpact: 45 },
      { text: "Double-cross your agency and contact CyberCorp executives", target: "DOUBLE_AGENT", threatImpact: 80 },
    ],
  },
  CAPTURED: {
    id: "CAPTURED",
    title: "ENDING: Captured & Compromised",
    description: "You are locked inside the containment unit. CyberCorp executives stare at you behind heavy glass. The mission has failed.",
    poster: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f",
    choices: [],
    isEnding: true,
    result: "fail",
  },
  SMOKE_ESCAPE: {
    id: "SMOKE_ESCAPE",
    title: "ENDING: Lost in the Shadows",
    description: "You detonated the smoke grenade and escaped into the dark alleys, but you had to discard the decryption device. You survive, but the files are lost.",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5",
    choices: [],
    isEnding: true,
    result: "neutral",
  },
  ROOFTOP_ESCAPE: {
    id: "ROOFTOP_ESCAPE",
    title: "ENDING: Legendary Extraction",
    description: "You leap onto the landing pad just as your agency chopper arrives! The decrypt key is safe and ready. Mission Accomplished.",
    poster: "https://images.unsplash.com/photo-1473968512647-3e447244af8f",
    choices: [],
    isEnding: true,
    result: "success",
  },
  MALWARE_INJECT: {
    id: "MALWARE_INJECT",
    title: "ENDING: Ghost In the Wire",
    description: "You inject the core virus. Not only did you copy the decryption records, but you wiped their corporate backup servers clean. You dissolve into the neon night.",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
    choices: [],
    isEnding: true,
    result: "success",
  },
  DOUBLE_AGENT: {
    id: "DOUBLE_AGENT",
    title: "ENDING: The Highest Bidder",
    description: "You negotiated a multimillion crypto buyout. You walk out of the front gates with a security escort, loaded with wealth, but a marked target for life.",
    poster: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44",
    choices: [],
    isEnding: true,
    result: "neutral",
  },
  SUCCESS_ENDING: {
    id: "SUCCESS_ENDING",
    title: "ENDING: Clean Job",
    description: "Amidst the lobby chaos, you blended in perfectly. The decrypter key is in your pocket and nobody even knows you were here.",
    poster: "https://images.unsplash.com/photo-1533928298208-27ff66555d8d",
    choices: [],
    isEnding: true,
    result: "success",
  },
};

export default function InteractiveStoryPage() {
  const [currentNode, setCurrentNode] = useState(STORY_NODES.START);
  const [threatLevel, setThreatLevel] = useState(0);
  const [history, setHistory] = useState(["START"]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showChoices, setShowChoices] = useState(false);

  const videoRef = useRef(null);

  // Trigger choices panel 5 seconds into the loop (simulating timed choices checkpoint)
  useEffect(() => {
    setShowChoices(false);
    setIsPlaying(true);
    
    // Automatically show choices overlay after a delay
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setShowChoices(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentNode]);

  const handleMakeChoice = (choice) => {
    const nextNodeKey = choice.target;
    const nextNode = STORY_NODES[nextNodeKey];
    
    if (nextNode) {
      setThreatLevel((prev) => Math.min(100, prev + choice.threatImpact));
      setHistory((prev) => [...prev, nextNodeKey]);
      setCurrentNode(nextNode);
    }
  };

  const handleRestart = () => {
    setCurrentNode(STORY_NODES.START);
    setThreatLevel(0);
    setHistory(["START"]);
    setShowChoices(false);
    setIsPlaying(true);
  };

  // Determine flowchart color states
  const getNodeStatus = (nodeId) => {
    if (currentNode.id === nodeId) return "active";
    if (history.includes(nodeId)) return "visited";
    return "locked";
  };

  return (
    <div className="min-h-screen text-white relative pt-24 pb-12 px-4 md:px-8">
      {/* Background neon glows */}
      <div className="absolute inset-0 bg-[#04070f] z-0 overflow-hidden">
        <div className="absolute top-1/4 left-10 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-10 w-[600px] h-[600px] rounded-full bg-pink-500/10 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-[1.5fr_0.90fr] gap-8">
        
        {/* Left Side: Interactive Video Player */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="admin-kicker">Interactive Cinematic Story</span>
              <h1 className="text-2xl md:text-4xl font-black mt-1 bg-gradient-to-r from-cyan-300 via-blue-200 to-pink-300 bg-clip-text text-transparent">
                The Codebreaker&apos;s Dilemma
              </h1>
            </div>
            <button
              onClick={handleRestart}
              className="px-4 py-2 rounded-full border border-white/10 hover:border-cyan-400/40 hover:bg-white/5 text-xs font-bold transition"
            >
              🔄 Restart Story
            </button>
          </div>

          {/* Interactive Player Screen */}
          <div className="relative aspect-video w-full rounded-[2rem] border border-white/15 bg-black overflow-hidden shadow-2xl">
            {currentNode.video && isPlaying ? (
              <video
                ref={videoRef}
                src={currentNode.video}
                autoPlay
                loop
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={currentNode.poster}
                alt={currentNode.title}
                className="w-full h-full object-cover brightness-[0.4]"
              />
            )}

            {/* Video overlay ambient noise */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

            {/* Branch Point Text Overlay */}
            <AnimatePresence>
              {showChoices && !currentNode.isEnding && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-8 md:p-12 z-20"
                >
                  <div className="space-y-6 max-w-2xl">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-2"
                    >
                      <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-black animate-pulse">
                        ⚠️ Branch Decision Required
                      </span>
                      <h3 className="text-xl md:text-3xl font-black">{currentNode.title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">{currentNode.description}</p>
                    </motion.div>

                    <div className="grid gap-3 pt-2">
                      {currentNode.choices.map((choice, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 * idx }}
                          onClick={() => handleMakeChoice(choice)}
                          className="w-full text-left px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all font-black text-sm hover:translate-x-1"
                        >
                          {choice.text}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ending Result Overlay */}
            {currentNode.isEnding && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-md space-y-5"
                >
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                    currentNode.result === "success" 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : currentNode.result === "neutral"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}>
                    {currentNode.result === "success" ? "🎉 Mission Accomplished" : currentNode.result === "neutral" ? "⚠️ Escape Ending" : "☠️ Agent Down"}
                  </span>
                  <h3 className="text-2xl md:text-4xl font-black">{currentNode.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{currentNode.description}</p>
                  
                  <div className="pt-4 flex gap-4 justify-center">
                    <button
                      onClick={handleRestart}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm px-6 py-3 rounded-full transition shadow-lg shadow-cyan-500/25"
                    >
                      Try Another Path 🔄
                    </button>
                    <Link
                      href="/"
                      className="bg-white/10 hover:bg-white/20 border border-white/25 text-sm px-6 py-3 rounded-full transition"
                    >
                      Back to Home
                    </Link>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Decision Timeline Progress Bar */}
          <div className="glass-card border border-white/10 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Threat Detection level</p>
                <p className="text-lg font-black mt-1 text-cyan-300">{threatLevel}%</p>
              </div>
              <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-full ${
                threatLevel < 40 ? "bg-green-500/20 text-green-400" : threatLevel < 75 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400 animate-pulse"
              }`}>
                {threatLevel < 40 ? "Safe Stealth" : threatLevel < 75 ? "Caution: High Trace" : "Critical Threat Warning"}
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-700"
                style={{ width: `${threatLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Map Storyline Flowchart */}
        <div className="glass-card border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between shadow-xl">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-extrabold">Story Navigator Map</p>
              <h3 className="text-lg font-black mt-1">Decisions Route Tree</h3>
              <p className="text-xs text-gray-400 mt-1">Trace your decisions along the cyber heist storyline branches.</p>
            </div>

            <div className="space-y-4 pt-4">
              {/* START node */}
              <FlowchartNode id="START" title="Mission Briefing" status={getNodeStatus("START")} />
              
              {/* Layer 2 */}
              <div className="grid grid-cols-2 gap-4 pl-4 border-l border-white/10 my-2">
                <FlowchartNode id="VENTILATION" title="Air Vents" status={getNodeStatus("VENTILATION")} />
                <FlowchartNode id="LOBBY" title="Front Lobby" status={getNodeStatus("LOBBY")} />
              </div>

              {/* Layer 3 */}
              <div className="grid grid-cols-2 gap-4 pl-8 border-l border-white/10 my-2">
                <FlowchartNode id="CYBER_DECK" title="Decryption Deck" status={getNodeStatus("CYBER_DECK")} />
                <FlowchartNode id="FORGED_ID" title="Security Vault" status={getNodeStatus("FORGED_ID")} />
              </div>

              {/* Layer 4 Endings */}
              <div className="pl-12 border-l border-white/10 space-y-2 mt-4">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Discovered Outcomes</p>
                <div className="grid grid-cols-2 gap-2">
                  <FlowchartNode id="ROOFTOP_ESCAPE" title="🚁 Heli Extraction" status={getNodeStatus("ROOFTOP_ESCAPE")} isEnding />
                  <FlowchartNode id="MALWARE_INJECT" title="👾 Digital Ghost" status={getNodeStatus("MALWARE_INJECT")} isEnding />
                  <FlowchartNode id="DOUBLE_AGENT" title="💰 Double Agent" status={getNodeStatus("DOUBLE_AGENT")} isEnding />
                  <FlowchartNode id="CAPTURED" title="🔒 Captured" status={getNodeStatus("CAPTURED")} isEnding />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 text-center mt-8">
            <p className="text-[10px] text-gray-500 leading-normal">
              Unlocked Endings: {
                ["ROOFTOP_ESCAPE", "MALWARE_INJECT", "DOUBLE_AGENT", "CAPTURED", "SUCCESS_ENDING", "SMOKE_ESCAPE"]
                .filter(id => history.includes(id)).length
              }/6 paths
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Flowchart Map component helper
function FlowchartNode({ title, status, isEnding }) {
  const isVisited = status === "visited";
  const isActive = status === "active";
  
  return (
    <div
      className={`px-3 py-2 rounded-xl text-center border text-[11px] font-black transition-all ${
        isActive
          ? "bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/20 scale-105"
          : isVisited
          ? "bg-cyan-950/40 border-cyan-400/40 text-cyan-300"
          : isEnding
          ? "bg-white/2 border-white/5 text-gray-500"
          : "bg-white/5 border-white/10 text-gray-400"
      }`}
    >
      {title}
    </div>
  );
}
