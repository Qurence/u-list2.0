import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-6">U-List</h1>
      {!session ? (
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          onClick={() => signIn('google')}
        >
          Войти через Google
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <span>Привет, {session.user?.name || session.user?.email}!</span>
          <Link href="/lists" className="text-blue-600 underline">Мои списки</Link>
          <button
            className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => signOut()}
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
} 