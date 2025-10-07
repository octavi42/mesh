import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./silk.css";
import { SidebarProvider } from "@/lib/contexts/sidebar-context";
import { getProjects } from "@/lib/db/projects";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeamZ",
  description: "Collaborative project management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() })
  let projects = []

  if (session?.user) {
    try {
      projects = await getProjects()
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider initialProjects={projects}>
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
