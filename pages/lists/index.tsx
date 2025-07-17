import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface List {
  id: string;
  name: string;
}

export default function ListsPage() {
  const { data: session } = useSession();
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Загрузка списков пользователя
  const fetchLists = async () => {
    setFetching(true);
    const res = await fetch('/api/lists');
    if (res.ok) {
      const data = await res.json();
      setLists(data);
    }
    setFetching(false);
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
      <h2 className="text-2xl font-bold mb-4">Мои списки</h2>
      {fetching ? (
        <div className="bg-white p-4 rounded shadow mb-4">Загрузка...</div>
      ) : lists.length === 0 ? (
        <div className="bg-white p-4 rounded shadow mb-4">Нет списков. Создайте новый!</div>
      ) : (
        <ul className="mb-6">
          {lists.map(list => (
            <li key={list.id} className="mb-2 flex items-center gap-2">
              <Link href={`/lists/${list.id}`} className="text-blue-600 underline flex-1">
                {list.name}
              </Link>
              <button
                onClick={() => handleDeleteList(list.id)}
                className="text-red-500 px-2 py-1 rounded hover:bg-red-100"
                title="Удалить список"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleCreateList} className="flex gap-2 mb-4">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          placeholder="Название списка"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={loading}
        >
          Создать список
        </button>
      </form>
    </div>
  );
} 