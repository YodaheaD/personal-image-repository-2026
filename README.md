# personal-image-repository-2026

Lean Next.js (App Router) UI for the [func-image-repo](https://github.com/YodaheaD/func-image-repo) Azure Functions API.

## Quick start

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_FUNCTIONS_BASE_URL and FUNCTIONS_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See setup notes in the project doc (`image-repo-ui.md` in the agent store / linked from the PR).

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn-style Radix UI · Axios

No OAuth in this app yet. Function keys stay on the server via the `/api/functions/*` BFF proxy.

## Azure App Service

- Node **22**; startup: `npm start` (uses `PORT`, default 8080) or `bash startup.sh`
- Enable `SCM_DO_BUILD_DURING_DEPLOYMENT=true` if the site must install/build on deploy
- Set `NEXT_PUBLIC_FUNCTIONS_BASE_URL` + server-side `FUNCTIONS_KEY`
