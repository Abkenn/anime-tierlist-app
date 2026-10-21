import type { PropsWithChildren } from 'react';

export const HomeShell = ({ children }: PropsWithChildren) => (
  <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-16 pt-[clamp(4rem,22svh,14rem)] sm:px-12 sm:pb-24">
    <section aria-labelledby="home-title" className="space-y-7">
      <p className="font-mono text-xs tracking-wide text-muted-foreground">
        ~/anime / personal rankings
      </p>
      <h1
        id="home-title"
        className="text-[clamp(3.25rem,11vw,7rem)] leading-none font-normal tracking-[-0.06em]"
      >
        <span className="inline-block [clip-path:inset(0)] starting:[clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-560 ease-[steps(7,end)] motion-reduce:transition-none">
          Tierlist
        </span>
      </h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        Your anime. Your order.
      </p>
    </section>
    <section
      aria-label="Tier preview"
      className="mt-16 w-full border-t border-[color-mix(in_srgb,var(--foreground)_18%,var(--background))] pt-5 sm:mt-20"
    >
      {children}
    </section>
  </main>
);
