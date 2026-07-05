export async function POST(request) {
  try {
    const { title, genre, director, description } = await request.json();

    if (!title) {
      return Response.json(
        { error: "Invalid request: Movie title required" },
        { status: 400 }
      );
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return Response.json(
        { error: "OpenRouter API Key not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert film trivia system. Generate a high-quality 5-question multiple choice trivia quiz for the film "${title}".
Film Metadata:
- Genre: ${genre || "N/A"}
- Director: ${director || "N/A"}
- Plot/Description: ${description || "N/A"}

Provide questions of varying difficulty: basic facts, plot details, directing/cinematography style.
For each question, provide exactly 4 options. Keep options concise. Specify the exact correct option string.

You MUST respond ONLY with a raw, valid JSON array containing exactly 5 objects. Do not include markdown code block formatting (like \`\`\`json). The format must be exactly:
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option A"
  }
]`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Chakradhar Stream Trivia",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn("OpenRouter Trivia API call failed:", response.status, errBody);
      return Response.json({ error: "Failed to generate trivia from AI service" }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    // Clean up potential markdown formatting wrapping the JSON
    let cleanJSON = content;
    if (cleanJSON.startsWith("```")) {
      cleanJSON = cleanJSON.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const quizQuestions = JSON.parse(cleanJSON);
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      throw new Error("AI returned invalid quiz questions schema");
    }

    return Response.json({ questions: quizQuestions });
  } catch (error) {
    console.error("AI Trivia Generator Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
