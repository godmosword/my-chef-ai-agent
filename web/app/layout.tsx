import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SerwistRegistration } from "@/components/providers/SerwistRegistration";
import { OfflineProvider } from "@/components/providers/OfflineProvider";

const notoSans = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_TC({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "職人料理大腦",
  description: "你的私人料理大腦",
  manifest: "/manifest.webmanifest",
  applicationName: "職人料理大腦",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "料理大腦",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFAF5",
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
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        <SerwistRegistration>
          <OfflineProvider>
            <ThemeProvider>
              <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
          </OfflineProvider>
        </SerwistRegistration>
      </body>
    </html>
  );
}
