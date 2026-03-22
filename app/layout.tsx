import type { Metadata, Viewport } from "next";
import { Outfit, Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/components/custom-cursor";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AuthHandler } from "@/components/auth-handler";

const outfit = Outfit({
  subsets: ["latin"],
  display: 'swap',
});

const syne = Syne({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Repeto",
  description: "Votre partenaire de répétition intelligent.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Repeto",
    startupImage: [],
  },
  icons: {
    apple: "/icon-192.png",
  },
};

import { MobileStatusBar } from "@/components/mobile-status-bar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${outfit.className} ${syne.variable} ${dmSans.variable} bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <MobileStatusBar />
          <AuthHandler />
          <CustomCursor />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
