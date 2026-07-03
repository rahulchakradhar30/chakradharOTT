import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request) {
  try {
    const {
      eventType,
      contentId,
      contentType,
      searchQuery,
      duration,
      metadata,
    } = await request.json();

    const authHeader = request.headers.get("Authorization");
    
    // Allow anonymous events too
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (err) {
        console.error("Token verification failed:", err);
      }
    }

    // Store event in analytics collection
    const analyticsRef = db.collection("analyticsEvents").doc();
    await analyticsRef.set({
      eventType,
      contentId: contentId || null,
      contentType: contentType || null,
      searchQuery: searchQuery || null,
      userId: userId || null,
      duration: duration || null,
      metadata: metadata || {},
      timestamp: new Date(),
      userAgent: request.headers.get("user-agent"),
    });

    // Update content stats if viewing/searching
    if (eventType === "content_view" && contentId) {
      const contentRef = db.collection(contentType || "movies").doc(contentId);
      await contentRef.update({
        viewsReal: (await contentRef.get()).data()?.viewsReal || 0 + 1,
      }).catch(() => {
        // Content might not exist
      });
    }

    // Update search analytics
    if (eventType === "search" && searchQuery) {
      const searchRef = db.collection("searchAnalytics").doc(searchQuery.toLowerCase());
      const searchDoc = await searchRef.get();
      await searchRef.set(
        {
          query: searchQuery,
          count: (searchDoc.data()?.count || 0) + 1,
          lastSearched: new Date(),
        },
        { merge: true }
      );
    }

    // Update user engagement
    if (userId) {
      const userStatsRef = db.collection("userStats").doc(userId);
      const userStats = await userStatsRef.get();

      await userStatsRef.set(
        {
          lastActive: new Date(),
          totalEvents: (userStats.data()?.totalEvents || 0) + 1,
          [`eventType_${eventType}`]: (userStats.data()?.[`eventType_${eventType}`] || 0) + 1,
        },
        { merge: true }
      );
    }

    return Response.json({
      success: true,
      eventId: analyticsRef.id,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json(
      { error: error.message || "Failed to track event" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await auth.verifyIdToken(token);
    
    // Only admins can view analytics
    if (decodedToken.role !== "admin") {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const timeframe = new Date();
    timeframe.setDate(timeframe.getDate() - 30);

    const eventsSnap = await db
      .collection("analyticsEvents")
      .where("timestamp", ">=", timeframe)
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const events = [];
    eventsSnap.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return Response.json({
      events,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return Response.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
