import type { PropsWithChildren } from 'react';

export const HomeShell = ({ children }: PropsWithChildren) => (
  <main className="mx-auto flex w-full max-w-480 flex-1 flex-col px-4 pb-6 sm:px-8 lg:px-12">
    <header className="flex items-baseline justify-between gap-6 py-2">
      <h1
        id="home-title"
        className="text-2xl font-normal tracking-tight sm:text-3xl"
      >
        Tierlist
      </h1>

      <p className="hidden text-xs text-muted-foreground sm:block">
        Your anime. Your order.
      </p>
    </header>

    <section aria-labelledby="home-title" className="w-full">
      {children}
    </section>
  </main>
);
