'use client';
import { Button } from '@/app/_components/ui/button';

type RouteErrorProps = { error: unknown; retry: () => void };

const RouteError = ({ retry }: RouteErrorProps) => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-24 sm:px-12">
    <h1 className="text-2xl">Unable to load this page</h1>
    <p className="mt-4 text-sm text-muted-foreground">
      Try again when the connection is available.
    </p>
    <Button variant="link" className="mt-6 px-0" onClick={() => retry()}>
      Try again
    </Button>
  </main>
);

export default RouteError;
