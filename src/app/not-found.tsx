import '@/app/_styles/globals.css';
import { AppFrame } from '@/app/_components/shell/app-frame';
import { Toaster } from '@/app/_components/ui/toast';
import { geistMono } from '@/app/_styles/fonts';
import NotFoundContent from '@/app/(routes)/not-found';

const NotFound = () => (
  <AppFrame
    className={`${geistMono.variable} dark min-h-svh bg-background font-mono text-foreground`}
  >
    <NotFoundContent />

    <Toaster />
  </AppFrame>
);

export default NotFound;
