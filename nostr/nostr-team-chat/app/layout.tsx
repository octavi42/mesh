import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { GlobalConfirmationDialog } from "@/components/ui/global-confirmation-dialog";
import { Toaster } from "sonner";
import Hydration from "@/components/hydration";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { ErrorBoundary } from "@/components/error-boundary";
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
  title: "Nostr Team Chat",
  description: "Decentralized team collaboration on Nostr",
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
