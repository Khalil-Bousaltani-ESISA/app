"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Explique-moi une idée simplement",
  "Aide-moi a organiser ma journee",
  "Ecris un plan pour mon projet",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeConversation, setActiveConversation] = useState("Nouvelle conversation");

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Une erreur est survenue. Reessaie dans un instant." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
    setActiveConversation("Nouvelle conversation");
  }

  return (
    <main className={isDark ? "chat-shell dark-mode" : "chat-shell"}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>atelier</span></div>
        <button className="new-chat" onClick={startNewChat}><span>+</span> Nouvelle conversation</button>
        <p className="sidebar-label">Conversations recentes</p>
        <button className="conversation active" onClick={() => setActiveConversation("Nouvelle conversation")}>
          <span className="conversation-dot" />{activeConversation}
        </button>
        <div className="sidebar-spacer" />
        <div className="plan-card"><span className="plan-icon">◈</span><div><strong>Plan gratuit</strong><small>Mode demo actif</small></div><span className="arrow">›</span></div>
        <button className="sidebar-link"><span>⚙</span> Parametres</button>
        <div className="profile"><span className="avatar">KB</span><span><strong>Khalil</strong><small>Compte personnel</small></span><span className="more">•••</span></div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <button className="mobile-brand" onClick={startNewChat}>✦ atelier</button>
          <div className="model-picker"><span className="status-dot" /> Atelier <span className="model-version">v1</span><span className="chevron">⌄</span></div>
          <button className="theme-toggle" onClick={() => setIsDark((value) => !value)} aria-label="Changer le theme">{isDark ? "☼" : "☾"}</button>
        </header>

        <div className="conversation-area">
          {messages.length === 0 ? (
            <div className="welcome fade-in">
              <div className="welcome-orb">✦</div>
              <p className="eyebrow">Votre espace de reflexion</p>
              <h1>Que voulez-vous<br /><em>imaginer</em> aujourd&apos;hui ?</h1>
              <p className="welcome-copy">Posez une question, explorez une idee ou commencez simplement par ecrire. Je suis la pour vous aider a avancer.</p>
              <div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}<span>↗</span></button>)}</div>
            </div>
          ) : (
            <div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === "assistant" ? "✦" : "KB"}</span><div><p className="message-name">{message.role === "assistant" ? "atelier" : "Vous"}</p><p className="message-content">{message.content}</p></div></div>)}{isLoading && <div className="message-row assistant"><span className="message-avatar">✦</span><div><p className="message-name">atelier</p><p className="typing"><i /><i /><i /></p></div></div>}</div>
          )}
        </div>

        <div className="composer-wrap"><form className="composer" onSubmit={sendMessage}><button type="button" className="attach" aria-label="Ajouter une piece jointe">+</button><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ecrivez votre message..." rows={1} /><button className="send" type="submit" disabled={!input.trim() || isLoading} aria-label="Envoyer">↑</button></form><p className="composer-note">Atelier peut faire des erreurs. Verifiez les informations importantes.</p></div>
      </section>
    </main>
  );
}
