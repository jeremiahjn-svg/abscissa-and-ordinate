import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-space-900 text-starlight-200 antialiased min-h-screen bg-cosmic-gradient selection:bg-brass-500 selection:text-space-900`}>
        <nav className="border-b border-space-700/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <span className="font-serif text-2xl font-bold tracking-wider text-brass-400">
              A&O
            </span>
            <div className="space-x-8 text-sm tracking-widest uppercase">
              <a href="#apps" className="hover:text-brass-400 transition-colors">Apps</a>
              <a href="#blog" className="hover:text-brass-400 transition-colors">Insights</a>
              <a href="#about" className="hover:text-brass-400 transition-colors">About</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
