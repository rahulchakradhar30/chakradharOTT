"use client"
import React from 'react';

export default function ReactionCascade({ events = [] }){
  // events: [{emoji, uid, id}]
  return (
    <div className="reaction-cascade">
      {events.map(e => (
        <span key={e.id} className="reaction" aria-hidden>{e.emoji}</span>
      ))}
    </div>
  );
}
