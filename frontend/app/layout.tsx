import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./tailwind-built.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropCare NW – Predictive Property Intelligence",
  description:
    "AI-powered predictive property maintenance, non-destructive moisture scanning, cavity acoustic leak diagnostics, and statutory compliance platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F7EDE5] text-[#493344] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
