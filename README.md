## atelier

Une plateforme de conversation inspiree de ChatGPT, construite avec Next.js, TypeScript et Tailwind CSS.

Elle comprend une interface responsive, des suggestions de conversation, un mode clair/sombre, des conversations sauvegardees dans le navigateur, le renommage/suppression des conversations, des pieces jointes comme contexte et une route serveur `POST /api/chat`. Sans cle API, elle fonctionne en mode demo.

L'API limite la taille des messages et le nombre de requetes par minute pour proteger le quota Groq gratuit.

## Architecture Supabase

La base du backend professionnel est incluse dans `supabase/schema.sql` : tables des conversations et messages, index, trigger de mise a jour et Row Level Security.

1. Cree un projet sur Supabase.
2. Execute `supabase/schema.sql` dans le SQL Editor.
3. Ajoute ces variables dans `.env.local` et dans Vercel :

```env
NEXT_PUBLIC_SUPABASE_URL=ton_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon_supabase
```

Les clients Supabase sont dans `lib/supabase` et `proxy.ts` rafraichit les sessions de maniere compatible avec Next.js 16. La connexion et la synchronisation multi-appareils pourront utiliser cette base sans changer l'architecture.

## Activer Groq gratuitement

1. Cree un compte Groq et une cle API depuis la console Groq.
2. Cree un fichier `.env.local` a la racine du projet :

```env
GROQ_API_KEY=ta_cle_api_ici
```

3. Redemarre le serveur avec `npm run dev`.

La cle reste cote serveur et n'est jamais envoyee au navigateur. L'utilisation gratuite depend des limites du compte Groq.

## Getting Started

Lance le serveur de developpement :

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
