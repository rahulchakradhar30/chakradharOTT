"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "@/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

/**
 * Save or update a draft in the 'drafts' collection.
 * Each draft has: authorEmail, type, data, updatedAt, version
 */
export async function saveDraft(type, formData, authorEmail, existingDraftId = null) {
  const draftId = existingDraftId || `draft_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const draftRef = doc(db, "drafts", draftId);

  const existingSnap = existingDraftId ? await getDoc(draftRef) : null;
  const currentVersion = existingSnap?.exists() ? (existingSnap.data().version || 0) : 0;

  await setDoc(draftRef, {
    authorEmail: authorEmail.toLowerCase(),
    type,
    data: formData,
    title: formData.title || formData.name || "Untitled",
    updatedAt: Timestamp.now(),
    version: currentVersion + 1,
  }, { merge: true });

  return draftId;
}

/**
 * Load a specific draft by ID.
 */
export async function loadDraft(draftId) {
  const draftRef = doc(db, "drafts", draftId);
  const snap = await getDoc(draftRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * List all drafts for an admin, optionally filtered by type.
 */
export async function listDrafts(authorEmail, type = null) {
  if (!authorEmail) return [];

  const draftsRef = collection(db, "drafts");
  const q = query(
    draftsRef,
    where("authorEmail", "==", authorEmail.toLowerCase())
  );

  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (type) {
    docs = docs.filter((d) => d.type === type);
  }

  // Sort in memory by updatedAt descending (prevents composite index error)
  docs.sort((a, b) => {
    const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
    const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  return docs;
}

/**
 * Delete a draft by ID.
 */
export async function deleteDraft(draftId) {
  await deleteDoc(doc(db, "drafts", draftId));
}

/**
 * React hook that auto-saves form data to drafts.
 * Returns { draftId, lastSaved, saving, saveDraftManually, clearDraft }
 */
export function useAutoSave(formData, type, adminEmail, intervalMs = 4000) {
  const [draftId, setDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const lastFormData = useRef(null);
  const draftIdRef = useRef(null);

  // Initialize draftId from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlDraftId = params.get("draftId");
    if (urlDraftId) {
      setDraftId(urlDraftId);
      draftIdRef.current = urlDraftId;
    }
  }, []);

  // Auto-save on interval when form data changes
  useEffect(() => {
    if (!adminEmail || !type) return;

    // Check if form has any filled text/number value
    const hasContent = formData && Object.entries(formData).some(([key, v]) => {
      if (typeof v === "string") return v.trim().length > 0;
      if (typeof v === "number") return v > 0;
      return false;
    });

    if (!hasContent) return;

    const timer = setInterval(async () => {
      const currentJson = JSON.stringify(formData);
      if (currentJson === lastFormData.current) return;

      try {
        setSaving(true);
        const id = await saveDraft(type, formData, adminEmail, draftIdRef.current);
        draftIdRef.current = id;
        setDraftId(id);
        lastFormData.current = currentJson;
        setLastSaved(new Date());
      } catch (err) {
        console.warn("Auto-save failed:", err);
      } finally {
        setSaving(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [formData, type, adminEmail, intervalMs]);

  // Manual save
  const saveDraftManually = useCallback(async () => {
    if (!adminEmail || !type) return null;
    try {
      setSaving(true);
      const id = await saveDraft(type, formData, adminEmail, draftIdRef.current);
      draftIdRef.current = id;
      setDraftId(id);
      lastFormData.current = JSON.stringify(formData);
      setLastSaved(new Date());
      return id;
    } catch (err) {
      console.warn("Manual save failed:", err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [formData, type, adminEmail]);

  // Delete draft (after successful submit)
  const clearDraft = useCallback(async () => {
    if (draftIdRef.current) {
      try {
        await deleteDraft(draftIdRef.current);
        draftIdRef.current = null;
        setDraftId(null);
      } catch (err) {
        console.warn("Failed to clear draft:", err);
      }
    }
  }, []);

  return { draftId, lastSaved, saving, saveDraftManually, clearDraft };
}
