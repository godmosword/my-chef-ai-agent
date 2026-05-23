"use client";

import { SerwistProvider } from "@serwist/next/react";

const disabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_PWA === "false";

export function SerwistRegistration({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={disabled}
      register
      reloadOnOnline
      cacheOnNavigation
    >
      {children}
    </SerwistProvider>
  );
}
