"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminContacts() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "contacts"))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(list);
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SubAdminAccessGuard moduleKey="contacts">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Support Desk</p>
          <h1 className="admin-title">Customer Support Contacts</h1>
          <p className="admin-lead">Review user feedback and support inquiries.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="admin-empty text-xs text-gray-400">No support tickets found.</div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="admin-surface p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{t.name} ({t.email})</span>
                  <span className="text-cyan-400 text-[10px] uppercase font-bold">{t.messageStatus || "New"}</span>
                </div>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{t.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
