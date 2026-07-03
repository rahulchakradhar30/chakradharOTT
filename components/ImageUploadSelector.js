"use client";

import { useState, useRef } from "react";

export default function ImageUploadSelector({
  label = "Image",
  value = "",
  onChange,
  required = false,
  placeholder = "Image URL",
}) {
  const [mode, setMode] = useState(value && value.startsWith("data:") ? "upload" : "url");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;

      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
          // No cloud name configured, use base64 fallback directly
          onChange(base64Data);
          setUploading(false);
          return;
        }

        const res = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: base64Data }),
        });

        if (!res.ok) {
          throw new Error("Server upload endpoint failed");
        }

        const data = await res.json();
        if (data.secure_url) {
          onChange(data.secure_url);
        } else {
          throw new Error("Secure URL missing in server response");
        }
      } catch (err) {
        console.warn("Secure upload failed, falling back to local base64:", err);
        onChange(base64Data);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2 text-left">
      <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 max-w-xs">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mode === "url"
              ? "bg-cyan-500 text-black shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Paste Link
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mode === "upload"
              ? "bg-cyan-500 text-black shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Upload File
        </button>
      </div>

      {/* Inputs */}
      {mode === "url" ? (
        <input
          type="text"
          value={value && !value.startsWith("data:") ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required && mode === "url"}
          className="admin-input focus-ring text-sm w-full"
        />
      ) : (
        <div className="border border-dashed border-white/20 rounded-2xl p-4 bg-white/2 flex flex-col items-center justify-center gap-3">
          {value ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="relative w-full max-w-[200px] aspect-video rounded-xl overflow-hidden border border-white/10">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 font-bold"
              >
                Choose another file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                required={required && mode === "upload" && !value}
                className="hidden"
                id={`file-input-${label.replace(/\s+/g, "-").toLowerCase()}`}
              />
              <label
                htmlFor={`file-input-${label.replace(/\s+/g, "-").toLowerCase()}`}
                className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Uploading...
                  </>
                ) : (
                  "Select Image File"
                )}
              </label>
              <p className="text-[10px] text-gray-500 mt-2">
                Supports JPEG, PNG, WEBP (Max 5MB)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
