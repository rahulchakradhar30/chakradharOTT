"use client"
import React from 'react';

export default function XRayOverlay({ scene }) {
  if (!scene) return null;
  return (
    <aside className="xray-overlay">
      <h4>Scene Info</h4>
      <div>{scene.behindTheScenes}</div>
      <h5>Actors</h5>
      <ul>
        {(scene.actorsOnScreen || []).map(a => <li key={a.personId}>{a.name} — {a.role || ''}</li>)}
      </ul>
    </aside>
  );
}
