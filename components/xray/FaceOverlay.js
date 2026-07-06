"use client"
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * FaceOverlay
 * - Props:
 *   - videoRef: ref to the <video> element
 *   - mediaId: id of the media to query xray scenes
 *   - currentTimeMs: current playback time in milliseconds
 *
 * Expects scene actor objects to include `faceBBox` as either normalized ratios (0..1)
 * { x, y, w, h } or pixel coords relative to source video (will be normalized using videoWidth/videoHeight).
 */
export default function FaceOverlay({ videoRef, mediaId, currentTimeMs }){
  const [scene, setScene] = useState(null);

  useEffect(()=>{
    if (!mediaId || currentTimeMs == null) { setScene(null); return; }
    let cancelled = false;
    (async ()=>{
      const col = collection(db, `media/${mediaId}/xray`);
      const q = query(col, where('startMs','<=', currentTimeMs));
      const snaps = await getDocs(q);
      let found = null;
      snaps.forEach(s => { const d = s.data(); if (d.startMs <= currentTimeMs && d.endMs >= currentTimeMs) found = d; });
      if (!cancelled) setScene(found || null);
    })();
    return ()=>{ cancelled = true; };
  },[mediaId, currentTimeMs]);

  if (!scene || !videoRef?.current) return null;

  const video = videoRef.current;
  const rect = video.getBoundingClientRect ? video.getBoundingClientRect() : { width: video.clientWidth || 0, height: video.clientHeight || 0 };
  const displayW = rect.width || video.clientWidth || 0;
  const displayH = rect.height || video.clientHeight || 0;
  const intrinsicW = video.videoWidth || displayW;
  const intrinsicH = video.videoHeight || displayH;

  function toPercentCoords(bbox){
    if (!bbox) return null;
    // if bbox values appear normalized (<=1), use directly
    if (bbox.x <= 1 && bbox.y <= 1 && bbox.w <= 1 && bbox.h <= 1){
      return { left: bbox.x * 100, top: bbox.y * 100, width: bbox.w * 100, height: bbox.h * 100 };
    }
    // else interpret as pixel coords relative to intrinsic size
    const left = (bbox.x / intrinsicW) * 100;
    const top = (bbox.y / intrinsicH) * 100;
    const width = (bbox.w / intrinsicW) * 100;
    const height = (bbox.h / intrinsicH) * 100;
    return { left, top, width, height };
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35 }}>
      {(scene.actorsOnScreen || []).map(actor => {
        if (!actor.faceBBox) return null;
        const pct = toPercentCoords(actor.faceBBox);
        if (!pct) return null;
        return (
          <div key={actor.personId} style={{ position: 'absolute', left: `${pct.left}%`, top: `${pct.top}%`, width: `${pct.width}%`, height: `${pct.height}%`, boxSizing: 'border-box', border: '2px solid rgba(0,200,255,0.9)', borderRadius: 4, background: 'rgba(0,200,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <a href={`/people/${actor.personId}`} style={{ pointerEvents: 'auto', margin: 4, fontSize: 12, color: '#00e0ff', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{actor.name}</a>
          </div>
        );
      })}
    </div>
  );
}
