"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; attachment?: { name: string; type: string; dataUrl: string } };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };

const STORAGE_KEY = "atelier-conversations";
const suggestions = ["Explique-moi une idee simplement", "Aide-moi a organiser ma journee", "Ecris un plan pour mon projet"];

function makeConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "Nouvelle conversation", messages: [], updatedAt: Date.now() };
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Conversation[]) : [];
      const initial = parsed.length ? parsed : [makeConversation()];
      // Hydrate browser-only conversation state after the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversations(initial);
      setActiveId(initial[0].id);
    } catch {
      const initial = makeConversation();
      setConversations([initial]);
      setActiveId(initial.id);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (isReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, isReady]);

  function updateConversation(id: string, update: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation));
  }

  function startNewChat() {
    const conversation = makeConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setAttachment("");
  }

  function deleteConversation(id: string) {
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    const next = remaining.length ? remaining : [makeConversation()];
    setConversations(next);
    if (activeId === id) setActiveId(next[0].id);
  }

  function renameConversation(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    const title = window.prompt("Nom de la conversation", conversation?.title ?? "");
    if (title?.trim()) updateConversation(id, (item) => ({ ...item, title: title.trim() }));
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAttachment(JSON.stringify({ name: file.name, type: file.type, dataUrl: reader.result }));
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isLoading || !activeConversation) return;
    const attachmentData = attachment ? (JSON.parse(attachment) as { name: string; type: string; dataUrl: string }) : null;
    const userContent = attachmentData ? `${content}\n\n[Piece jointe : ${attachmentData.name}]` : content;
    const userMessage: Message = { role: "user", content: userContent, attachment: attachmentData ?? undefined };
    const history = [...messages, userMessage];
    updateConversation(activeId, (conversation) => ({ ...conversation, title: conversation.messages.length ? conversation.title : content.slice(0, 35), messages: history, updatedAt: Date.now() }));
    setInput("");
    setAttachment("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, messages: history, attachment: attachmentData }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Le service IA est indisponible.");
      updateConversation(activeId, (conversation) => ({ ...conversation, messages: [...conversation.messages, { role: "assistant", content: data.reply }], updatedAt: Date.now() }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue.";
      updateConversation(activeId, (conversation) => ({ ...conversation, messages: [...conversation.messages, { role: "assistant", content: `Erreur : ${errorMessage}` }] }));
    } finally {
      setIsLoading(false);
    }
  }

  if (!isReady) return <main className="chat-shell loading-screen">Chargement de votre espace...</main>;

  return (
    <main className={isDark ? "chat-shell dark-mode" : "chat-shell"}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>atelier</span></div>
        <button className="new-chat" onClick={startNewChat}><span>+</span> Nouvelle conversation</button>
        <p className="sidebar-label">Conversations recentes</p>
        <div className="conversation-list">{[...conversations].sort((a, b) => b.updatedAt - a.updatedAt).map((conversation) => <div className={conversation.id === activeId ? "conversation active" : "conversation"} key={conversation.id}><button className="conversation-select" onClick={() => setActiveId(conversation.id)}><span className="conversation-dot" />{conversation.title}</button><button className="conversation-action" onClick={() => renameConversation(conversation.id)} aria-label="Renommer">•••</button><button className="conversation-action delete-action" onClick={() => deleteConversation(conversation.id)} aria-label="Supprimer">×</button></div>)}</div>
        <div className="sidebar-spacer" />
        <div className="plan-card"><span className="plan-icon">◈</span><div><strong>Plan gratuit</strong><small>Groq connecte</small></div><span className="arrow">›</span></div>
        <button className="sidebar-link"><span>⚙</span> Parametres</button>
        <div className="profile"><span className="avatar">KB</span><span><strong>Khalil</strong><small>Compte personnel</small></span><span className="more">•••</span></div>
      </aside>
      <section className="chat-panel">
        <header className="topbar"><button className="mobile-brand" onClick={startNewChat}>atelier <span className="chevron">⌄</span></button><div className="model-picker"><span className="status-dot" /> Atelier <span className="model-version">v1</span><span className="chevron">⌄</span></div><div className="top-actions"><button className="login-button">Se connecter</button><button className="signup-button">Inscription gratuite</button><button className="theme-toggle" onClick={() => setIsDark((value) => !value)} aria-label="Changer le theme">{isDark ? "☼" : "☾"}</button></div></header>
        <div className="conversation-area">{messages.length === 0 ? <div className="welcome fade-in"><h1>Par quoi<br />commençons-nous ?</h1><div className="welcome-composer"><ChatComposer input={input} setInput={setInput} attachment={attachment} handleFile={handleFile} sendMessage={sendMessage} isLoading={isLoading} /></div><div className="suggestions">{suggestions.slice(0, 1).map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div></div> : <div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === "assistant" ? "✦" : "KB"}</span><div className="message-body"><p className="message-name">{message.role === "assistant" ? "atelier" : "Vous"}</p>{message.attachment && <img className="attachment-preview" src={message.attachment.dataUrl} alt={message.attachment.name} />}{message.role === "assistant" ? <RichText content={message.content} /> : <p className="message-content">{message.content}</p>}</div></div>)}{isLoading && <div className="message-row assistant"><span className="message-avatar">✦</span><div><p className="message-name">atelier</p><p className="typing"><i /><i /><i /></p></div></div>}</div>}</div>
        {messages.length > 0 && <div className="composer-wrap"><ChatComposer input={input} setInput={setInput} attachment={attachment} handleFile={handleFile} sendMessage={sendMessage} isLoading={isLoading} /><p className="composer-note">{attachment ? `Fichier joint : ${(JSON.parse(attachment) as { name: string }).name}` : "Atelier peut faire des erreurs. Verifiez les informations importantes."}</p></div>}
        {messages.length === 0 && <p className="legal-note">Atelier est une IA. En l’utilisant, vous acceptez nos conditions et notre politique de confidentialité.</p>}
      </section>
    </main>
  );
}

function RichText({ content }: { content: string }) {
  return <div className="rich-content">{content.split("\n").map((line, index) => <p key={`${line}-${index}`}>{line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p>)}</div>;
}

function ChatComposer({ input, setInput, attachment, handleFile, sendMessage, isLoading }: { input: string; setInput: (value: string) => void; attachment: string; handleFile: (event: ChangeEvent<HTMLInputElement>) => void; sendMessage: (event?: FormEvent) => void; isLoading: boolean }) {
  return <form className="composer" onSubmit={sendMessage}><label className="attach" aria-label="Ajouter une piece jointe"><input type="file" onChange={handleFile} accept=".txt,.md,.pdf,.png,.jpg,.jpeg" />+</label><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={attachment ? "Fichier pret. Decrivez ce que vous voulez analyser..." : "Demander a Atelier"} rows={1} /><span className="mic-icon">⌕</span><button className="send" type="submit" disabled={!input.trim() || isLoading} aria-label="Envoyer">↑</button></form>;
}
