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
    const { movieId, title, posterImage, action } = await request.json();

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

    if (!movieId || !userId || !action) {
      return Response.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const watchlistRef = db.doc(`users/${userId}/watchlist/${movieId}`);

    if (action === "add") {
      await watchlistRef.set({
        movieId,
        title,
        posterImage,
        addedAt: new Date(),
      });

      return Response.json({
        success: true,
        message: "Added to watchlist",
      });
    } else if (action === "remove") {
      await watchlistRef.delete();

      return Response.json({
        success: true,
        message: "Removed from watchlist",
      });
    } else {
      return Response.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Watchlist error:", error);
    return Response.json(
      { error: error.message || "Failed to manage watchlist" },
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

    // Get watchlist
    const watchlistSnap = await db
      .collection(`users/${userId}/watchlist`)
      .orderBy("addedAt", "desc")
      .get();

    const watchlist = [];
    watchlistSnap.forEach((doc) => {
      watchlist.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return Response.json({
      watchlist,
    });
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return Response.json(
      { error: error.message || "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}
