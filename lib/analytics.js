"use client";

/**
 * Client-side analytics tracking utility
 * Usage: trackEvent("content_view", { contentId: "123", contentType: "movie" })
 */

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export async function trackEvent(
  eventType,
  { contentId, contentType, searchQuery, duration, metadata } = {}
) {
  try {
    const payload = {
      eventType,
      contentId,
      contentType,
      searchQuery,
      duration,
      metadata: metadata || {},
    };

    const headers = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch("/api/analytics", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Analytics error:", response.status);
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to track event:", err);
  }
}

/**
 * Track page view
 */
export function trackPageView(page) {
  return trackEvent("page_view", {
    metadata: { page },
  });
}

/**
 * Track content view
 */
export function trackContentView(contentId, contentType = "movie") {
  return trackEvent("content_view", {
    contentId,
    contentType,
  });
}

/**
 * Track search
 */
export function trackSearch(searchQuery) {
  return trackEvent("search", {
    searchQuery,
  });
}

/**
 * Track click
 */
export function trackClick(elementName, metadata = {}) {
  return trackEvent("click", {
    metadata: { element: elementName, ...metadata },
  });
}

/**
 * Track session duration
 */
let sessionStart = Date.now();

export function trackSessionEnd() {
  const duration = Math.round((Date.now() - sessionStart) / 1000); // seconds
  return trackEvent("session_end", {
    duration,
  });
}

/**
 * Track video playback
 */
export function trackVideoPlayback(contentId, currentTime, duration) {
  return trackEvent("video_playback", {
    contentId,
    duration,
    metadata: { currentTime },
  });
}

/**
 * Track error
 */
export function trackError(errorMessage, errorStack = "") {
  return trackEvent("error", {
    metadata: {
      message: errorMessage,
      stack: errorStack,
    },
  });
}

// Auto-track page views
if (typeof window !== "undefined") {
  trackPageView(window.location.pathname);

  // Track session end on page unload
  window.addEventListener("beforeunload", () => {
    trackSessionEnd();
  });
}
