"use client";

import { ChangeEvent, FormEvent, useEffect, useState, type ReactNode } from "react";

type Message = { role: "user" | "assistant"; content: string; attachment?: { name: string; type: string; dataUrl: string } };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };

const STORAGE_KEY = "atelier-conversations";
const suggestions = ["Explique-moi une idee simplement", "Aide-moi a organiser ma journee", "Ecris un plan pour mon projet"];
const translations = {
  fr: { brand: "atelier", newChat: "Nouvelle conversation", recent: "Conversations recentes", images: "Images", plugins: "Plugins", research: "Recherche approfondie", offers: "Voir les offres et les tarifs", help: "Aide", settings: "Paramètres", plan: "Plan gratuit", connected: "Groq connecte", account: "Compte personnel", login: "Se connecter", signup: "Inscription gratuite", welcome: "Par quoi", welcomeLine: "commençons-nous ?", placeholder: "Demander a Atelier", suggestion: "Qu'est-ce que tu sais faire ?", legal: "Atelier est une IA. En l’utilisant, vous acceptez nos conditions et notre politique de confidentialité." },
  en: { brand: "atelier", newChat: "New chat", recent: "Recent conversations", images: "Images", plugins: "Plugins", research: "Deep research", offers: "View plans and pricing", help: "Help", settings: "Settings", plan: "Free plan", connected: "Groq connected", account: "Personal account", login: "Log in", signup: "Sign up free", welcome: "What should we", welcomeLine: "start with?", placeholder: "Ask Atelier", suggestion: "What can you do?", legal: "Atelier is an AI. By using it, you accept our terms and privacy policy." },
  ar: { brand: "atelier", newChat: "محادثة جديدة", recent: "المحادثات الأخيرة", images: "الصور", plugins: "الإضافات", research: "بحث معمق", offers: "عرض الخطط والأسعار", help: "المساعدة", settings: "الإعدادات", plan: "الخطة المجانية", connected: "Groq متصل", account: "حساب شخصي", login: "تسجيل الدخول", signup: "إنشاء حساب مجاني", welcome: "بماذا", welcomeLine: "نبدأ؟", placeholder: "اسأل Atelier", suggestion: "ماذا يمكنك أن تفعل؟", legal: "Atelier هو نظام ذكاء اصطناعي. باستخدامه، أنت توافق على الشروط وسياسة الخصوصية." },
} as const;

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Sketch");
  const [improveModel, setImproveModel] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(true);
  const [marketingAudience, setMarketingAudience] = useState(true);
  const [personalizedMarketing, setPersonalizedMarketing] = useState(true);
  const [language, setLanguage] = useState("fr");
  const [isReady, setIsReady] = useState(false);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const messages = activeConversation?.messages ?? [];
  const ui = translations[language === "ar" ? "ar" : language === "en" ? "en" : "fr"];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Conversation[]) : [];
      const initial = parsed.length ? parsed : [makeConversation()];
      // Hydrate browser-only conversation state after the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversations(initial);
      setActiveId(initial[0].id);
      const savedSettings = window.localStorage.getItem("atelier-settings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings) as Partial<Record<string, boolean>>;
        if (typeof settings.improveModel === "boolean") setImproveModel(settings.improveModel);
        if (typeof settings.personalizedAds === "boolean") setPersonalizedAds(settings.personalizedAds);
        if (typeof settings.marketingAudience === "boolean") setMarketingAudience(settings.marketingAudience);
        if (typeof settings.personalizedMarketing === "boolean") setPersonalizedMarketing(settings.personalizedMarketing);
        if (typeof settings.language === "string") setLanguage(settings.language);
      }
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

  useEffect(() => {
    if (isReady) window.localStorage.setItem("atelier-settings", JSON.stringify({ improveModel, personalizedAds, marketingAudience, personalizedMarketing, language }));
  }, [improveModel, personalizedAds, marketingAudience, personalizedMarketing, language, isReady]);

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

  function openImagePicker() {
    setIsImagesOpen(true);
    setIsSettingsOpen(false);
    setIsSidebarOpen(false);
  }

  function startResearch() {
    startNewChat();
    setInput(language === "ar" ? "ابحث بعمق في هذا الموضوع: " : language === "en" ? "Research this topic in depth: " : "Recherche approfondie sur ce sujet : ");
    setIsSidebarOpen(false);
  }

  function openHelp() {
    startNewChat();
    setInput(language === "ar" ? "كيف يمكنني استخدام Atelier؟" : language === "en" ? "How can I use Atelier?" : "Comment utiliser Atelier ?");
    setIsSidebarOpen(false);
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
    <main dir={language === "ar" ? "rtl" : "ltr"} className={isDark ? "chat-shell dark-mode" : "chat-shell"}>
      <aside className={isSidebarOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="sidebar-header"><div className="brand"><span className="brand-mark">✦</span><span>{ui.brand}</span></div><button className="collapse-sidebar" onClick={() => setIsSidebarOpen(false)} aria-label={ui.settings}>◧</button></div>
        <button className="new-chat" onClick={startNewChat}><span>+</span> {ui.newChat}</button>
        <nav className="product-menu" aria-label="Menu principal">
          <button onClick={startNewChat}><span>✎</span> {ui.newChat}</button>
          <button onClick={openImagePicker}><span>▧</span> {ui.images}</button>
          <button onClick={startResearch}><span>⌁</span> {ui.research}</button>
          <button onClick={openHelp}><span>◌</span> {ui.help}</button>
          <button onClick={() => setIsSettingsOpen(true)}><span>⚙</span> {ui.settings}</button>
        </nav>
        <p className="sidebar-label">{ui.recent}</p>
        <div className="conversation-list">{[...conversations].sort((a, b) => b.updatedAt - a.updatedAt).map((conversation) => <div className={conversation.id === activeId ? "conversation active" : "conversation"} key={conversation.id}><button className="conversation-select" onClick={() => setActiveId(conversation.id)}><span className="conversation-dot" />{conversation.title}</button><button className="conversation-action" onClick={() => renameConversation(conversation.id)} aria-label="Renommer">•••</button><button className="conversation-action delete-action" onClick={() => deleteConversation(conversation.id)} aria-label="Supprimer">×</button></div>)}</div>
        <div className="sidebar-spacer" />
        <div className="plan-card"><span className="plan-icon">◈</span><div><strong>{ui.plan}</strong><small>{ui.connected}</small></div><span className="arrow">›</span></div>
        <button className="sidebar-link" onClick={() => setIsSettingsOpen(true)}><span>⚙</span> {ui.settings}</button>
        <div className="profile"><span className="avatar">KB</span><span><strong>Khalil</strong><small>{ui.account}</small></span><span className="more">•••</span></div>
      </aside>
      <section className="chat-panel">
        <header className="topbar"><button className="open-sidebar" onClick={() => setIsSidebarOpen(true)} aria-label={ui.settings}>☰</button><button className="mobile-brand" onClick={startNewChat}>ChatGPT <span className="chevron">⌄</span></button><div className="model-picker"><span className="status-dot" /> Atelier <span className="model-version">v1</span><span className="chevron">⌄</span></div><div className="top-actions"><button className="theme-toggle" onClick={() => setIsDark((value) => !value)} aria-label={ui.settings}>{isDark ? "☼" : "☾"}</button></div></header>
        {isImagesOpen ? <ImagesPanel language={language} prompt={imagePrompt} setPrompt={setImagePrompt} style={selectedStyle} setStyle={setSelectedStyle} onClose={() => setIsImagesOpen(false)} /> : isSettingsOpen ? <SettingsPanel language={language} setLanguage={setLanguage} isDark={isDark} setIsDark={setIsDark} improveModel={improveModel} setImproveModel={setImproveModel} personalizedAds={personalizedAds} setPersonalizedAds={setPersonalizedAds} marketingAudience={marketingAudience} setMarketingAudience={setMarketingAudience} personalizedMarketing={personalizedMarketing} setPersonalizedMarketing={setPersonalizedMarketing} onClose={() => setIsSettingsOpen(false)} /> : <div className="conversation-area">{messages.length === 0 ? <div className="welcome fade-in"><h1>{ui.welcome}<br />{ui.welcomeLine}</h1><div className="welcome-composer"><ChatComposer input={input} setInput={setInput} attachment={attachment} handleFile={handleFile} sendMessage={sendMessage} isLoading={isLoading} placeholder={ui.placeholder} /></div><div className="suggestions"><button onClick={() => setInput(suggestions[0])}>{ui.suggestion}</button></div></div> : <div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === "assistant" ? "✦" : "KB"}</span><div className="message-body"><p className="message-name">{message.role === "assistant" ? ui.brand : (language === "en" ? "You" : language === "ar" ? "أنت" : "Vous")}</p>{message.attachment && <img className="attachment-preview" src={message.attachment.dataUrl} alt={message.attachment.name} />}{message.role === "assistant" ? <RichText content={message.content} /> : <p className="message-content">{message.content}</p>}</div></div>)}{isLoading && <div className="message-row assistant"><span className="message-avatar">✦</span><div><p className="message-name">{ui.brand}</p><p className="typing"><i /><i /><i /></p></div></div>}</div>}</div>}
        {messages.length > 0 && <div className="composer-wrap"><ChatComposer input={input} setInput={setInput} attachment={attachment} handleFile={handleFile} sendMessage={sendMessage} isLoading={isLoading} placeholder={ui.placeholder} /><p className="composer-note">{attachment ? `Fichier joint : ${(JSON.parse(attachment) as { name: string }).name}` : ui.legal}</p></div>}
        {messages.length === 0 && <p className="legal-note">{ui.legal}</p>}
      </section>
    </main>
  );
}

function RichText({ content }: { content: string }) {
  return <div className="rich-content">{content.split("\n").map((line, index) => <p key={`${line}-${index}`}>{line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p>)}</div>;
}

function ChatComposer({ input, setInput, attachment, handleFile, sendMessage, isLoading, placeholder }: { input: string; setInput: (value: string) => void; attachment: string; handleFile: (event: ChangeEvent<HTMLInputElement>) => void; sendMessage: (event?: FormEvent) => void; isLoading: boolean; placeholder: string }) {
  return <form className="composer" onSubmit={sendMessage}><label className="attach" aria-label="Ajouter une piece jointe"><input id="atelier-file-input" type="file" onChange={handleFile} accept=".txt,.md,.pdf,.png,.jpg,.jpeg" />+</label><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={attachment ? "Fichier pret. Decrivez ce que vous voulez analyser..." : placeholder} rows={1} /><span className="mic-icon">⌕</span><button className="send" type="submit" disabled={!input.trim() || isLoading} aria-label="Envoyer">↑</button></form>;
}

function SettingsPanel({ language, setLanguage, isDark, setIsDark, improveModel, setImproveModel, personalizedAds, setPersonalizedAds, marketingAudience, setMarketingAudience, personalizedMarketing, setPersonalizedMarketing, onClose }: { language: string; setLanguage: (value: string) => void; isDark: boolean; setIsDark: (value: boolean) => void; improveModel: boolean; setImproveModel: (value: boolean) => void; personalizedAds: boolean; setPersonalizedAds: (value: boolean) => void; marketingAudience: boolean; setMarketingAudience: (value: boolean) => void; personalizedMarketing: boolean; setPersonalizedMarketing: (value: boolean) => void; onClose: () => void }) {
  const arabic = language === "ar";
  const copy = arabic ? { settings: "الإعدادات", theme: "المظهر", system: "النظام", dark: "داكن", light: "فاتح", language: "اللغة", auto: "اكتشاف تلقائي", data: "إدارة البيانات", improve: "تحسين النموذج للجميع", improveText: "السماح باستخدام المحتوى لتحسين النماذج والأداء.", ads: "تخصيص الإعلانات", adsText: "السماح باستخدام المحادثات والتفضيلات لاختيار الإعلانات.", audience: "قياس الجمهور التسويقي", audienceText: "تساعدنا ملفات تعريف الارتباط على قياس فعالية الحملات.", marketing: "التسويق المخصص", marketingText: "يساعدنا ذلك على تخصيص الحملات وقياسها.", back: "رجوع" } : { settings: language === "en" ? "Settings" : "Paramètres", theme: language === "en" ? "Theme" : "Thème", system: language === "en" ? "System" : "Système", dark: language === "en" ? "Dark" : "Sombre", light: language === "en" ? "Light" : "Clair", language: language === "en" ? "Language" : "Langue", auto: language === "en" ? "Automatic detection" : "Détection automatique", data: language === "en" ? "Data controls" : "Gestion des données", improve: language === "en" ? "Improve the model for everyone" : "Améliorer le modèle pour tous", improveText: language === "en" ? "Allow your content to improve models and performance." : "Autorisez l'utilisation de votre contenu pour améliorer les modèles et les performances.", ads: language === "en" ? "Personalize ads" : "Personnaliser les publicités", adsText: language === "en" ? "Use chats and preferences to select ads." : "Autorisez l'utilisation de vos chats et préférences pour sélectionner des publicités.", audience: language === "en" ? "Marketing audience measurement" : "Mesure d'audience marketing", audienceText: language === "en" ? "Cookies help measure campaign effectiveness." : "Ces cookies nous aident à mesurer l'efficacité des campagnes.", marketing: language === "en" ? "Personalized marketing" : "Marketing personnalisé", marketingText: language === "en" ? "Personalize and measure campaigns on third-party platforms." : "Personnalisez et mesurez les campagnes sur des plateformes tierces.", back: language === "en" ? "Back" : "Retour" };
  return <div className="settings-area"><div className="settings-content"><div className="settings-heading"><button className="settings-back" onClick={onClose} aria-label={copy.back}>‹</button><h1>{copy.settings}</h1></div><section className="settings-card"><SettingRow label={copy.theme}><select value={isDark ? "dark" : "system"} onChange={(event) => setIsDark(event.target.value === "dark")}><option value="system">{copy.system}</option><option value="dark">{copy.dark}</option><option value="light">{copy.light}</option></select></SettingRow><SettingRow label={copy.language}><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="auto">{copy.auto}</option><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></SettingRow></section><h2>{copy.data}</h2><section className="settings-card"><ToggleRow title={copy.improve} description={copy.improveText} value={improveModel} onChange={setImproveModel} /><ToggleRow title={copy.ads} description={copy.adsText} value={personalizedAds} onChange={setPersonalizedAds} /><ToggleRow title={copy.audience} description={copy.audienceText} value={marketingAudience} onChange={setMarketingAudience} /><ToggleRow title={copy.marketing} description={copy.marketingText} value={personalizedMarketing} onChange={setPersonalizedMarketing} /></section></div></div>;
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="setting-row"><strong>{label}</strong><span>{children}</span></div>;
}

function ToggleRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="toggle-row"><div><strong>{title}</strong><p>{description}</p></div><button className={value ? "toggle on" : "toggle"} onClick={() => onChange(!value)} aria-pressed={value}><span /></button></div>;
}

function ImagesPanel({ language, prompt, setPrompt, style, setStyle, onClose }: { language: string; prompt: string; setPrompt: (value: string) => void; style: string; setStyle: (value: string) => void; onClose: () => void }) {
  const arabic = language === "ar";
  const title = arabic ? "الصور" : language === "en" ? "Images" : "Images";
  const placeholder = arabic ? "صف صورة جديدة" : language === "en" ? "Describe a new image" : "Décrire une nouvelle image";
  const styles = ["Sketch", "Stickers", "Portrait", "Caricature", "Illustration", "Photo réaliste"];
  return <div className="images-area"><div className="images-content"><div className="images-heading"><button className="settings-back" onClick={onClose}>‹</button><h1>{title}</h1></div><form className="image-prompt" onSubmit={(event) => event.preventDefault()}><span>⌕</span><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={placeholder} /><button type="submit" disabled={!prompt.trim()} aria-label="Generer">↑</button></form><h2>{arabic ? "إنشاء صورة" : language === "en" ? "Create an image" : "Créer une image"}</h2><div className="style-grid">{styles.map((item) => <button className={style === item ? "style-card selected" : "style-card"} onClick={() => setStyle(item)} key={item}><span className={`style-art style-${item.toLowerCase().replaceAll(" ", "-")}`}>{item === "Sketch" ? "✿" : item === "Stickers" ? "✦" : item === "Portrait" ? "◉" : item === "Caricature" ? "☻" : item === "Illustration" ? "✧" : "◌"}</span><strong>{item}</strong></button>)}</div><p className="images-note">{prompt ? `Style sélectionné : ${style}. Le prompt est prêt pour une API de génération d'images.` : "Choisissez un style puis décrivez votre image."}</p></div></div>;
}
