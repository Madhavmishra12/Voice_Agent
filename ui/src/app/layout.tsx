import "./globals.css";

import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import ChatwootWidget from "@/components/ChatwootWidget";
import { EventBanner } from "@/components/EventBanner";
import AppLayout from "@/components/layout/AppLayout";
import MetaPixel from "@/components/MetaPixel";
import PostHogIdentify from "@/components/PostHogIdentify";
import ReoProvider from "@/components/ReoProvider";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import SpinLoader from "@/components/SpinLoader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/context/AppConfigContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { OrgConfigProvider } from "@/context/OrgConfigContext";
import { TelephonyConfigWarningsProvider } from "@/context/TelephonyConfigWarningsContext";
import { AuthProvider } from "@/lib/auth";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowQR | Agentic AI for Growth",
  description: "Grow with agentic AI. Connect customer journeys, automate workflows, and create lasting growth with GrowQR.",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const reoClientId = process.env.NEXT_PUBLIC_REO_CLIENT_ID?.trim();
  // GrowQR Cloud only. Self-hosted/OSS installs leave this blank and never
  // render the event bar — same gating shape as the Meta Pixel above.
  const showEventBanner = process.env.NEXT_PUBLIC_EVENT_BANNER?.trim() === "1";

  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        {/* Keep the light GrowQR theme in place before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
        {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
        <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SentryErrorBoundary>
            {/* Above the app chrome on every route (auth pages included). It
                is sticky at top-0 and publishes --event-banner-h, which the
                header/sidebar offsets in AppLayout + globals.css consume. */}
            {showEventBanner ? <EventBanner /> : null}
            <AuthProvider>
              <AppConfigProvider>
                <Suspense fallback={<SpinLoader />}>
                  <OrgConfigProvider>
                    <TelephonyConfigWarningsProvider>
                      <OnboardingProvider>
                        <PostHogIdentify />
                        {reoClientId ? <ReoProvider clientId={reoClientId} /> : null}
                        <AppLayout>
                          {children}
                        </AppLayout>
                        <Toaster />
                        <ChatwootWidget />
                      </OnboardingProvider>
                    </TelephonyConfigWarningsProvider>
                  </OrgConfigProvider>
                </Suspense>
              </AppConfigProvider>
            </AuthProvider>
          </SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
