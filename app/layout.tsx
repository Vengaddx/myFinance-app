import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import BiometricProvider from "@/app/components/BiometricProvider";
import DevBadge from "@/app/components/DevBadge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "myFinance",
  description: "Personal finance and investment tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "myFinance",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/favicon.svg",  type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32",   type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png",   sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DevBadge />
        <ThemeProvider><AuthProvider><BiometricProvider>{children}</BiometricProvider></AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
