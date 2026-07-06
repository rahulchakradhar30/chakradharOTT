"use client"
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function XRayOverlay({ mediaId, currentTimeMs }) {
  const [scene, setScene] = useState(null);

  useEffect(() => {
    if (!mediaId || currentTimeMs == null) return;
    let cancelled = false;
    (async () => {
      const col = collection(db, `media/${mediaId}/xray`);
      // find scene where startMs <= currentTimeMs <= endMs
      const q = query(col, where('startMs', '<=', currentTimeMs));
      const snaps = await getDocs(q);
      let found = null;
      snaps.forEach(s => {
        const d = s.data();
        if (d.startMs <= currentTimeMs && d.endMs >= currentTimeMs) found = d;
      });
      if (!cancelled) setScene(found || null);
    })();
    return () => { cancelled = true; };
  }, [mediaId, currentTimeMs]);

  if (!scene) return null;
  return (
    <aside className="xray-overlay">
      <h4>Scene Info</h4>
      {scene.behindTheScenes && <div className="bts">{scene.behindTheScenes}</div>}
      <h5>Actors</h5>
      <ul>
        {(scene.actorsOnScreen || []).map(a => (
          <li key={a.personId}>
            <a href={`/people/${a.personId}`}>{a.name}</a> {a.role ? `— ${a.role}` : ''}
            {a.faceBBox && (
              <div className="face-bbox">BBox: {a.faceBBox.x},{a.faceBBox.y},{a.faceBBox.w},{a.faceBBox.h}</div>
            )}
          </li>
        ))}
      </ul>
      {scene.trivia && scene.trivia.length > 0 && (
        <section className="scene-trivia">
          <h5>Trivia</h5>
          <ul>
            {scene.trivia.map(t => <li key={t.id}>{t.question}</li>)}
          </ul>
        </section>
      )}
    </aside>
  );
}
