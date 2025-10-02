"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthSheet } from "@/components/sheets/auth-sheet";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm"></div>
            <span className="font-medium text-slate-900">teamz</span>
          </div>
          <AuthSheet />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center space-y-10 py-20">
          <div className="space-y-6">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light tracking-tight text-slate-900">
              Team collaboration,
              <br />
              <span className="font-medium bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                reimagined
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto font-light leading-relaxed">
              Work smarter together with AI-powered insights and seamless collaboration
            </p>
          </div>

          <div className="flex gap-3 items-center justify-center pt-4">
            <Button
              size="lg"
              className="rounded-full px-8 shadow-sm hover:shadow-md transition-shadow"
              asChild
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-slate-400 font-light">© 2025 teamz</p>
        </div>
      </footer>
    </div>
  );
}
