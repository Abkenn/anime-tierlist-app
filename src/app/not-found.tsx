import '@/app/_styles/globals.css';
import { geistMono } from '@/app/_styles/fonts';
import NotFoundContent from '@/app/(routes)/not-found';

const NotFound = () => (
  <div
    className={`${geistMono.variable} dark min-h-svh bg-background font-mono text-foreground`}
  >
    <NotFoundContent />
  </div>
);

export default NotFound;
