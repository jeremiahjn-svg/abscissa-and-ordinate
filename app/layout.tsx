import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import BuyMeACoffeeButton from "./BuyMeACoffeeButton";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: "Abscissa & Ordinate",
  description: "Data visualizations, applications, and analytics guides.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-space-900 text-starlight-200 antialiased min-h-screen bg-cosmic-gradient bg-fixed selection:bg-brass-500 selection:text-space-900`}>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
        <nav className="border-b border-space-700/50 bg-space-900/70 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <span className="font-serif text-2xl font-bold tracking-wider text-brass-400">
              A&O
            </span>
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
              <div className="flex gap-6 sm:gap-8 text-sm tracking-widest uppercase text-starlight-300">
                <a href="#apps" className="hover:text-brass-400 transition-colors">Apps</a>
                <a href="#blog" className="hover:text-brass-400 transition-colors">Insights</a>
                <a href="#about" className="hover:text-brass-400 transition-colors">About</a>
              </div>
              <BuyMeACoffeeButton />
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-space-700/50">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="font-serif text-lg text-brass-400 tracking-wide">
              Abscissa &amp; Ordinate
            </span>
            <p className="text-xs text-starlight-400 tracking-widest uppercase">
              &copy; {new Date().getFullYear()} &mdash; Structured like data, improvised like jazz
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
