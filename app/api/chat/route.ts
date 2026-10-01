import { NextResponse } from "next/server";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      reply: `Mode demo actif. J'ai bien recu votre message : « ${message} ». Ajoutez GEMINI_API_KEY dans .env.local pour activer Gemini.`,
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Tu es Atelier, un assistant utile. Reponds en francais de maniere claire et concise." }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      },
    );
    const data = (await response.json()) as GeminiResponse;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!response.ok || !reply) {
      return NextResponse.json(
        { error: data.error?.message ?? "Le fournisseur IA n'a pas renvoye de reponse." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Impossible de joindre Gemini pour le moment." },
      { status: 502 },
    );
  }
}