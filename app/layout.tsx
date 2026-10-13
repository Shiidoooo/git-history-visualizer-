import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
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
  title: "Git History Visualizer",
  description: "Explore how any public GitHub repository evolved: commit activity and top contributors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-2.5 sm:py-3 sm:px-6">
            <Link href="/" className="inline-flex items-center min-h-[36px] rounded-md text-sm font-semibold tracking-tight outline-offset-4 focus-visible:outline-2">
              Git History Visualizer
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
