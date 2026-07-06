"use client"
import React from 'react';

const styleContainer = {
  position: 'absolute',
  right: 20,
  bottom: 20,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const emojiStyle = (i) => ({
  transform: `translateY(${i * -12}px)`,
  animation: `floatUp 1200ms ease-out forwards`,
  fontSize: 28,
  display: 'inline-block'
});

export default function ReactionCascade({ events = [] }){
  // events: [{emoji, uid, id}]
  return (
    <div style={styleContainer} aria-hidden>
      {events.map((e, idx) => (
        <span key={e.id} style={emojiStyle(idx)} className="reaction-emoji">{e.emoji}</span>
      ))}
      <style jsx>{`
        @keyframes floatUp { from { opacity: 1; transform: translateY(0) scale(1);} to { opacity: 0; transform: translateY(-60px) scale(1.2);} }
      `}</style>
    </div>
  );
}
