import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

/**
 * Auth.js (next-auth v5) with Microsoft Entra ID (single-tenant).
 *
 * Env names are mapped explicitly — do not rely on Auth.js auto-discovery
 * (`AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_ISSUER`).
 *
 * Access control is via Entra Enterprise app "Assignment required".
 * Do not add an email allowlist in app code.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_APP_CLIENT_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET_VALUE!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_DIRECTORY_TENANT_ID}/v2.0`,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  // Behind Azure App Service reverse proxy: trust X-Forwarded-* when present.
  // Still set AUTH_URL to the public https://<app>.azurewebsites.net host —
  // without it Auth.js can build redirect_uri from the container hostname
  // (AADSTS50011). AUTH_URL is read automatically from the environment.
  trustHost: true,
  pages: {
    signIn: "/",
  },
});
