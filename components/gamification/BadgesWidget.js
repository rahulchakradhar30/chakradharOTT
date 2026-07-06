"use client"
import React from 'react';

export default function BadgesWidget({ badges = [] }){
  return (
    <div className="badges-widget">
      {badges.map(b => (
        <div key={b.badgeId} className="badge">
          <img src={b.iconUrl} alt={b.name} />
          <div>{b.name}</div>
        </div>
      ))}
    </div>
  );
}
