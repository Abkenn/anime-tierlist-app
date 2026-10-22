import { OfflineSupport } from '@/app/_providers/offline-support';
import '../_styles/globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Suspense, ViewTransition } from 'react';
import { OfflineStatus } from '@/app/_components/offline/offline-status';
import { HomeLink } from '@/app/_components/shell/home-link';
import { ThemeToggle } from '@/app/_components/shell/theme-toggle';
import { ScrollArea } from '@/app/_components/ui/scroll-area';
import { ThemeProvider } from '@/app/_providers/theme-provider';
import type { RootLayoutProps } from '@/app/_types/layout.types';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anime Tierlist',
  description:
    'A home for your favorite anime. Create your own anime rankings.',
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <OfflineSupport />
          <ScrollArea className="h-dvh w-full" aria-label="Page content">
            <div className="flex min-h-dvh flex-col bg-background text-foreground">
              <header className="mx-auto flex w-full max-w-480 items-center justify-between px-4 py-2 sm:px-8 lg:px-12">
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
          </ScrollArea>
        </ThemeProvider>
      </body>
    </html>
  );
}
