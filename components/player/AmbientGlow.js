"use client"
import React, { useEffect, useRef } from 'react';

export default function AmbientGlow({ videoRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!videoRef?.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let raf;
    function sample() {
      try {
        canvas.width = 10;
        canvas.height = 10;
        ctx.drawImage(video, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        // compute average color
        let r=0,g=0,b=0,count=0;
        for (let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++; }
        r=Math.round(r/count); g=Math.round(g/count); b=Math.round(b/count);
        document.documentElement.style.setProperty('--ambient-r', r);
        document.documentElement.style.setProperty('--ambient-g', g);
        document.documentElement.style.setProperty('--ambient-b', b);
      } catch(e){}
      raf = requestAnimationFrame(sample);
    }
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  return <canvas ref={canvasRef} style={{display:'none'}} aria-hidden />;
}
