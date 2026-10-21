import '@/app/_styles/globals.css';
import { Geist_Mono } from 'next/font/google';
import NotFoundContent from '@/app/(routes)/not-found';

const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const NotFound = () => (
  <div
    className={`${mono.variable} dark min-h-svh bg-background font-mono text-foreground`}
  >
    <NotFoundContent />
  </div>
);
export default NotFound;
