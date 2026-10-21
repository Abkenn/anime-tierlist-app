import Link from 'next/link';

const NotFound = () => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-24 sm:px-12">
    <h1 className="text-2xl">Page not found</h1>
    <Link
      href="/"
      className="mt-6 inline-block text-sm underline underline-offset-4"
    >
      Return home
    </Link>
  </main>
);
export default NotFound;
