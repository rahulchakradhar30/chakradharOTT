"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PremiereRoomPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { user } = useAuth();

  const [premiere, setPremiere] = useState(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const [pinned, setPinned] = useState(null);

  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [selectedUserToRemove, setSelectedUserToRemove] = useState(null);
  const [removalReason, setRemovalReason] = useState("");
  const [adminSession, setAdminSession] = useState({ authenticated: false, email: "" });
  const [checkingSession, setCheckingSession] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [chatActionLoading, setChatActionLoading] = useState(false);

  // ✅ HOST STATE
  const [isHost, setIsHost] = useState(false);

  /* FETCH PREMIERE */
  useEffect(() => {
    if (!id) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPremiere = async () => {
      try {
        const snap = await getDoc(doc(db, "premieres", id));
        if (snap.exists()) {
          setPremiere({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.warn("Premiere fetch skipped (client permissions):", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPremiere();
  }, [id, user]);

  /* CHECK ADMIN SESSION */
  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data?.authenticated) {
          setAdminSession({ authenticated: true, email: data.email || "admin" });
        }
      } catch {
        // keep graceful fallback
      } finally {
        setCheckingSession(false);
      }
    };

    loadSession();
  }, []);

  /* ADMIN SESSION ROOM STATE FALLBACK */
  useEffect(() => {
    if (!id || !adminSession.authenticated || user) return;

    const fetchRoomState = async () => {
      try {
        const res = await fetch(`/api/admin/premieres/${id}/room-actions`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data?.success) return;

        setPremiere(data.premiere || null);
        setMessages(data.messages || []);
        setPinned((data.messages || []).find((m) => m.pinned) || null);
        setViewers(data.viewers || []);
        setViewerCount((data.viewers || []).length);
        setLoading(false);
      } catch (err) {
        console.warn("Admin room state polling failed:", err);
      }
    };

    fetchRoomState();
    const interval = setInterval(fetchRoomState, 3000);
    return () => clearInterval(interval);
  }, [id, adminSession.authenticated, user]);

  /* CHECK HOST */
  useEffect(() => {
    if (!user || !id || adminSession.authenticated) {
      setIsHost(false);
      return;
    }

    const hostRef = doc(db, "premieres", id, "hosts", user.uid);

    const unsub = onSnapshot(
      hostRef,
      (snap) => {
        setIsHost(snap.exists());
      },
      (err) => {
        console.warn("Host listener blocked:", err?.message || err);
        setIsHost(false);
      }
    );

    return () => unsub();
  }, [user, id, adminSession.authenticated]);

  const canModerate = isHost || adminSession.authenticated;

  const callAdminRoomAction = async (payload) => {
    const response = await fetch(`/api/admin/premieres/${id}/room-actions`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Action failed");
    }

    return data;
  };

  const getAuthor = () => {
    if (user?.uid) {
      return {
        userId: user.uid,
        name: user.displayName || user.email || "User",
        isOfficial: canModerate,
      };
    }

    if (adminSession.authenticated) {
      return {
        userId: `admin:${adminSession.email || "session"}`,
        name: "Official Admin",
        isOfficial: true,
      };
    }

    return null;
  };

  /* VIEWERS & HEARTBEAT */
  useEffect(() => {
    if (!user || !id) return;

    const viewerRef = doc(db, "premieres", id, "viewers", user.uid);

    const updateHeartbeat = async () => {
      try {
        await setDoc(viewerRef, {
          userId: user.uid,
          lastActive: new Date(),
        }, { merge: true });
      } catch (err) {
        console.warn("Admin heartbeat write failed:", err);
      }
    };

    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 30000);

    return () => {
      clearInterval(interval);
      deleteDoc(viewerRef).catch(() => {});
    };
  }, [user, id]);

  useEffect(() => {
    if (!id || !user) return;

    const ref = collection(db, "premieres", id, "viewers");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const now = Date.now();
        const activeViewers = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((v) => {
            const lastActiveTime = v.lastActive?.toDate?.() || new Date(v.lastActive || 0);
            return now - lastActiveTime.getTime() < 90000;
          });

        setViewerCount(activeViewers.length);
        setViewers(activeViewers);
      },
      (err) => {
        console.warn("Viewers listener blocked:", err?.message || err);
      }
    );

    return () => unsub();
  }, [id, user]);

  /* CHAT */
  useEffect(() => {
    if (!id || !user) return;

    const q = collection(db, "premieres", id, "messages");

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Sort messages client-side to prevent index errors
        const sorted = data.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return timeA - timeB;
        });

        setMessages(sorted);
        setPinned(sorted.find((m) => m.pinned));
      },
      (err) => {
        console.warn("Messages listener blocked:", err?.message || err);
      }
    );

    return () => unsub();
  }, [id, user]);

  /* SEND */
  const sendMessage = async () => {
    if (!input.trim()) return;
    const author = getAuthor();
    if (!author) return alert("Login required");

    const now = Date.now();
    if (now - lastSent < 2000) return alert("Slow down");

    setLastSent(now);

    try {
      setChatActionLoading(true);

      if (adminSession.authenticated) {
        await callAdminRoomAction({ action: "message", text: input });
      } else {
        // Fallback for Firebase-authenticated host users.
        const { addDoc, collection } = await import("firebase/firestore");
        await addDoc(collection(db, "premieres", id, "messages"), {
          text: input,
          name: author.name,
          userId: author.userId,
          isOfficial: author.isOfficial,
          createdAt: serverTimestamp(),
          pinned: false,
        });
      }

      setInput("");
    } catch (err) {
      console.error("Failed to send admin message:", err);
      alert(err?.message || "Failed to send message.");
    } finally {
      setChatActionLoading(false);
    }
  };

  /* PIN */
  const pinMessage = async (msgId) => {
    try {
      if (adminSession.authenticated) {
        await callAdminRoomAction({ action: "pin", messageId: msgId });
      } else {
        const { updateDoc } = await import("firebase/firestore");
        const old = messages.filter((m) => m.pinned);
        for (const message of old) {
          await updateDoc(doc(db, "premieres", id, "messages", message.id), { pinned: false });
        }
        await updateDoc(doc(db, "premieres", id, "messages", msgId), { pinned: true });
      }
    } catch (err) {
      console.error("Failed to pin message:", err);
      alert(err?.message || "Failed to pin message.");
    }
  };

  /* DELETE */
  const deleteMessage = async (msgId) => {
    try {
      if (adminSession.authenticated) {
        await callAdminRoomAction({ action: "delete", messageId: msgId });
      } else {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "premieres", id, "messages", msgId));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      alert(err?.message || "Failed to delete message.");
    }
  };

  /* MAKE HOST */
  const makeHost = async (msgUserId) => {
    await setDoc(
      doc(db, "premieres", id, "hosts", msgUserId),
      {
        userId: msgUserId,
      }
    );
  };

  /* REMOVE USER */
  const removeUser = async (userId) => {
    try {
      // Delete from viewers
      await deleteDoc(doc(db, "premieres", id, "viewers", userId));

      // Optional: Store removal record
      if (removalReason && removalReason.trim() !== "") {
        await setDoc(
          doc(db, "premieres", id, "removed_users", userId),
          {
            userId,
            removedAt: Timestamp.now(),
            reason: removalReason || "No reason provided",
            removedBy: user.uid,
          }
        );
      }

      alert(`User removed${removalReason ? ": " + removalReason : ""}`);
      setSelectedUserToRemove(null);
      setRemovalReason("");
    } catch (err) {
      console.error("Error removing user:", err);
      alert("Failed to remove user");
    }
  };

  const setPremiereStatus = async (nextStatus) => {
    if (!id || !canModerate) return;
    try {
      setStatusUpdating(true);

      if (adminSession.authenticated) {
        await callAdminRoomAction({ action: "status", status: nextStatus });
      } else {
        const { updateDoc } = await import("firebase/firestore");
        const payload = {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        };
        if (nextStatus === "live") payload.startedAt = serverTimestamp();
        if (nextStatus === "ended") payload.endTime = serverTimestamp();
        await updateDoc(doc(db, "premieres", id), payload);
      }

      setPremiere((prev) => ({ ...(prev || {}), status: nextStatus }));
    } catch (err) {
      console.error("Failed to update premiere status:", err);
      alert(err?.message || "Could not update live status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (checkingSession && !user) {
    return <div className="min-h-screen flex items-center justify-center px-4"><div className="admin-empty">Checking admin session...</div></div>;
  }

  if (!user && !adminSession.authenticated) {
    return <div className="min-h-screen flex items-center justify-center px-4"><div className="admin-empty">Login required</div></div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center px-4"><div className="admin-empty">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen text-white">

      {/* HEADER */}
      <div className="admin-surface sticky top-0 z-20 flex justify-between p-4 md:p-5 border-b border-white/10 items-center backdrop-blur-xl">

        <div>
          <p className="admin-kicker">Premiere room</p>
          <h1 className="text-lg md:text-2xl font-bold">{premiere.title}</h1>
        </div>

        <div className="flex gap-3 items-center">
          <span className={`px-2 py-1 text-xs rounded ${premiere?.status === "live" ? "bg-gradient-to-r from-red-500 to-pink-600" : "bg-white/15 border border-white/15"}`}>
            {(premiere?.status || "scheduled").toUpperCase()}
          </span>

          {canModerate && (
            <>
              <button
                onClick={() => setPremiereStatus("live")}
                disabled={statusUpdating}
                className="admin-button admin-button-primary px-3 py-2 text-xs disabled:opacity-60"
              >
                Go Live
              </button>
              <button
                onClick={() => setPremiereStatus("ended")}
                disabled={statusUpdating}
                className="admin-button admin-button-secondary px-3 py-2 text-xs disabled:opacity-60"
              >
                End Stream
              </button>
            </>
          )}

          <button
            onClick={() => setShowViewers(!showViewers)}
            className="admin-button admin-button-secondary px-3 py-2 text-xs cursor-pointer"
          >
            Viewers {viewerCount}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.45fr_0.95fr] gap-6 p-4 md:p-6">

        {/* VIDEO */}
        <div className="admin-surface rounded-[1.75rem] overflow-hidden aspect-video">
          <iframe
            src={premiere.embedLink}
            className="w-full h-full"
            title={premiere.title || "Premiere stream"}
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>

        {/* CHAT */}
        <div className="admin-surface rounded-[1.75rem] p-4 flex flex-col">

          {pinned && (
            <div className="bg-amber-500/15 border border-amber-300/20 p-3 mb-3 text-xs rounded-2xl">
              📌 {pinned.text}
            </div>
          )}

          <div className="h-[400px] overflow-y-auto space-y-2 hide-scrollbar">

            {messages.map((m) => (
              <div key={m.id} className="flex justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 p-3">

                <div>
                  <p className="text-xs text-gray-400">{m.name}</p>
                  <p>{m.text}</p>
                </div>

                {canModerate && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => pinMessage(m.id)}>📌</button>
                    <button onClick={() => deleteMessage(m.id)}>❌</button>
                    <button onClick={() => makeHost(m.userId)}>👑</button>
                  </div>
                )}

              </div>
            ))}

          </div>

          <div className="flex gap-2 mt-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="admin-input focus-ring flex-1"
            />
            <button
              onClick={sendMessage}
              disabled={chatActionLoading}
              className="admin-button admin-button-primary px-3"
            >
              {chatActionLoading ? "Sending..." : "Send"}
            </button>
          </div>

        </div>

      </div>

      {/* VIEWERS SIDEBAR */}
      {showViewers && (
        <div className="fixed right-0 top-0 bottom-0 w-80 admin-surface border-l border-white/10 p-4 space-y-4 overflow-y-auto z-30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Active Viewers ({viewers.length})</h2>
            <button
              onClick={() => setShowViewers(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {viewers.length === 0 && (
            <p className="text-gray-400 text-sm">No viewers</p>
          )}

          <div className="space-y-2 mt-4">
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center"
              >
                <div className="text-sm">
                  <p className="font-mono break-all">{viewer.id}</p>
                  <p className="text-xs text-gray-400">
                    {viewer.joinedAt?.toDate?.().toLocaleTimeString?.() || "just now"}
                  </p>
                </div>

                {canModerate && viewer.id !== user?.uid && (
                  <button
                    onClick={() => setSelectedUserToRemove(viewer.id)}
                    className="admin-button px-2 py-1 text-xs bg-rose-500/15 text-rose-100 border border-rose-300/20"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REMOVAL MODAL */}
      {selectedUserToRemove && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="admin-surface rounded-[1.75rem] max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Remove User from Session?</h2>

            <div className="p-3 bg-rose-500/10 border border-rose-300/20 rounded-2xl">
              <p className="text-sm text-gray-300 break-all">{selectedUserToRemove}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g., Spam, Inappropriate behavior, etc."
                className="admin-textarea focus-ring text-sm"
                rows="3"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => removeUser(selectedUserToRemove)}
                className="admin-button admin-button-primary flex-1"
              >
                Remove User
              </button>
              <button
                onClick={() => {
                  setSelectedUserToRemove(null);
                  setRemovalReason("");
                }}
                className="admin-button admin-button-secondary flex-1"
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