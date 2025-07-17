import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

interface List {
  id: string;
  name: string;
}
interface ListProductStats {
  total: number;
  bought: number;
}

export default function ListsPage() {
  const { data: session } = useSession();
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();
  const [productStats, setProductStats] = useState<Record<string, ListProductStats>>({});
  // --- добавлено для анимации стека ---
  const skeletonCount = 5;
  const [stackOrder, setStackOrder] = useState<number[]>(Array.from({ length: skeletonCount }, (_, i) => i));
  useEffect(() => {
    if (!fetching) return;
    const interval = setInterval(() => {
      setStackOrder(prev => {
        const next = [...prev];
        const last = next.pop();
        if (last !== undefined) next.unshift(last);
        return next;
      });
    }, 900); // скорость медленнее
    return () => clearInterval(interval);
  }, [fetching]);
  // --- конец добавленного ---

  // Загрузка списков пользователя
  const fetchLists = async () => {
    setFetching(true);
    const res = await fetch('/api/lists');
    if (res.ok) {
      const data = await res.json();
      setLists(data);
      // После загрузки списков — загрузить статистику продуктов
      fetchAllProductStats(data);
    }
    setFetching(false);
  };

  // Загрузка статистики продуктов для всех списков
  const fetchAllProductStats = async (lists: List[]) => {
    const stats: Record<string, ListProductStats> = {};
    await Promise.all(lists.map(async (list) => {
      const res = await fetch(`/api/lists/${list.id}/products`);
      if (res.ok) {
        const products = await res.json();
        const total = products.length;
        const bought = products.filter((p: any) => p.checked).length;
        stats[list.id] = { total, bought };
      } else {
        stats[list.id] = { total: 0, bought: 0 };
      }
    }));
    setProductStats(stats);
  };

  useEffect(() => {
    if (session) fetchLists();
  }, [session]);

  // Создание нового списка
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName }),
    });
    if (res.ok) {
      setNewListName('');
      fetchLists();
      toast.success('Список создан!');
    }
    setLoading(false);
  };

  // Удаление списка
  const handleDeleteList = async (listId: string) => {
    if (!confirm('Удалить этот список?')) return;
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setLists(prev => prev.filter(l => l.id !== listId));
      toast.success('Список удалён!');
    } else {
      toast.error('Ошибка при удалении списка');
    }
  };

  if (session === undefined) {
    return null;
  }
  if (!session) {
    return <div className="p-8">Требуется вход...</div>;
  }

  // Скелетон-стек для мгновенного отображения загрузки
  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center mb-4">
          <button
            className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm mr-4"
            onClick={() => router.push('/')}
          >
            Назад
          </button>
          <h2 className="text-2xl font-bold">Мои списки</h2>
        </div>
        <form className="flex md:flex-row flex-col gap-2 mb-4">
          <input
            className="border rounded-[18px] px-2 py-1 flex-1"
            placeholder="Название списка"
            disabled
            value=""
          />
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-full shadow font-semibold text-sm md:text-base hover:bg-blue-700 transition opacity-60"
            disabled
          >
            + Создать список
          </button>
        </form>
        <div className="relative mb-6 h-48 flex items-end">
          {stackOrder.map((i, idx) => (
            <div
              key={i}
              className={`absolute left-0 right-0 mx-auto bg-white rounded-lg shadow border border-gray-100 animate-pulse flex items-center gap-3 px-4 py-3 transition-all duration-500`}
              style={{
                bottom: `${idx * 8}px`,
                zIndex: 10 - idx,
                width: `calc(100% - ${idx * 6}px)`,
                opacity: 1 - idx * 0.08
              }}
            >
              <div className="h-6 w-6 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-200 rounded-full" />
              <div className="h-5 w-5 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center mb-4">
        <button
          className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm mr-4"
          onClick={() => router.push('/')}
        >
          Назад
        </button>
        <h2 className="text-2xl font-bold">Мои списки</h2>
      </div>
      <form onSubmit={handleCreateList} className="flex md:flex-row flex-col gap-2 mb-4">
        <input
          className="border rounded-[18px] px-2 py-1 flex-1"
          value={newListName || ""}
          onChange={e => setNewListName(e.target.value)}
          placeholder="Название списка"
        />
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-full shadow font-semibold text-sm md:text-base hover:bg-blue-700 transition"
          disabled={loading}
        >
          + Создать список
        </button>
      </form>
      {lists.length === 0 ? (
        <div className="bg-white p-4 rounded shadow mb-4">Нет списков. Создайте новый!</div>
      ) : (
        <ul className="mb-6 flex flex-col gap-3">
          {lists.map(list => (
            <li key={list.id} className="flex items-center gap-2 bg-white rounded-lg shadow border border-gray-100 hover:shadow-lg transition group">
              <Link href={`/lists/${list.id}`} className="flex items-center gap-3 flex-1 px-4 py-3 no-underline hover:bg-blue-50 rounded-l-lg transition">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-500 group-hover:text-blue-700 transition" />
                <span className="font-medium text-gray-800 group-hover:text-blue-700 transition">{list.name}</span>
                <span className="ml-2 text-xs text-gray-500">({productStats[list.id]?.bought ?? 0}/{productStats[list.id]?.total ?? 0})</span>
              </Link>
              <button
                onClick={() => handleDeleteList(list.id)}
                className="text-red-500 px-2 py-1 rounded hover:bg-red-100 mr-2"
                title="Удалить список"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 