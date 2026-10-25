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
  // App Service sits behind a reverse proxy; required for correct callback URLs.
  trustHost: true,
  pages: {
    signIn: "/",
  },
});
