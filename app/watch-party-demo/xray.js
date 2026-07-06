"use client"
import React, { useState } from 'react';
import XRayOverlay from '../../components/xray/XRayOverlay';

export default function XRayDemo(){
  const [mediaId] = useState('demoMedia');
  const [timeMs, setTimeMs] = useState(0);
  return (
    <div style={{padding:20}}>
      <h2>X-Ray Demo</h2>
      <input type="range" min={0} max={600000} value={timeMs} onChange={e=>setTimeMs(Number(e.target.value))} />
      <p>Time: {timeMs} ms</p>
      <XRayOverlay mediaId={mediaId} currentTimeMs={timeMs} />
    </div>
  );
}
