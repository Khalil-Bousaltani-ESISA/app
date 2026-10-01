import { NextResponse } from "next/server";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type HistoryMessage = { role: "user" | "assistant"; content: string };
type Attachment = { name: string; type: string; dataUrl: string };
const requestLog = new Map<string, number[]>();
const MAX_MESSAGE_LENGTH = 4000;
const MAX_REQUESTS_PER_MINUTE = 20;

function isRateLimited(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const now = Date.now();
  const recentRequests = (requestLog.get(address) ?? []).filter((timestamp) => now - timestamp < 60_000);
  recentRequests.push(now);
  requestLog.set(address, recentRequests);
  return recentRequests.length > MAX_REQUESTS_PER_MINUTE;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Trop de demandes. Reessayez dans une minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const attachment = body.attachment as Attachment | null;
  const history = Array.isArray(body.messages) ? (body.messages as HistoryMessage[]).filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string").slice(-13, -1) : [];

  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message trop long. Limite : ${MAX_MESSAGE_LENGTH} caracteres.` }, { status: 400 });
  }
  if (attachment && (!attachment.name || !attachment.type || !attachment.dataUrl || attachment.dataUrl.length > 8_000_000)) {
    return NextResponse.json({ error: "Piece jointe invalide ou trop volumineuse (8 Mo maximum)." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      reply: `Mode demo actif. J'ai bien recu votre message : « ${message} ». Ajoutez GROQ_API_KEY dans .env.local pour activer l'assistant IA.`,
    });
  }

  try {
    const visionModel = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.8-27b";
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: attachment ? visionModel : "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: "Tu es Chat Khalil, un assistant utile. Reponds en francais de maniere claire et concise. Ne dis jamais que tu es Atelier." },
            ...history.map((item) => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) })),
            ...(attachment ? [{ role: "user", content: [{ type: "text", text: message }, { type: "image_url", image_url: { url: attachment.dataUrl } }] }] : [{ role: "user", content: message }]),
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