import { adminDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export async function POST(request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Invalid request: messages array required" },
        { status: 400 }
      );
    }

    // Optional user authorization check
    const authHeader = request.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (authErr) {
        console.warn("Auth token verification skipped or failed:", authErr.message);
      }
    }

    // 1. Fetch catalog movies from Firestore
    const moviesSnapshot = await adminDb.collection("movies").get();
    const catalog = [];
    moviesSnapshot.forEach((doc) => {
      const data = doc.data();
      catalog.push({
        id: doc.id,
        title: data.title || "Untitled",
        genre: data.genre || "N/A",
        rating: data.rating || 0,
        description: data.description || "",
      });
    });

    // 2. Build system context message
    const catalogString = JSON.stringify(catalog, null, 2);
    const systemPrompt = {
      role: "system",
      content: `You are AI CineGuide, a friendly, extremely knowledgeable cinematic concierge on Chakradhar Stream (an OTT platform).
Your job is to recommend movies to users from the provided catalog.

Here is the exact catalog of movies available on the platform:
${catalogString}

INSTRUCTIONS:
1. Always be conversational, warm, and highlight why the recommended movies fit their request or mood.
2. You can ONLY recommend movies that are present in the catalog. If no movie in the catalog matches their request, explain this nicely and recommend the closest alternatives or highest-rated options from the catalog.
3. At the very end of your response, you MUST output a parseable list of the recommended movie IDs from the catalog matching your suggestions. Format it exactly like this (on new lines):
[RECOMMENDATIONS]
movie_id_1, movie_id_2, ...
[/RECOMMENDATIONS]
Replace the IDs with actual document IDs of the movies from the catalog (e.g. from the "id" field in catalog JSON). Example:
[RECOMMENDATIONS]
fFmIe4nCpxuS82, jK7ePl9tQwZ1
[/RECOMMENDATIONS]
If there are no recommendations, output:
[RECOMMENDATIONS]
[/RECOMMENDATIONS]`,
    };

    // 3. Prepare message payload for Groq
    // Slice messages to avoid context overflow, keep last 8 messages
    const formattedMessages = messages.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text || "",
    }));

    const payload = {
      model: "mixtral-8x7b-32768", // fast, large context
      messages: [systemPrompt, ...formattedMessages.slice(-8)],
      temperature: 0.7,
      max_tokens: 1000,
    };

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY is missing in environment variables. Falling back to keyword mock.");
      return Response.json(
        { error: "Groq API key not configured on server" },
        { status: 500 }
      );
    }

    // 4. Request Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API returned error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "Sorry, I am having trouble thinking right now.";

    return Response.json({ text: replyText });
  } catch (error) {
    console.error("AI Assistant API error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
