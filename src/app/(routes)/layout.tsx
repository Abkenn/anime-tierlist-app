import { Toaster } from '@/app/_components/ui/toast';
import { OfflineSupport } from '@/app/_providers/offline-support';
import '../_styles/globals.css';

import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense, ViewTransition } from 'react';
import { OfflineStatus } from '@/app/_components/offline/offline-status';
import { HomeLink } from '@/app/_components/shell/home-link';
import { ThemeToggle } from '@/app/_components/shell/theme-toggle';
import { siteAccent, siteUrl } from '@/app/_lib/site-metadata';
import { ThemeProvider } from '@/app/_providers/theme-provider';
import { geistMono, geistSans } from '@/app/_styles/fonts';
import type { RootLayoutProps } from '@/app/_types/layout.types';

export const viewport: Viewport = { themeColor: siteAccent };

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: 'Anime Tierlist',
  title: 'Anime Tierlist',
  description:
    'A home for your favorite anime. Create your own anime rankings.',
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden">
        <ThemeProvider>
          <OfflineSupport />

          <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-480 shrink-0 items-center justify-between px-4 py-2 sm:px-8 lg:px-12">
              <Suspense
                fallback={
                  <Link href="/" className="text-xs text-muted-foreground">
                    tierlist / home
                  </Link>
                }
              >
                <HomeLink />
              </Suspense>

              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <OfflineStatus />
                </Suspense>

                <ThemeToggle />
              </div>
            </header>

            <ViewTransition default="page-change" update="none">
              {children}
            </ViewTransition>
          </div>

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
