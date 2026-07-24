"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircleIcon, AlertCircleIcon, LockShieldIcon } from "@/components/Icon";

export default function FaceAttendanceManager({ onAttendanceSuccess, targetEmail = null }) {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanMode, setScanMode] = useState("check_in"); // 'register', 'check_in', 'punch_out'
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sampleImage, setSampleImage] = useState(null);
  const [registeredDescriptor, setRegisteredDescriptor] = useState(null);

  // Automatic Hands-Free Scanning States
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // 0 to 100%
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const progressTimerRef = useRef(null);
  const hasTriggeredAutoRef = useRef(false);

  /* ── 1. Fetch Registered Face Biometric Profile ── */
  const checkFaceStatus = async () => {
    try {
      setLoading(true);
      const url = targetEmail
        ? `/api/admin/attendance/face?email=${encodeURIComponent(targetEmail)}`
        : "/api/admin/attendance/face";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRegistered(Boolean(data.registered));
        setSampleImage(data.sampleImage || null);
        if (data.descriptor) {
          setRegisteredDescriptor(data.descriptor);
        }
      }
    } catch (err) {
      console.warn("Failed to check face registration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFaceStatus();
  }, [targetEmail]);

  /* ── 2. Facial Landmark & Geometry Vector Extractor ── */
  const extractFaceGeometryVector = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalSkinPixels = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let sumX = 0, sumY = 0;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin-tone color heuristic check
        if (r > 50 && g > 35 && b > 20 && r > g && r > b && (r - Math.min(g, b)) > 12) {
          totalSkinPixels++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const totalArea = width * height;
    const faceCoverageRatio = (faceWidth * faceHeight) / totalArea;

    if (totalSkinPixels < 200 || faceCoverageRatio < 0.04 || faceWidth < 70 || faceHeight < 70) {
      return { isHumanFace: false, reason: "No human face detected inside oval." };
    }

    // Sample 16 key facial region intensity points
    const vector = [];
    const stepX = faceWidth / 4;
    const stepY = faceHeight / 4;

    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= 4; col++) {
        const sampleX = Math.floor(minX + col * stepX);
        const sampleY = Math.floor(minY + row * stepY);
        const pIdx = (Math.min(height - 1, Math.max(0, sampleY)) * width + Math.min(width - 1, Math.max(0, sampleX))) * 4;
        const gray = (data[pIdx] * 0.299 + data[pIdx + 1] * 0.587 + data[pIdx + 2] * 0.114) / 255.0;
        vector.push(Number(gray.toFixed(4)));
      }
    }

    return {
      isHumanFace: true,
      vector,
      aspectRatio: Number((faceWidth / faceHeight).toFixed(3)),
    };
  };

  /* ── 3. Vector Similarity Classifier ── */
  const computeVectorSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 999;
    let sumSq = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq);
  };

  /* ── 4. Automatic Continuous Live Detection Loop ── */
  const runLiveFaceMonitor = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runLiveFaceMonitor);
      return;
    }

    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const geo = extractFaceGeometryVector(ctx, canvas.width, canvas.height);

    if (geo.isHumanFace) {
      setFaceDetected(true);

      // Advance automatic scan progress ring
      setScanProgress((prev) => {
        const next = Math.min(100, prev + 10);
        if (next >= 100 && !hasTriggeredAutoRef.current && !autoSubmitting) {
          hasTriggeredAutoRef.current = true;
          setAutoSubmitting(true);
          // Trigger automatic completion
          setTimeout(() => {
            if (scanMode === "register") {
              handleRegisterFaceAuto();
            } else {
              handleVerifyAndLogAttendanceAuto();
            }
          }, 200);
        }
        return next;
      });
    } else {
      setFaceDetected(false);
      setScanProgress(0);
    }

    animFrameRef.current = requestAnimationFrame(runLiveFaceMonitor);
  };

  /* ── 5. Start WebRTC Camera Feed ── */
  const startCamera = async (mode) => {
    setScanMode(mode);
    setErrorMsg("");
    setStatusMsg(mode === "register" ? "Position face inside oval frame..." : "Align face inside oval frame to auto-scan...");
    setFaceDetected(false);
    setScanProgress(0);
    setAutoSubmitting(false);
    hasTriggeredAutoRef.current = false;
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      animFrameRef.current = requestAnimationFrame(runLiveFaceMonitor);
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Camera access failed or denied. Please check browser permissions.");
    }
  };

  /* ── 6. Stop Camera & Clean Up ── */
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setProcessing(false);
    setAutoSubmitting(false);
    hasTriggeredAutoRef.current = false;
  };

  /* ── 7. Upload Snapshot to Cloudinary ── */
  const uploadToCloudinary = async (base64Image) => {
    try {
      const res = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64Image }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.secure_url || base64Image;
      }
    } catch (e) {
      console.warn("Cloudinary upload fallback to base64:", e);
    }
    return base64Image;
  };

  /* ── 8. Automatic Face Registration ── */
  const handleRegisterFaceAuto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 640;
    canvas.height = 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const geo = extractFaceGeometryVector(ctx, canvas.width, canvas.height);
    if (!geo.isHumanFace) {
      setErrorMsg("❌ No human face detected inside oval frame! Center face.");
      hasTriggeredAutoRef.current = false;
      setAutoSubmitting(false);
      return;
    }

    const rawSnapshot = canvas.toDataURL("image/jpeg", 0.85);

    try {
      setProcessing(true);
      setStatusMsg("Uploading Cloudinary biometric profile...");

      const cloudinaryUrl = await uploadToCloudinary(rawSnapshot);

      const res = await fetch("/api/admin/attendance/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: geo.vector,
          faceHash: `FACE_VEC_${geo.aspectRatio}_${Date.now()}`,
          sampleImage: cloudinaryUrl,
          targetEmail,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to register face.");
      }

      setRegistered(true);
      setRegisteredDescriptor(geo.vector);
      setSampleImage(cloudinaryUrl);
      setStatusMsg("✓ Face Biometric Profile Enrolled Successfully!");
      setTimeout(() => {
        stopCamera();
        if (onAttendanceSuccess) onAttendanceSuccess();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
      setProcessing(false);
      hasTriggeredAutoRef.current = false;
      setAutoSubmitting(false);
    }
  };

  /* ── 9. Automatic Attendance Verification (Check-In / Punch-Out) ── */
  const handleVerifyAndLogAttendanceAuto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 640;
    canvas.height = 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const geo = extractFaceGeometryVector(ctx, canvas.width, canvas.height);
    if (!geo.isHumanFace) {
      setErrorMsg("❌ No human face detected! Showing body or background is not allowed.");
      hasTriggeredAutoRef.current = false;
      setAutoSubmitting(false);
      return;
    }

    const rawSnapshot = canvas.toDataURL("image/jpeg", 0.85);

    try {
      setProcessing(true);
      setStatusMsg("Logging Attendance Check-In / Punch-Out...");

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: scanMode,
          verificationType: "face_scan",
          snapshot: rawSnapshot,
          targetEmail,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Attendance logging failed.");
      }

      setStatusMsg(`✓ ${resData.message || "Attendance Automatically Logged!"}`);
      setTimeout(() => {
        stopCamera();
        if (onAttendanceSuccess) onAttendanceSuccess();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
      setProcessing(false);
      hasTriggeredAutoRef.current = false;
      setAutoSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ACTION BAR CARD */}
      <div className="admin-surface p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <LockShieldIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Automatic Face Recognition Attendance</h3>
              {registered ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  ✓ Face Enrolled
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black uppercase px-2.5 py-0.5 rounded-full">
                  Registration Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {registered
                ? "Hands-free automatic face scanning for Check-In & Punch-Out."
                : "Enroll 16-point facial biometric profile before marking attendance."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!registered ? (
            <button
              type="button"
              onClick={() => startCamera("register")}
              className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase px-5 py-2.5 rounded-2xl shadow-md shadow-cyan-500/20 flex items-center gap-2"
            >
              <span>Enroll Face Biometric</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startCamera("check_in")}
                className="admin-button bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <span>☀️ Morning Check-In</span>
              </button>

              <button
                type="button"
                onClick={() => startCamera("punch_out")}
                className="admin-button bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-2xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
              >
                <span>🌙 Evening Punch-Out</span>
              </button>

              <button
                type="button"
                onClick={() => startCamera("register")}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold rounded-2xl border border-white/10"
                title="Update registered face template"
              >
                Re-enroll
              </button>
            </>
          )}
        </div>
      </div>

      {/* AUTOMATIC LIVE CAMERA SCANNER MODAL */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative text-center">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <LockShieldIcon className="w-4 h-4 text-cyan-400" />
                <span>
                  {scanMode === "register"
                    ? "Automatic Face Biometric Enrollment"
                    : scanMode === "check_in"
                    ? "Automatic Check-In Scan"
                    : "Automatic Punch-Out Scan"}
                </span>
              </h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* LIVE CAMERA VIEWPORT WITH HANDS-FREE AUTOMATIC PROGRESS */}
            <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border border-white/15 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* OVAL FACE ALIGNMENT FRAME & AUTOMATIC SCAN PROGRESS */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div
                  className={`w-56 h-72 rounded-[50%] border-2 transition-all duration-300 flex flex-col items-center justify-between py-6 ${
                    faceDetected
                      ? "border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.5)] bg-cyan-500/10"
                      : "border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border shadow-md ${
                      faceDetected
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    {faceDetected ? "✓ Human Face Aligned" : "❌ Position Face in Frame"}
                  </span>

                  {/* AUTOMATIC SCANNING PROGRESS BAR */}
                  {faceDetected && (
                    <div className="w-44 bg-black/70 p-2 rounded-2xl border border-cyan-400/40 backdrop-blur-md space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-cyan-300">
                        <span>Auto-Scanning...</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-150"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* REAL-TIME FEEDBACK BADGE */}
            {statusMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-cyan-400" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* CLOSE BUTTON */}
            <div className="pt-1">
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-bold uppercase text-xs"
              >
                Cancel / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
