import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://engramport.com"),
  title: "EngramPort — The project remembers",
  description: "Shared project state for humans and AI agents. Preserve decisions, exchange work, and continue across vendors, applications, and sessions.",
  openGraph: {
    title: "EngramPort — The project remembers",
    description: "Shared project state for humans and AI agents.",
    type: "website",
    url: "https://engramport.com",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "EngramPort — The project remembers. Every agent continues." }],
  },
  twitter: { card: "summary_large_image", title: "EngramPort — The project remembers", description: "Shared project state for humans and AI agents.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
