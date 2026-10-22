'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/app/_components/ui/button';

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      className="min-w-16 rounded-none px-2 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      aria-label="Toggle light and dark theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <span className="hidden dark:inline">Light</span>
      <span className="inline dark:hidden">Dark</span>
    </Button>
  );
};
