"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function PremiereTicketsClient() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { user } = useAuth();

  const [premiere, setPremieres] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [userTickets, setUserTickets] = useState([]);

  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPremiere = async () => {
      try {
        const docRef = doc(db, "premieres", String(id));
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Premiere not found");
          return;
        }

        setPremieres({ id: docSnap.id, ...docSnap.data() });
        setError(null);

        // Load user's tickets for this premiere
        if (user?.uid) {
          const userTicketQuery = query(
            collection(db, "users", user.uid, "tickets"),
            where("premiereId", "==", String(id))
          );
          const ticketSnap = await getDocs(userTicketQuery);
          setUserTickets(ticketSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else {
          setUserTickets([]);
        }
      } catch (err) {
        console.error("Error fetching premiere:", err);
        setError("Failed to load premiere");
      } finally {
        setLoading(false);
      }
    };

    fetchPremiere();
  }, [id, user?.uid]);

  // Handle Ticket Code Redemption
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!user?.uid) {
      alert("Please login first");
      router.push("/login");
      return;
    }
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;

    try {
      setRedeeming(true);

      const ticketRef = doc(db, "premieres", id, "tickets", code);
      const snap = await getDoc(ticketRef);

      if (!snap.exists()) {
        alert("Invalid ticket code. Please check and try again.");
        return;
      }

      const ticketData = snap.data();
      if (ticketData.used) {
        alert("This ticket code has already been claimed or marked as used.");
        return;
      }

      // Add to user tickets collection
      const userTicketRef = doc(db, "users", user.uid, "tickets", code);
      await setDoc(userTicketRef, {
        ticketCode: code,
        premiereId: id,
        title: premiere.title,
        purchasedAt: new Date(),
      });

      // Update status in premiere tickets subcollection
      await setDoc(ticketRef, {
        used: true,
        claimedBy: user.uid,
        claimedAt: new Date(),
      }, { merge: true });

      alert("🎉 Ticket code claimed successfully!");
      setRedeemCode("");

      // Reload user tickets list
      const userTicketQuery = query(
        collection(db, "users", user.uid, "tickets"),
        where("premiereId", "==", id)
      );
      const ticketSnap = await getDocs(userTicketQuery);
      setUserTickets(ticketSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Redemption error:", err);
      alert("Failed to redeem ticket: " + err.message);
    } finally {
      setRedeeming(false);
    }
  };

  // Handle Razorpay Payment
  const handlePayment = async () => {
    if (!user?.uid) {
      alert("Please login to buy tickets");
      router.push("/login");
      return;
    }

    try {
      setPaymentLoading(true);

      // Sandbox Fallback: Check if Razorpay keys are loaded. If not, bypass to help testing
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
      if (!rzpKey) {
        console.warn("NEXT_PUBLIC_RAZORPAY_KEY is missing. Triggering sandbox testing ticket creation.");
        const sandboxCode = "SANDBOX-" + Math.random().toString(36).substr(2, 6).toUpperCase();

        const userTicketRef = doc(db, "users", user.uid, "tickets", sandboxCode);
        await setDoc(userTicketRef, {
          ticketCode: sandboxCode,
          premiereId: id,
          title: premiere.title,
          purchasedAt: new Date(),
          isSandbox: true
        });

        const premiereTicketRef = doc(db, "premieres", id, "tickets", sandboxCode);
        await setDoc(premiereTicketRef, {
          code: sandboxCode,
          used: true,
          createdAt: new Date(),
          claimedBy: user.uid,
          claimedAt: new Date(),
          paymentId: "pay_sandbox_" + Math.random().toString(36).substr(2, 9),
          approved: true,
          approvedAt: new Date()
        });

        alert("🎟️ Sandbox mode active: Mock ticket created successfully (no Razorpay key set)!");

        const userTicketQuery = query(
          collection(db, "users", user.uid, "tickets"),
          where("premiereId", "==", id)
        );
        const ticketSnap = await getDocs(userTicketQuery);
        setUserTickets(ticketSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPaymentLoading(false);
        return;
      }

      // Create Razorpay Order
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        body: JSON.stringify({
          amount: premiere.ticketPrice,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const order = await res.json();

      // Razorpay Options
      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "Chakradhar OTT",
        description: `Ticket for ${premiere.title}`,

        handler: async function (response) {
          try {
            // Verify Payment
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                ...response,
                userId: user.uid,
                premiereId: id,
                title: premiere.title,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              alert("Payment successful! Ticket purchased.");

              // Reload user tickets
              const userTicketQuery = query(
                collection(db, "users", user.uid, "tickets"),
                where("premiereId", "==", id)
              );
              const ticketSnap = await getDocs(userTicketQuery);
              setUserTickets(
                ticketSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
              );

              setPaymentLoading(false);
            } else {
              alert(verifyData.message || "Payment verification failed");
              setPaymentLoading(false);
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Payment verification error");
            setPaymentLoading(false);
          }
        },

        prefill: {
          email: user?.email || "",
        },

        theme: {
          color: "#00d4ff",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed: " + err.message);
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl px-6 py-4">
          <p className="text-gray-300">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error || !premiere) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || "Premiere not found"}</p>
        <Link href="/" className="admin-button admin-button-primary px-6 py-2">
          Back to Home
        </Link>
      </div>
    );
  }

  // If not ticketed premiere, redirect to join
  if (!premiere.ticketRequired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-300 mb-4">This is a free premiere</p>
        <Link href={`/premiere/${id}/join`} className="admin-button admin-button-primary px-6 py-2">
          Join Premiere
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-14">
      <div className="max-w-3xl mx-auto px-4 md:px-10 lg:px-16 py-10 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card rounded-[2rem] p-6 md:p-8"
        >
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Ticket Access</h1>
          <p className="text-gray-300 mb-1 text-sm md:text-base">{premiere.title}</p>
          <p className="text-gray-400 text-sm mb-8">
            Complete payment to secure your seat for this premiere.
          </p>

          <div className="bg-gradient-to-r from-amber-500/25 to-orange-500/20 border border-amber-400/40 rounded-[1.5rem] p-6 mb-8">
            <p className="text-gray-300 text-sm mb-1">Ticket Price</p>
            <p className="text-4xl font-black">INR {premiere.ticketPrice}</p>
            <p className="text-xs text-gray-300 mt-2">
              Secure checkout powered by Razorpay.
            </p>
          </div>

          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className="admin-button admin-button-primary w-full disabled:opacity-70 mb-6 flex items-center justify-center gap-2"
          >
            {paymentLoading ? "Processing payment..." : `Buy Ticket (INR ${premiere.ticketPrice})`}
          </button>

          {/* REDEEM TICKET CODE */}
          <div className="border-t border-white/10 pt-6 mt-6">
            <h2 className="text-lg font-bold mb-3 text-white">Redeem Complimentary Ticket Code</h2>
            <form onSubmit={handleRedeem} className="flex gap-3">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="Enter ticket code (e.g. ABC-XYZ)"
                className="admin-input focus-ring text-sm"
                disabled={redeeming}
              />
              <button
                type="submit"
                disabled={redeeming || !redeemCode.trim()}
                className="admin-button admin-button-primary whitespace-nowrap disabled:opacity-60"
              >
                {redeeming ? "Claiming..." : "Redeem"}
              </button>
            </form>
          </div>

        {userTickets.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4">Your Tickets</h2>
            <div className="space-y-3">
              {userTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-green-900/20 border border-green-600/30 rounded-[1.5rem] p-4 flex justify-between items-center gap-4"
                >
                  <div>
                    <p className="font-semibold text-lg">{ticket.ticketCode}</p>
                    <p className="text-sm text-gray-400">
                      Purchased {ticket.purchasedAt?.toDate?.().toLocaleDateString?.()}
                    </p>
                  </div>
                  <Link
                    href={`/premiere/${id}/join`}
                    className="admin-button admin-button-primary px-4 py-2 text-sm"
                  >
                    Join Stream
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

          <div className="mt-10 bg-black/20 border border-white/10 rounded-[1.5rem] p-4">
            <p className="text-xs text-gray-300">
              Your payment information is secure and handled by Razorpay, a PCI-DSS compliant payment gateway.
            No card details are stored on our servers.
            </p>
          </div>

          <Link
            href={`/premiere/${id}/join`}
            className="mt-6 block text-center admin-button admin-button-secondary px-6 py-3"
          >
            Back to Premiere
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
