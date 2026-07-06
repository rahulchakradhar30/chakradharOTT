"use client"
import React from 'react';

export default function TriviaOverlay({ session, onAnswer }) {
  // Lightweight UI stub — implement styling and realtime hooks
  if (!session) return null;
  return (
    <div className="trivia-overlay">
      <h3>Trivia: {session.title || 'Round'}</h3>
      <div className="question">{session.currentQuestion?.text}</div>
      <div className="choices">
        {(session.currentQuestion?.choices || []).map(c => (
          <button key={c.id} onClick={() => onAnswer(c.id)}>{c.text}</button>
        ))}
      </div>
    </div>
  );
}
