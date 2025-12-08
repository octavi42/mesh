import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { GlobalConfirmationDialog } from "@/components/ui/global-confirmation-dialog";
import { Toaster } from "sonner";
import Hydration from "@/components/hydration";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import "./globals.css";
import "./silk.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mesh",
    template: "%s | Mesh",
  },
  description: "Decentralized team collaboration on Nostr. Private, secure, and censorship-resistant messaging for teams.",
  keywords: ["nostr", "team chat", "decentralized", "messaging", "collaboration", "secure", "private"],
  authors: [{ name: "Mesh" }],
  creator: "Mesh",
  
  // OpenGraph - for Facebook, LinkedIn, Slack, Discord, etc.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
    siteName: "Mesh",
    title: "Mesh",
    description: "Decentralized team collaboration on Nostr. Private, secure, and censorship-resistant messaging for teams.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mesh - Decentralized Team Collaboration",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Mesh",
    description: "Decentralized team collaboration on Nostr. Private, secure, and censorship-resistant.",
    images: ["/og-image.png"],
  },
  
  // Favicon and icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  
  // App manifest for PWA
  manifest: "/manifest.json",
  
  // Theme color for browser chrome
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  
  // Robots
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Hydration />
        <ErrorBoundary>
          <Providers>
            <OfflineIndicator />
            <PostHogPageView />
            {children}
            <GlobalConfirmationDialog />
            <Toaster position="top-right" richColors />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
