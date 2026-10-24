import Link from 'next/link';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';

const NotFound = () => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-24 sm:px-12">
    <TerminalSequence lines={['Page not found', 'Return home']}>
      <h1 className="text-2xl">
        <TerminalText text="Page not found" />
      </h1>

      <Link
        href="/"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        <TerminalText text="Return home" line={1} />
      </Link>
    </TerminalSequence>
  </main>
);

export default NotFound;
