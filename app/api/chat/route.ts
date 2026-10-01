import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  return NextResponse.json({
    reply: `Mode demo actif. J'ai bien recu votre message : « ${message} ». Ajoutez une cle de fournisseur IA dans .env.local pour connecter un vrai modele.`,
  });
}