"use client"
import React, { useRef } from 'react';
import AmbientGlow from '../../components/player/AmbientGlow';

export default function WatchPartyDemo(){
  const videoRef = useRef(null);
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,padding:20}}>
      <h1>Watch Party Demo</h1>
      <div style={{position:'relative', width:720}}>
        <div style={{position:'absolute',inset:0,filter:'blur(40px)',pointerEvents:'none',background: `radial-gradient(circle at 50% 50%, rgba(var(--ambient-r,0),var(--ambient-g,0),var(--ambient-b,0),0.6), rgba(0,0,0,0))`}} />
        <video ref={videoRef} width={720} controls crossOrigin="anonymous" src="/sample.mp4" style={{position:'relative',zIndex:2,borderRadius:8}}>
          Your browser does not support the video tag.
        </video>
      </div>
      <AmbientGlow videoRef={videoRef} />
      <p style={{maxWidth:720}}>Note: place a sample file at <code>/public/sample.mp4</code> for local testing. Cross-origin resources may block canvas sampling.</p>
    </div>
  );
}
