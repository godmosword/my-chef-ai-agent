import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SerwistRegistration } from "@/components/providers/SerwistRegistration";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { SettingsBootstrap } from "@/components/providers/SettingsBootstrap";
import { THEME_BOOTSTRAP_SOURCE } from "@/lib/theme";

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SOURCE }} />
      </head>
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        <SerwistRegistration>
          <OfflineProvider>
            <PostHogProvider>
              <SettingsBootstrap />
              <ToastProvider>{children}</ToastProvider>
            </PostHogProvider>
          </OfflineProvider>
        </SerwistRegistration>
      </body>
    </html>
  );
}
