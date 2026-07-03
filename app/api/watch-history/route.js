import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request) {
  try {
    const { movieId, currentTime, duration, title, posterImage } = await request.json();

    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!movieId || !userId) {
      return Response.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // Update continue watching
    if (currentTime && duration) {
      await db.doc(`users/${userId}/continueWatching/${movieId}`).set(
        {
          movieId,
          title,
          posterImage,
          progress: Math.floor(currentTime),
          duration: Math.floor(duration),
          lastWatched: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    // Add to watch history
    const historyRef = db.collection(`users/${userId}/watchHistory`).doc();
    await historyRef.set({
      movieId,
      title,
      watchedAt: new Date(),
      duration: Math.floor(duration || 0),
      currentTime: Math.floor(currentTime || 0),
    });

    // Update user stats
    const userStatsRef = db.doc(`userStats/${userId}`);
    const userStatsDoc = await userStatsRef.get();

    if (userStatsDoc.exists) {
      const existingStats = userStatsDoc.data();
      await userStatsRef.update({
        totalMinutesWatched:
          (existingStats.totalMinutesWatched || 0) + (duration || 0),
        lastWatchedAt: new Date(),
      });
    } else {
      await userStatsRef.set({
        totalWatched: 1,
        totalMinutesWatched: duration || 0,
        streak: 1,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
      });
    }

    return Response.json({
      success: true,
      message: "Watch history updated",
    });
  } catch (error) {
    console.error("Watch history error:", error);
    return Response.json(
      { error: error.message || "Failed to update watch history" },
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
    const userId = decodedToken.uid;

    // Get continue watching
    const continueWatchingSnap = await db
      .collection(`users/${userId}/continueWatching`)
      .orderBy("lastWatched", "desc")
      .limit(10)
      .get();

    const continueWatching = [];
    continueWatchingSnap.forEach((doc) => {
      continueWatching.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return Response.json({
      continueWatching,
    });
  } catch (error) {
    console.error("Error fetching watch history:", error);
    return Response.json(
      { error: error.message || "Failed to fetch watch history" },
      { status: 500 }
    );
  }
}
