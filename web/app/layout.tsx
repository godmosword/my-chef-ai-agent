import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SerwistRegistration } from "@/components/providers/SerwistRegistration";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { SettingsBootstrap } from "@/components/providers/SettingsBootstrap";

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
  viewportFit: "cover",
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
              <PostHogProvider>
                <SettingsBootstrap />
                <ToastProvider>{children}</ToastProvider>
              </PostHogProvider>
            </ThemeProvider>
          </OfflineProvider>
        </SerwistRegistration>
      </body>
    </html>
  );
}
