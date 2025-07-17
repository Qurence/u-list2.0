import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { CheckCircleIcon, UsersIcon, DevicePhoneMobileIcon, BoltIcon } from '@heroicons/react/24/outline';

const features = [
  {
    icon: <CheckCircleIcon className="h-8 w-8 text-green-500" />,
    title: 'Совместные списки',
    desc: 'Делитесь списками с друзьями и семьёй, редактируйте вместе в реальном времени.'
  },
  {
    icon: <UsersIcon className="h-8 w-8 text-blue-500" />,
    title: 'Управление участниками',
    desc: 'Добавляйте и удаляйте участников, контролируйте доступ к вашим спискам.'
  },
  {
    icon: <DevicePhoneMobileIcon className="h-8 w-8 text-purple-500" />,
    title: 'Адаптивный дизайн',
    desc: 'Удобно пользоваться на телефоне, планшете и компьютере.'
  },
  {
    icon: <BoltIcon className="h-8 w-8 text-yellow-500" />,
    title: 'Мгновенные обновления',
    desc: 'Все изменения видны сразу у всех участников без перезагрузки.'
  },
];

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="w-full max-w-2xl mt-20 mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight drop-shadow-sm">U-List</h1>
        <p className="text-lg text-gray-600 mb-8">Современный сервис для совместных списков покупок</p>
        {!session ? (
          <button
            className="px-8 py-3 bg-blue-600 text-white rounded-full shadow-lg text-lg font-semibold hover:bg-blue-700 transition mb-6"
            onClick={() => signIn('google')}
          >
            Начать
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-6">
            <span className="text-gray-700">Привет, {session.user?.name || session.user?.email}!</span>
            <Link
              href="/lists"
              className="px-8 py-3 bg-blue-600 text-white rounded-full shadow-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              Мои списки
            </Link>
            <button
              className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300"
              onClick={() => signOut()}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4 bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition">
            <div>{f.icon}</div>
            <div>
              <div className="font-bold text-lg mb-1">{f.title}</div>
              <div className="text-gray-500 text-sm">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <footer className="text-gray-400 text-xs mb-4">&copy; {new Date().getFullYear()} U-List. Все права защищены.</footer>
    </div>
  );
} 