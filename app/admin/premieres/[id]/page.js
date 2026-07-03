"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";

function generateTicketCode() {
  const bytes = new Uint8Array(6);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

export default function AdminPremiereDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [premiere, setPremiere] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketCount, setTicketCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [updatingTickets, setUpdatingTickets] = useState({});

  /* Fetch Data */
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const premiereSnap = await getDoc(doc(db, "premieres", id));

      if (premiereSnap.exists()) {
        setPremiere({ id: premiereSnap.id, ...premiereSnap.data() });
      }

      const ticketsSnap = await getDocs(
        collection(db, "premieres", id, "tickets")
      );

      setTickets(
        ticketsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };

    fetchData();
  }, [id]);

  /* STATUS CONTROL */
  const updateStatus = async (status) => {
    const updateData = { status };

    // ✅ SET endTime when ending
    if (status === "ended") {
      updateData.endTime = Timestamp.now();
    }

    await updateDoc(doc(db, "premieres", id), updateData);
    setPremiere((prev) => ({ ...prev, ...updateData }));
  };

  /* ARCHIVE PREMIERE */
  const handleArchive = async () => {
    try {
      setArchiving(true);

      await updateDoc(doc(db, "premieres", id), {
        archived: true,
        archivedAt: Timestamp.now(),
      });

      alert("Premiere archived successfully.");
      router.push("/admin/premieres");
    } catch (err) {
      console.error("Error archiving premiere:", err);
      alert("Failed to archive premiere");
    } finally {
      setArchiving(false);
    }
  };

  /* GENERATE TICKETS */
  const handleGenerate = async () => {
    if (!ticketCount || ticketCount < 1) return;

    setLoading(true);

    for (let i = 0; i < ticketCount; i++) {
      const code = generateTicketCode();

      await setDoc(
        doc(db, "premieres", id, "tickets", code),
        {
          code,
          used: false,
          createdAt: Timestamp.now(),
        }
      );
    }

    const snap = await getDocs(
      collection(db, "premieres", id, "tickets")
    );

    setTickets(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );

    setLoading(false);
  };

  /* TOGGLE USED */
  const toggleUsed = async (ticketId, currentStatus) => {
    setUpdatingTickets((prev) => ({ ...prev, [ticketId]: true }));

    // Store previous state for rollback
    const previousTickets = tickets;

    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, used: !currentStatus }
          : t
      )
    );

    try {
      await updateDoc(
        doc(db, "premieres", id, "tickets", ticketId),
        {
          used: !currentStatus,
        }
      );
      alert("Ticket marked " + (!currentStatus ? "used" : "unused"));
    } catch (err) {
      console.error("Error updating ticket:", err);
      alert("Failed: " + (err.message || "Unknown error"));
      // Revert to previous state
      setTickets(previousTickets);
    } finally {
      setUpdatingTickets((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  /* TOGGLE APPROVAL */
  const toggleApproval = async (ticketId, currentStatus) => {
    setUpdatingTickets((prev) => ({ ...prev, [ticketId]: true }));

    // Store previous state for rollback
    const previousTickets = tickets;

    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, approved: !currentStatus }
          : t
      )
    );

    try {
      await updateDoc(
        doc(db, "premieres", id, "tickets", ticketId),
        {
          approved: !currentStatus,
          approvedAt: !currentStatus ? Timestamp.now() : null,
        }
      );
      alert("Ticket " + (!currentStatus ? "approved" : "approval revoked"));
    } catch (err) {
      console.error("Error updating ticket approval:", err);
      alert("Failed: " + (err.message || "Unknown error"));
      // Revert to previous state
      setTickets(previousTickets);
    } finally {
      setUpdatingTickets((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  /* COPY TICKET */
  const copyTicket = (code) => {
    navigator.clipboard.writeText(code);
    alert("Copied: " + code);
  };

  if (!premiere) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="admin-toolbar items-end">
        <div className="admin-section max-w-3xl">
          <p className="admin-kicker">Live Event</p>
          <h1 className="admin-title">{premiere.title}</h1>
          <p className="admin-lead">Control status, tickets, and the live room from one page.</p>
        </div>

        <span className={`admin-chip ${
          premiere.status === "live"
            ? "border-rose-300/20 bg-rose-500/15 text-rose-100"
            : premiere.status === "ended"
            ? "border-white/10 bg-white/5 text-gray-200"
            : "border-amber-300/20 bg-amber-500/10 text-amber-100"
        }`}>
          {premiere.status || "scheduled"}
        </span>
      </div>

      {/* EDIT BUTTON */}
      <Link
        href={`/admin/premieres/${id}/edit`}
        className="admin-button admin-button-primary inline-flex"
      >
        Edit Details
      </Link>

      {/* CONTROLS */}
      <div className="admin-surface rounded-[1.75rem] p-6 space-y-4">

        <div className="flex gap-3 flex-wrap">

          <button
            onClick={() => updateStatus("live")}
            className="admin-button bg-emerald-500/15 text-emerald-100 border border-emerald-300/20 px-4 py-2 text-sm"
          >
            ▶ Start
          </button>

          <button
            onClick={() => updateStatus("ended")}
            className="admin-button admin-button-secondary px-4 py-2 text-sm"
          >
            ⛔ End
          </button>

          <button
            onClick={() => setArchiveModal(true)}
            className="admin-button bg-amber-500/15 text-amber-100 border border-amber-300/20 px-4 py-2 text-sm"
          >
            Archive
          </button>

          <Link
            href={`/admin/premieres/${id}/room`}
            className="admin-button admin-button-secondary px-4 py-2 text-sm"
          >
            Room
          </Link>

        </div>

        <p className="text-sm text-gray-400">
          Display Time:{" "}
          {premiere.displayTime
            ? premiere.displayTime.toDate?.().toLocaleString() || new Date(premiere.displayTime).toLocaleString()
            : "Not set"}
        </p>

        <p className="text-sm text-gray-400">
          Start Time:{" "}
          {premiere.startTime
            ? premiere.startTime.toDate?.().toLocaleString() || new Date(premiere.startTime).toLocaleString()
            : "Not set"}
        </p>

      </div>

      {/* GENERATE */}
      <div className="admin-surface rounded-[1.75rem] p-6">

        <h2 className="text-lg font-semibold mb-4">
          Generate Tickets
        </h2>

        <div className="flex gap-4 items-center">

          <input
            type="number"
            value={ticketCount}
            onChange={(e) =>
              setTicketCount(Number(e.target.value))
            }
            className="admin-input focus-ring w-32"
            min="1"
          />

          <button
            onClick={handleGenerate}
            className="admin-button admin-button-primary px-5 py-3"
          >
            {loading ? "Generating..." : "Generate"}
          </button>

        </div>

      </div>

      {/* PAYMENT REVENUE */}
      {premiere?.ticketRequired && (
        <div className="admin-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Revenue</h2>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-gray-300 text-sm mb-1">Total Sold</p>
              <p className="text-3xl font-bold">{premiere.ticketsSold || 0}</p>
              <p className="text-xs text-gray-400">tickets</p>
            </div>

            <div>
              <p className="text-gray-300 text-sm mb-1">Ticket Price</p>
              <p className="text-3xl font-bold">₹{premiere.ticketPrice || 0}</p>
              <p className="text-xs text-gray-400">per ticket</p>
            </div>

            <div>
              <p className="text-gray-300 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-yellow-400">
                ₹{((premiere.ticketsSold || 0) * (premiere.ticketPrice || 0)).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-400">earned</p>
            </div>
          </div>

          {/* ADMIN QUOTA INFO */}
          {premiere?.adminQuota > 0 && (
            <div className="bg-white/10 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Admin Quota</p>
              <div className="flex justify-between text-sm">
                <span>Quota Available:</span>
                <span className="font-mono">{premiere.adminQuota}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quota Used:</span>
                <span className="font-mono">{premiere.adminQuotaUsed || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Counts in Revenue:</span>
                <span className="font-mono">{premiere.countAdminQuotaInRevenue ? "Yes" : "No"}</span>
              </div>
              {premiere.countAdminQuotaInRevenue && (
                <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                  <span>Total with Admin Quota:</span>
                  <span className="font-mono text-green-400">
                    ₹{(((premiere.ticketsSold || 0) + (premiere.adminQuotaUsed || 0)) * (premiere.ticketPrice || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TICKET LIMIT INFO */}
          {premiere?.ticketLimit > 0 && (
            <div className="bg-white/10 border border-white/10 rounded-lg p-4 mt-4 space-y-2">
              <p className="font-semibold text-sm">Ticket Limit</p>
              <div className="flex justify-between text-sm">
                <span>Max Capacity:</span>
                <span className="font-mono">{premiere.ticketLimit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tickets Sold:</span>
                <span className="font-mono">{premiere.ticketsSold || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Seats Available:</span>
                <span className={`font-mono ${(premiere.ticketsSold || 0) >= premiere.ticketLimit ? "text-red-400" : "text-green-400"}`}>
                  {Math.max(0, premiere.ticketLimit - (premiere.ticketsSold || 0))}
                </span>
              </div>
              {(premiere.ticketsSold || 0) >= premiere.ticketLimit && (
                <p className="text-xs text-red-400 mt-2">Capacity reached - no more tickets available</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TICKETS */}
      <div className="admin-surface rounded-[1.75rem] p-6">

        <h2 className="text-lg font-semibold mb-4">
          Tickets ({tickets.length})
        </h2>

        {tickets.length === 0 && (
          <p className="text-gray-400">
            No tickets generated.
          </p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`p-4 rounded-2xl border ${
                ticket.used
                  ? "border-rose-300/20 bg-rose-500/10"
                  : "border-emerald-300/20 bg-emerald-500/10"
              }`}
            >
              <p className="font-mono text-sm mb-2">
                {ticket.code}
              </p>

              {/* PAYMENT INFO */}
              {ticket.paymentId && (
                <div className="mb-3 text-xs space-y-1 border-t border-white/10 pt-2">
                  <p className="text-gray-300">💳 <span className="text-yellow-400">Paid</span></p>
                  <p className="text-gray-400 break-all">ID: {ticket.paymentId}</p>
                </div>
              )}

              {/* APPROVAL STATUS */}
              {ticket.paymentId && (
                <div className="mb-3 flex items-center gap-2 text-xs bg-white/5 px-2 py-1 rounded-full w-fit">
                  {ticket.approved ? (
                    <span className="text-green-400">✅ Approved</span>
                  ) : (
                    <span className="text-yellow-500">⏳ Pending</span>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">

                <button
                  onClick={() =>
                    toggleUsed(ticket.id, ticket.used)
                  }
                  disabled={updatingTickets[ticket.id]}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingTickets[ticket.id] ? "Updating..." : (ticket.used ? "Mark Unused" : "Mark Used")}
                </button>

                {ticket.paymentId && (
                  <button
                    onClick={() =>
                      toggleApproval(ticket.id, ticket.approved)
                    }
                    disabled={updatingTickets[ticket.id]}
                    className={`admin-button px-3 py-2 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      ticket.approved
                        ? "bg-rose-500/15 text-rose-100 border border-rose-300/20"
                        : "bg-emerald-500/15 text-emerald-100 border border-emerald-300/20"
                    }`}
                  >
                    {updatingTickets[ticket.id] ? "Updating..." : (ticket.approved ? "Revoke" : "Approve")}
                  </button>
                )}

                <button
                  onClick={() => copyTicket(ticket.code)}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs"
                >
                  Copy
                </button>

              </div>

            </div>
          ))}

        </div>

      </div>

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="admin-surface rounded-[1.75rem] max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Archive Premiere?</h2>

            <div className="p-3 bg-amber-500/10 border border-amber-300/20 rounded-2xl">
              <p className="text-sm text-gray-300">{premiere.title}</p>
            </div>

            <p className="text-sm text-gray-400">
              This premiere will be moved to history. You can restore it anytime.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex-1 admin-button admin-button-primary disabled:opacity-60"
              >
                {archiving ? "Archiving..." : "Archive"}
              </button>
              <button
                onClick={() => setArchiveModal(false)}
                className="flex-1 admin-button admin-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}