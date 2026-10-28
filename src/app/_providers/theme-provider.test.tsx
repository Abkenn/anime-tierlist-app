import { fireEvent, render, screen } from '@testing-library/react';
import { useTheme } from 'next-themes';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ThemeProvider } from './theme-provider';

const Toggle = () => {
  const { setTheme } = useTheme();

  return (
    <button type="button" onClick={() => setTheme('light')}>
      Light
    </button>
  );
};

it('preserves the SSR bootstrap but remounts without inert-script warnings', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const html = renderToString(<ThemeProvider>Theme</ThemeProvider>);
    expect(html).toContain('<script');
    expect(html).not.toContain('application/json');
    const first = render(
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>,
    );
    expect(first.container.querySelector('script')).toHaveAttribute(
      'type',
      'application/json',
    );
    first.unmount();
    render(
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveClass('light');
    expect(error.mock.calls.flat().join(' ')).not.toContain(
      'Encountered a script tag',
    );
  } finally {
    error.mockRestore();
    vi.unstubAllGlobals();
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('light', 'dark');
  }
});
