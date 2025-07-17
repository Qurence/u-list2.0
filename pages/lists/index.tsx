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

  if (!session) {
    return <div className="p-8">Требуется вход...</div>;
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
      <form onSubmit={handleCreateList} className="flex gap-2 mb-4">
        <input
          className="border rounded-[18px] px-2 py-1 flex-1"
          value={newListName}
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
      {fetching ? (
        <div className="bg-white p-4 rounded shadow mb-4">Загрузка...</div>
      ) : lists.length === 0 ? (
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