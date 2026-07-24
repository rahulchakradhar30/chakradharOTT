"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircleIcon, AlertCircleIcon, LockShieldIcon } from "@/components/Icon";

export default function FaceAttendanceManager({ onAttendanceSuccess }) {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanMode, setScanMode] = useState("check_in"); // 'register', 'check_in', 'punch_out'
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sampleImage, setSampleImage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  /* ── 1. Fetch Face Registration Status ── */
  const checkFaceStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/attendance/face");
      if (res.ok) {
        const data = await res.json();
        setRegistered(Boolean(data.registered));
        setSampleImage(data.sampleImage || null);
      }
    } catch (err) {
      console.warn("Failed to check face registration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFaceStatus();
  }, []);

  /* ── 2. Start WebRTC Camera Feed ── */
  const startCamera = async (mode) => {
    setScanMode(mode);
    setErrorMsg("");
    setStatusMsg(mode === "register" ? "Position face inside oval frame to enroll..." : "Scanning face for biometric verification...");
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
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Camera access failed or denied. Please check permissions or submit a Manual Regularization Request.");
    }
  };

  /* ── 3. Stop WebRTC Camera Stream ── */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setProcessing(false);
  };

  /* ── 4. Extract Feature Hash Descriptor from Video Frame ── */
  const captureSnapshotAndHash = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshotData = canvas.toDataURL("image/jpeg", 0.8);

    // Generate lightweight canvas feature descriptor hash
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 0;
    for (let i = 0; i < imageData.data.length; i += 64) {
      hash = (hash << 5) - hash + imageData.data[i];
      hash |= 0;
    }

    return { snapshotData, faceHash: `FACE_${Math.abs(hash)}` };
  };

  /* ── 5. Perform Face Registration ── */
  const handleRegisterFace = async () => {
    const data = captureSnapshotAndHash();
    if (!data) {
      setErrorMsg("Failed to capture video frame. Please retry.");
      return;
    }

    try {
      setProcessing(true);
      setStatusMsg("Saving facial biometric descriptor...");

      const res = await fetch("/api/admin/attendance/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceHash: data.faceHash,
          sampleImage: data.snapshotData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to register face.");
      }

      setRegistered(true);
      setSampleImage(data.snapshotData);
      setStatusMsg("Face biometric profile enrolled successfully!");
      setTimeout(() => {
        stopCamera();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
      setProcessing(false);
    }
  };

  /* ── 6. Perform Camera Attendance Verification (Check-In / Punch-Out) ── */
  const handleVerifyAndLogAttendance = async () => {
    const data = captureSnapshotAndHash();
    if (!data) {
      setErrorMsg("Failed to capture camera frame. Please retry.");
      return;
    }

    try {
      setProcessing(true);
      setStatusMsg("Verifying face descriptor against registered profile...");

      // Submit attendance Check-In / Punch-Out to API
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: scanMode, // 'check_in' or 'punch_out'
          verificationType: "face_scan",
          snapshot: data.snapshotData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Attendance logging failed.");
      }

      setStatusMsg(resData.message || `${scanMode === "check_in" ? "Check-In" : "Punch-Out"} Verified!`);
      setTimeout(() => {
        stopCamera();
        if (onAttendanceSuccess) onAttendanceSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
      setProcessing(false);
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
              <h3 className="text-sm font-bold text-white">Biometric Face Recognition Attendance</h3>
              {registered ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✓ Face Enrolled
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black uppercase px-2 py-0.5 rounded-full">
                  Registration Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {registered
                ? "Use live camera scan for Morning Check-In & Evening Shift Punch-Out."
                : "Register your facial biometric template first before marking attendance."}
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

      {/* CAMERA SCANNER MODAL */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative text-center">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <LockShieldIcon className="w-4 h-4 text-cyan-400" />
                <span>
                  {scanMode === "register"
                    ? "Face Biometric Enrollment"
                    : scanMode === "check_in"
                    ? "Morning Check-In Scan"
                    : "Shift Punch-Out Scan"}
                </span>
              </h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* LIVE CAMERA VIEWPORT WITH OVAL OVERLAY */}
            <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border border-white/15 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Oval Face Alignment Target Mask */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-72 rounded-[50%] border-2 border-dashed border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse flex items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 bg-black/60 px-2 py-1 rounded-full border border-cyan-500/30">
                    Align Face Here
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS & ERROR FEEDBACK */}
            {statusMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-cyan-400" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-bold uppercase text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={scanMode === "register" ? handleRegisterFace : handleVerifyAndLogAttendance}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                {processing
                  ? "Processing..."
                  : scanMode === "register"
                  ? "Capture & Enroll Face"
                  : "Verify & Log Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
