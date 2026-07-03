"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function JoinPremierePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [premiere, setPremiere] = useState(null);
  const [loading, setLoading] = useState(true);

  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");

  /* FETCH PREMIERE */
  useEffect(() => {
    if (!id) return;

    const fetchPremiere = async () => {
      try {
        const snap = await getDoc(doc(db, "premieres", id));
        if (snap.exists()) {
          setPremiere({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPremiere();
  }, [id]);

  /* 🔓 AUTO ENTRY */
  useEffect(() => {
    if (!loading && premiere && !premiere.ticketRequired && id) {
      router.push(`/premiere/${id}/room`);
    }
  }, [loading, premiere, id, router]);

  /* 🎟 VALIDATE FREE TICKET */
  const handleJoin = async () => {
    if (!ticket) {
      setError("Enter ticket code");
      return;
    }

    try {
      const ticketRef = doc(db, "premieres", id, "tickets", ticket);
      const snap = await getDoc(ticketRef);

      if (!snap.exists()) {
        setError("Invalid ticket");
        return;
      }

      const data = snap.data();

      if (data.used) {
        setError("Ticket already used");
        return;
      }

      await updateDoc(ticketRef, {
        used: true,
        usedBy: user.uid,
        usedAt: new Date(),
      });

      await setDoc(
        doc(db, "users", user.uid, "tickets", ticket),
        {
          ticketCode: ticket,
          premiereId: id,
          title: premiere.title,
          usedAt: new Date(),
        }
      );

      router.push(`/premiere/${id}/room`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    }
  };

  /* 💰 RAZORPAY PAYMENT */
  const handlePayment = async () => {
    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        body: JSON.stringify({
          amount: premiere.ticketPrice,
        }),
      });

      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,

        handler: async function (response) {
          const verify = await fetch("/api/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({
              ...response,
              userId: user.uid,
              premiereId: id,
              title: premiere.title,
            }),
          });

          const data = await verify.json();

          if (data.success) {
            router.push(`/premiere/${id}/room`);
          } else {
            alert("Payment verification failed");
          }
        },

        theme: {
          color: "#dc2626",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  };

  /* AUTH */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="admin-surface rounded-[1.75rem] p-6 text-center max-w-md w-full">
          <p className="admin-kicker mb-2">Access required</p>
          <h1 className="text-2xl font-bold mb-2">Login required</h1>
          <p className="text-sm text-gray-400">Sign in to continue to the premiere access flow.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="admin-empty">Loading premiere access...</div>
      </div>
    );
  }

  if (!premiere) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="admin-empty">Premiere not found</div>
      </div>
    );
  }

  /* 💰 PAID PREMIERE */
  if (premiere.ticketRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="admin-surface rounded-[1.75rem] p-6 md:p-8 max-w-md w-full text-center space-y-4">
          <p className="admin-kicker">Paid Premiere</p>
          <h1 className="text-2xl font-bold">Purchase access</h1>
          <p className="text-gray-400 text-sm">Price: ₹{premiere.ticketPrice || 0}</p>

          <button
            className="admin-button admin-button-primary w-full"
            onClick={handlePayment}
          >
            Buy Ticket
          </button>
        </div>

      </div>
    );
  }

  /* 🎟 FREE TICKET UI */
  return (
    <div className="min-h-screen flex items-center justify-center px-4">

      <div className="admin-surface rounded-[1.75rem] p-6 w-full max-w-md space-y-5 text-center">

        <h1 className="text-xl font-semibold text-center">
          Enter Ticket
        </h1>

        <input
          type="text"
          placeholder="XXXX-XXXX"
          value={ticket}
          onChange={(e) => setTicket(e.target.value.toUpperCase())}
          className="admin-input focus-ring text-center tracking-widest"
        />

        {error && (
          <p className="text-red-500 text-sm text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleJoin}
          className="admin-button admin-button-primary w-full"
        >
          Join Premiere
        </button>

      </div>

    </div>
  );
}