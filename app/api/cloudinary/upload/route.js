import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { file } = await req.json();
    if (!file) {
      return NextResponse.json({ error: "Missing file content" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureString = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.secure_url) {
      return NextResponse.json({ secure_url: data.secure_url });
    } else {
      console.error("Cloudinary API error response:", data);
      return NextResponse.json({ error: data.error?.message || "Upload failed" }, { status: 400 });
    }
  } catch (err) {
    console.error("Cloudinary route error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
