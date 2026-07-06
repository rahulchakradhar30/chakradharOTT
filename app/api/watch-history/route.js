import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/* HELPER: Award achievements and trigger realtime notifications in Firestore */
async function unlockAchievementBackend(userId, achievementId, title, description) {
  try {
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      const currentAchievements = userData.achievements || [];
      
      if (currentAchievements.includes(achievementId)) return;

      await userRef.update({
        achievements: [...currentAchievements, achievementId]
      });

      // Add to notifications subcollection
      await db.collection(`users/${userId}/notifications`).add({
        title: `Achievement Unlocked: ${title}! 🏆`,
        message: description,
        type: "achievement",
        read: false,
        createdAt: new Date(),
      });
      
      console.log(`[ACHIEVEMENT] Unlocked ${achievementId} for user ${userId}`);
    }
  } catch (err) {
    console.error("[ACHIEVEMENT] Failed to unlock backend achievement:", err);
  }
}

export async function POST(request) {
  try {
    const { movieId, currentTime, duration, title, posterImage, activeTime, status } = await request.json();

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!movieId || !userId) {
      return Response.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    const secondsWatched = Math.floor(activeTime || 0);

    // 1. Update continue watching progress
    if (currentTime !== undefined && duration !== undefined) {
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

    // 2. Add detailed log segment to watch history
    const historyRef = db.collection(`users/${userId}/watchHistory`).doc();
    await historyRef.set({
      movieId,
      title,
      watchedAt: new Date(),
      duration: Math.floor(duration || 0),
      currentTime: Math.floor(currentTime || 0),
      activeTime: secondsWatched,
      status: status || "watching",
    });

    // 3. Update cumulative user stats & watch streak
    const userStatsRef = db.doc(`userStats/${userId}`);
    const userStatsDoc = await userStatsRef.get();

    const todayStr = new Date().toISOString().split("T")[0];
    let watchStreak = 1;
    let longestWatchStreak = 1;
    let lastWatchDate = "";

    if (userStatsDoc.exists) {
      const existingStats = userStatsDoc.data();
      lastWatchDate = existingStats.lastWatchDate || "";
      watchStreak = existingStats.watchStreak || 0;
      longestWatchStreak = existingStats.longestWatchStreak || 1;

      if (lastWatchDate && lastWatchDate !== todayStr) {
        const lastDateObj = new Date(lastWatchDate);
        const todayObj = new Date(todayStr);
        const diffDays = Math.round((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          watchStreak += 1;
        } else if (diffDays > 1) {
          watchStreak = 1;
        }
      } else if (!lastWatchDate) {
        watchStreak = 1;
      }

      if (watchStreak > longestWatchStreak) {
        longestWatchStreak = watchStreak;
      }

      const totalSec = (existingStats.totalSecondsWatched || 0) + secondsWatched;

      await userStatsRef.update({
        totalMinutesWatched: (existingStats.totalMinutesWatched || 0) + (secondsWatched / 60),
        totalSecondsWatched: totalSec,
        lastWatchedAt: new Date(),
        lastWatchDate: todayStr,
        watchStreak,
        longestWatchStreak,
      });

      // 4. Check and trigger achievements dynamically based on metrics
      // First Movie Watched (at least 10 seconds of active playback)
      if (totalSec >= 10) {
        await unlockAchievementBackend(userId, "first_movie", "First Premiere", "Watched your first movie segment!");
      }

      // Marathoner (50 watch hours)
      if (totalSec >= 50 * 3600) {
        await unlockAchievementBackend(userId, "marathoner", "Marathoner", "Completed 50 hours of playback watch-time!");
      }

      // Binge Master (100 watch hours)
      if (totalSec >= 100 * 3600) {
        await unlockAchievementBackend(userId, "binge_master", "Binge Master", "Completed 100 hours of playback watch-time!");
      }
    } else {
      await userStatsRef.set({
        totalWatched: 1,
        totalMinutesWatched: secondsWatched / 60,
        totalSecondsWatched: secondsWatched,
        watchStreak: 1,
        longestWatchStreak: 1,
        lastWatchedAt: new Date(),
        lastWatchDate: todayStr,
        createdAt: new Date(),
      });

      if (secondsWatched >= 10) {
        await unlockAchievementBackend(userId, "first_movie", "First Premiere", "Watched your first movie segment!");
      }
    }

    // Check unique movie count achievement
    const continueWatchingSnap = await db.collection(`users/${userId}/continueWatching`).get();
    if (continueWatchingSnap.size >= 10) {
      await unlockAchievementBackend(userId, "super_fan", "Super Fan", "Added 10 or more movies to your continue watching history!");
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
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

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
