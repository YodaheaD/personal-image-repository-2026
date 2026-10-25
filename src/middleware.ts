import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Auth.js routes must stay public
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Landing: signed-in users go to the gallery
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/images", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Everything else (pages + BFF) requires a session
  if (!isLoggedIn) {
    const signInUrl = new URL("/", req.nextUrl);
    if (pathname !== "/") {
      signInUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Protect all routes except Next static assets and the favicon.
     * Auth API is allowed through in the middleware body above.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
