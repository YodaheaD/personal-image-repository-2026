import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SessionProvider } from "@/components/auth/session-provider";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "image Repo",
  description: "Personal image repository UI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-svh overflow-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-svh flex-col overflow-hidden antialiased`}
      >
        <SessionProvider session={session}>
          <Navbar signedIn={!!session} />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
