"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function AICineGuidePage() {
  const [movies, setMovies] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your AI CineGuide. 🍿\n\nWhat are you in the mood for tonight? Ask me for recommendations by genre, rating, release year, or tell me your current mood (e.g. 'I want a mind-bending thriller' or 'Show me something light-hearted').",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(true);

  const messagesEndRef = useRef(null);

  const STARTER_PROMPTS = [
    { text: "🎬 Best action movies", query: "action" },
    { text: "🧠 Mind-bending Sci-Fi", query: "sci-fi" },
    { text: "⭐ Top rated films", query: "top rated" },
    { text: "📅 Recent drops", query: "recent" },
  ];

  // Fetch all movies for local searching and matching
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const snapshot = await getDocs(collection(db, "movies"));
        setMovies(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        console.error("Error loading movies for AI Assistant:", err);
      } finally {
        setLoadingMovies(false);
      }
    };
    fetchMovies();
  }, []);

  // Autoscroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 1. Fetch from our Groq AI Assistant endpoint
      // Include past history sliced to prevent context overflow
      const chatHistory = [...messages, userMsg];
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!res.ok) {
        throw new Error(`AI Service status code: ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || "Sorry, I encountered an issue processing your request.";

      // 2. Parse recommendations block from replyText
      // Example block format: [RECOMMENDATIONS] movie_id_1, movie_id_2 [/RECOMMENDATIONS]
      const recRegex = /\[RECOMMENDATIONS\]\s*([\s\S]*?)\s*\[\/RECOMMENDATIONS\]/;
      const match = replyText.match(recRegex);
      let matchedMovieIds = [];
      let cleanedText = replyText;

      if (match) {
        matchedMovieIds = match[1]
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        // Strip out the bracket block for clean user visibility
        cleanedText = replyText.replace(recRegex, "").trim();
      }

      // 3. Map IDs back to full movie documents in client state
      const matchedMovies = matchedMovieIds
        .map((id) => movies.find((m) => m.id === id))
        .filter(Boolean);

      const aiMsg = {
        id: Math.random().toString(),
        sender: "ai",
        text: cleanedText,
        movies: matchedMovies.slice(0, 5), // Show up to 5 recommendations
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("AI Assistant API failed, using keyword search fallback:", err);

      // 4. Fallback search (local keyword matching)
      const normalizedQuery = textToSend.toLowerCase();
      let matched = [];
      let replyText = "";

      if (normalizedQuery.includes("action")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("action"));
        replyText = "Here are some top-tier action movies loaded with adrenaline:";
      } else if (normalizedQuery.includes("sci-fi") || normalizedQuery.includes("science fiction") || normalizedQuery.includes("space")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("sci-fi") || m.description?.toLowerCase().includes("sci-fi") || m.title?.toLowerCase().includes("space"));
        replyText = "Buckle up! These mind-bending sci-fi picks will take you to another dimension:";
      } else if (normalizedQuery.includes("thriller") || normalizedQuery.includes("suspense") || normalizedQuery.includes("mystery")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("thriller") || m.description?.toLowerCase().includes("thriller") || m.genre?.toLowerCase().includes("mystery"));
        replyText = "Prepare for suspense. These thrillers will keep you on the edge of your seat:";
      } else if (normalizedQuery.includes("comedy") || normalizedQuery.includes("funny") || normalizedQuery.includes("light-hearted")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("comedy") || m.description?.toLowerCase().includes("comedy"));
        replyText = "Need a good laugh? Try these light-hearted comedies:";
      } else if (normalizedQuery.includes("drama") || normalizedQuery.includes("emotional")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("drama") || m.description?.toLowerCase().includes("drama"));
        replyText = "Here are some deep, emotionally resonant dramas:";
      } else if (normalizedQuery.includes("horror") || normalizedQuery.includes("scary")) {
        matched = movies.filter((m) => m.genre?.toLowerCase().includes("horror") || m.description?.toLowerCase().includes("horror") || m.description?.toLowerCase().includes("scary"));
        replyText = "Turn off the lights. Here are some bone-chilling horror picks:";
      } else if (normalizedQuery.includes("top rated") || normalizedQuery.includes("best") || normalizedQuery.includes("stars") || normalizedQuery.includes("imdb")) {
        matched = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
        replyText = "Here are the absolute highest-rated cinematic masterpieces in our library:";
      } else if (normalizedQuery.includes("recent") || normalizedQuery.includes("latest") || normalizedQuery.includes("new")) {
        matched = [...movies].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 5);
        replyText = "Fresh out of the editing room! Check out our latest releases:";
      } else {
        matched = movies.filter(
          (m) =>
            m.title?.toLowerCase().includes(normalizedQuery) ||
            m.description?.toLowerCase().includes(normalizedQuery) ||
            m.genre?.toLowerCase().includes(normalizedQuery)
        );

        if (matched.length > 0) {
          replyText = `I found some matches in our catalog for "${textToSend}":`;
        } else {
          matched = movies.slice(0, 4);
          replyText = `I couldn't find exact matches for "${textToSend}", but here are some popular showcase titles you might love:`;
        }
      }

      const aiMsg = {
        id: Math.random().toString(),
        sender: "ai",
        text: replyText,
        movies: matched.slice(0, 5),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(input);
    }
  };

  return (
    <div className="min-h-screen text-white relative pt-24 pb-12 flex flex-col items-center px-4 md:px-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[#04070f] z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-purple-500/80 blur-[180px] opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="admin-kicker mb-1">Interactive Assistant</p>
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-pink-300 bg-clip-text text-transparent">
            AI CineGuide
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Your conversational shortcut to discover cinematic blockbusters
          </p>
        </div>

        {/* Chat container */}
        <div className="flex-1 min-h-[500px] glass-card border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Top Info Bar */}
          <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/20">
                  🤖
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#04070f] animate-ping" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#04070f]" />
              </div>
              <div>
                <p className="font-bold text-sm">CineGuide Agent</p>
                <p className="text-xs text-green-400">Online & Ready to Recommend</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setMessages([
                  {
                    id: "welcome",
                    sender: "ai",
                    text: "Hello! I am your AI CineGuide. 🍿\n\nWhat are you in the mood for tonight? Ask me for recommendations by genre, rating, release year, or tell me your current mood.",
                    timestamp: new Date(),
                  }
                ]);
              }}
              className="px-4 py-1.5 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-bold text-gray-400 hover:text-red-400 transition"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-sm shrink-0">
                    🤖
                  </div>
                )}

                <div className="space-y-3 max-w-[85%]">
                  {/* Chat bubble text */}
                  <div
                    className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed whitespace-pre-line border ${
                      msg.sender === "user"
                        ? "bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 rounded-tr-none text-cyan-50"
                        : "bg-white/5 border-white/10 rounded-tl-none text-gray-200"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Recommendation Cards Carousel */}
                  {msg.movies && msg.movies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 overflow-x-auto pb-3 pt-1 hide-scrollbar"
                    >
                      {msg.movies.map((movie) => (
                        <div
                          key={movie.id}
                          className="w-[180px] bg-[#0b0e1a]/95 border border-white/10 rounded-2xl overflow-hidden shrink-0 flex flex-col shadow-xl hover:border-cyan-400/40 transition duration-300"
                        >
                          <div className="relative aspect-[2/3] w-full">
                            <Image
                              src={
                                movie.posterImage ||
                                "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                              }
                              alt={movie.title}
                              fill
                              className="object-cover"
                              sizes="180px"
                            />
                            {movie.rating && (
                              <div className="absolute top-2 right-2 bg-yellow-400/90 text-[#04070f] font-black px-2 py-0.5 rounded text-[10px] shadow">
                                ⭐ {movie.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-xs line-clamp-1 text-white">
                                {movie.title}
                              </h4>
                              <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">
                                {movie.genre || "Drama"} • {movie.year || "2026"}
                              </p>
                            </div>
                            <Link
                              href={`/movie/${movie.id}`}
                              className="mt-3 block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] py-1.5 rounded-lg transition"
                            >
                              Watch Now
                            </Link>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            ))}

            {/* AI Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-sm shrink-0">
                    🤖
                  </div>
                  <div className="bg-white/5 border border-white/10 px-5 py-3.5 rounded-3xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts area */}
          <div className="px-6 pb-2 pt-3 bg-white/[0.02] border-t border-white/5 shrink-0 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt.query)}
                className="text-xs bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/10 px-3.5 py-2 rounded-full transition text-gray-300 hover:text-cyan-300 font-medium"
              >
                {prompt.text}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-4 bg-white/5 border-t border-white/10 shrink-0 flex gap-3 items-center">
            <input
              type="text"
              placeholder="Ask CineGuide... (e.g. 'Highly rated sci-fi movies')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 transition text-white placeholder:text-gray-500"
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={isTyping || !input.trim()}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-400 text-black font-extrabold rounded-2xl transition shadow-lg shadow-cyan-500/20"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
