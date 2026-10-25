# personal-image-repository-2026

Lean Next.js (App Router) UI for the [func-image-repo](https://github.com/YodaheaD/func-image-repo) Azure Functions API.

## Quick start

```bash
cp .env.example .env.local
# set Functions + Auth env vars (see below)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See setup notes in the project doc (`image-repo-ui.md` in the agent store / linked from the PR).

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn-style Radix UI · Axios · Auth.js (next-auth v5) · Microsoft Entra ID

## Auth (Microsoft Entra ID)

Single-tenant Entra sign-in via Auth.js. Who can sign in is gated by the Enterprise app **Assignment required** setting — there is **no** email allowlist in app code.

### Local env (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | Auth.js session encryption (`openssl rand -base64 32`) |
| `AUTH_MICROSOFT_ENTRA_ID_APP_CLIENT_ID` | Entra Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_DIRECTORY_TENANT_ID` | Entra Directory (tenant) ID |
| `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET_VALUE` | Client secret **value** |
| `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET_ID` | Optional; unused by the app |

These names are mapped explicitly in `src/auth.ts` (not Auth.js default auto-discovery names).

### Redirect URIs (Entra app registration → Authentication)

- `http://localhost:3000/api/auth/callback/microsoft-entra-id`
- `https://<image-repo-app host>/api/auth/callback/microsoft-entra-id`

### Routes

- `/` — landing / sign-in (unauthenticated); signed-in users redirect to `/images`
- `/api/auth/*` — Auth.js handlers (public)
- All other routes (including `/api/functions/*`) require a session

## Azure App Service

Production deploy uses **Next.js standalone** zip (not Oryx/`npm start` on the site):

- `output: 'standalone'` in `next.config.ts`
- Startup: `node azure-start.js`
- Workflow builds, packages `.next/standalone`, deploys `release.zip` to `image-repo-app`

Set GitHub var `NEXT_PUBLIC_FUNCTIONS_BASE_URL` and App Service `FUNCTIONS_KEY` plus the Auth env vars above (already expected on `image-repo-app`). See project doc `image-repo-ui.md`.
