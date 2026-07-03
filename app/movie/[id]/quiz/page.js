"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function MovieQuizPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const { user } = useAuth();
  const router = useRouter();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  // Generate dynamic, relevant questions based on actual movie metadata
  const generateQuestions = (movieData) => {
    const title = movieData.title || "this film";
    const director = movieData.director || "the director";
    const year = movieData.year || "the release year";
    const genre = movieData.genre || "Drama";

    return [
      {
        question: `Which director helmed the production of the movie "${title}"?`,
        options: [
          director,
          "Christopher Nolan",
          "Denis Villeneuve",
          "Greta Gerwig"
        ].sort(() => Math.random() - 0.5),
        correct: director
      },
      {
        question: `In which calendar year was "${title}" released to theatres?`,
        options: [
          String(year),
          String(Number(year) - 2),
          String(Number(year) + 1),
          "2022"
        ].sort(() => Math.random() - 0.5),
        correct: String(year)
      },
      {
        question: `What primary genre classification does "${title}" fall under?`,
        options: [
          genre,
          genre === "Sci-Fi" ? "Romance" : "Sci-Fi",
          genre === "Action" ? "Comedy" : "Action",
          "Documentary"
        ].sort(() => Math.random() - 0.5),
        correct: genre
      },
      {
        question: `What is the approximate runtime classification for major feature releases like "${title}"?`,
        options: [
          "90 - 150 minutes",
          "Less than 60 minutes",
          "Over 4 hours",
          "Exactly 45 minutes"
        ],
        correct: "90 - 150 minutes"
      },
      {
        question: `Which is a critical factor for a movie's commercial streaming success?`,
        options: [
          "Viewer ratings and engagement metrics",
          "The color of the main poster only",
          "Length of the end credits rolling list",
          "Type of catering provided on set"
        ],
        correct: "Viewer ratings and engagement metrics"
      }
    ];
  };

  // Fetch movie data
  useEffect(() => {
    if (!id) return;
    const fetchMovie = async () => {
      try {
        const snap = await getDoc(doc(db, "movies", id));
        if (snap.exists()) {
          const data = snap.data();
          setMovie(data);
          setQuestions(generateQuestions(data));
        }
      } catch (err) {
        console.error("Error loading quiz movie details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Countdown timer logic
  useEffect(() => {
    if (quizFinished || loading || hasSubmitted) return;

    if (timer === 0) {
      handleNextQuestion(true); // Treat as incorrect timeout
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, quizFinished, loading, hasSubmitted]);

  const handleSelectOption = (option) => {
    if (hasSubmitted) return;
    setSelectedAns(option);
  };

  const handleSubmitAnswer = () => {
    if (selectedAns === null || hasSubmitted) return;
    setHasSubmitted(true);

    if (selectedAns === questions[currentIdx].correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = (isTimeout = false) => {
    setHasSubmitted(false);
    setSelectedAns(null);
    setTimer(15);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      saveScoresToDb();
    }
  };

  // Save quiz XP to Firestore profile
  const saveScoresToDb = async () => {
    if (!user) return;
    setSavingScore(true);

    try {
      const earnedXP = score * 100;
      const userRef = doc(db, "users", user.uid);
      
      // Update cumulative XP on user profile
      await setDoc(userRef, {
        totalXP: increment(earnedXP),
        lastQuizPlayed: new Date(),
        displayName: user.displayName || user.email?.split("@")[0] || "Quiz Buff",
        photoURL: user.photoURL || null
      }, { merge: true });

      // Track individual score for this movie quiz
      const scoreRef = doc(db, "users", user.uid, "triviaScores", id);
      await setDoc(scoreRef, {
        movieId: id,
        movieTitle: movie?.title || "Unknown Film",
        score,
        totalQuestions: questions.length,
        xpEarned: earnedXP,
        playedAt: new Date()
      }, { merge: true });

    } catch (err) {
      console.error("Error saving trivia score:", err);
    } finally {
      setSavingScore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Pre-loading quiz board...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4 pt-20">
        <div className="glass-card border border-white/10 p-8 rounded-3xl text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-xl font-black">Login Required</h2>
          <p className="text-xs text-gray-400 mt-2">
            You must be logged in to test your movie knowledge and claim leaderboards XP.
          </p>
          <div className="flex gap-4 mt-6">
            <Link href="/login" className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black py-2.5 rounded-full font-black text-xs transition">
              Sign In
            </Link>
            <Link href="/" className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 py-2.5 rounded-full text-xs transition">
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="min-h-screen text-white relative pt-24 pb-12 flex flex-col items-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[#04070f] z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-yellow-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex-1 flex flex-col justify-center">
        {!quizFinished ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card border border-white/10 rounded-[2.5rem] p-6 md:p-8 flex flex-col shadow-2xl relative"
          >
            {/* Header info */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-6 text-xs text-gray-400 font-bold">
              <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
              <span className={`px-2.5 py-1 rounded-full ${timer <= 5 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-gray-300"}`}>
                ⏱️ {timer}s
              </span>
            </div>

            {/* Question Text */}
            <div className="min-h-[80px] flex items-center mb-6">
              <h2 className="text-lg md:text-xl font-black leading-relaxed">
                {currentQuestion?.question}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="grid gap-3 mb-8">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = selectedAns === option;
                const isCorrect = option === currentQuestion.correct;

                let btnStyle = "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-gray-200";
                
                if (hasSubmitted) {
                  if (isCorrect) {
                    btnStyle = "bg-green-500/20 border-green-500 text-green-400 font-black";
                  } else if (isSelected) {
                    btnStyle = "bg-red-500/20 border-red-500 text-red-400 font-black";
                  } else {
                    btnStyle = "bg-white/2 border-white/5 text-gray-500 opacity-60";
                  }
                } else if (isSelected) {
                  btnStyle = "bg-yellow-500/20 border-yellow-500 text-yellow-300 font-black";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option)}
                    disabled={hasSubmitted}
                    className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Action panel */}
            <div className="flex gap-4">
              {!hasSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAns === null}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-400 text-black font-extrabold py-3.5 rounded-full text-sm transition-all"
                >
                  Submit Answer 🎯
                </button>
              ) : (
                <button
                  onClick={() => handleNextQuestion(false)}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-3.5 rounded-full text-sm transition-all"
                >
                  {currentIdx + 1 < questions.length ? "Next Question ➡️" : "Finish Quiz 📊"}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Finished Quiz Summary page */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
          >
            {/* Custom Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(25)].map((_, idx) => (
                <motion.div
                  key={idx}
                  initial={{
                    x: Math.random() * 400 - 200,
                    y: 300,
                    opacity: 1,
                    scale: Math.random() * 0.8 + 0.4,
                  }}
                  animate={{
                    y: -100 - Math.random() * 200,
                    x: Math.random() * 600 - 300,
                    opacity: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: Math.random() * 2.5 + 1.5,
                    ease: "easeOut",
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ["#00d4ff", "#e0f2fe", "#facc15", "#f43f5e", "#a855f7"][
                      idx % 5
                    ],
                  }}
                />
              ))}
            </div>

            <p className="text-5xl mb-4">🏆</p>
            <h2 className="text-3xl font-black mb-2">Quiz Completed!</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Nice work! You just finished testing your knowledge on <span className="text-cyan-300 font-extrabold"> {movie?.title}</span>.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto my-8">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Correct Answers</p>
                <p className="text-2xl font-black text-yellow-400 mt-1">{score} / {questions.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">XP Points Gained</p>
                <p className="text-2xl font-black text-cyan-400 mt-1">+{score * 100} XP</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/trivia"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm px-8 py-3.5 rounded-full transition shadow-lg shadow-cyan-500/20"
              >
                View Global Leaderboard 📊
              </Link>
              <Link
                href="/"
                className="bg-white/10 hover:bg-white/20 border border-white/25 text-sm px-8 py-3.5 rounded-full transition"
              >
                Back to Streaming
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
