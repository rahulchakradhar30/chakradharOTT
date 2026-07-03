import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { asPositiveNumber } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const limit = await enforceRateLimit({
      scope: "razorpay_order",
      subject: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const amountRaw = asPositiveNumber(body?.amount);

    if (!amountRaw || amountRaw > 100000) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Initialize INSIDE function (fixes Vercel build error)
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amountRaw * 100), // ₹ → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`, // optional but good practice
    });

    await logServerEvent("razorpay_order_created", {
      ip,
      amount: amountRaw,
      orderId: order.id,
    });

    return NextResponse.json(order);

  } catch (err) {
    console.error("Razorpay Order Error:", err);

    await logServerEvent("razorpay_order_failed", {
      ip,
      message: err?.message || "Unknown",
    });

    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}