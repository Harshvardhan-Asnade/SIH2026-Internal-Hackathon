import type { Metadata } from "next";
import { Inter, Outfit, Space_Grotesk, Space_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const spaceMono = Space_Mono({ weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-space-mono", display: "swap" });
const dmSerifDisplay = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif-display", display: "swap" });

export const metadata: Metadata = {
  title: "RailVision AI",
  description: "The intelligence layer for railway surveillance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${dmSerifDisplay.variable}`}>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
