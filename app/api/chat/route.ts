import { NextResponse } from "next/server";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      reply: `Mode demo actif. J'ai bien recu votre message : « ${message} ». Ajoutez GROQ_API_KEY dans .env.local pour activer l'assistant IA.`,
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Tu es Atelier, un assistant utile. Reponds en francais de maniere claire et concise." },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    );
    const data = (await response.json()) as GroqResponse;
    const reply = data.choices?.[0]?.message?.content;

    if (!response.ok || !reply) {
      return NextResponse.json(
        { error: data.error?.message ?? "Le fournisseur IA n'a pas renvoye de reponse." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Impossible de joindre Groq pour le moment." },
      { status: 502 },
    );
  }
}