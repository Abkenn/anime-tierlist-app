import type { PropsWithChildren } from 'react';

export const HomeShell = ({ children }: PropsWithChildren) => (
  <main className="mx-auto flex w-full min-h-0 flex-1 flex-col px-4 pb-3 sm:px-8 lg:px-6">
    <h1 id="home-title" className="sr-only">
      Tierlist
    </h1>

    <section
      aria-labelledby="home-title"
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {children}
    </section>
  </main>
);
