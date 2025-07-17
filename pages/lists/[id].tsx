import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../../lib/socketClient';
import toast from 'react-hot-toast';
import { ShoppingCartIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  createdAt?: string;
}

interface ListUser {
  id: string;
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  userId: string;
}

interface ListInfo {
  id: string;
  name: string;
}

export default function ListDetailPage() {
  const router = useRouter();
  const { id: listId } = router.query;
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<ListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductQty, setEditProductQty] = useState(1);
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);

  // Только для начальной загрузки
  const fetchData = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    const [productsRes, usersRes, listRes] = await Promise.all([
      fetch(`/api/lists/${listId}/products`).then(r => r.json()),
      fetch(`/api/lists/${listId}/users`).then(r => r.json()),
      fetch(`/api/lists/${listId}`).then(r => r.json()),
    ]);
    setProducts(productsRes);
    setUsers(usersRes);
    setListInfo({ id: listRes.id, name: listRes.name });
    setLoading(false);
  }, [listId]);

  // Подписка на события WebSocket
  useEffect(() => {
    if (!listId) return;
    const socket = getSocket();
    socket.emit('join-list', listId);
    const handler = (event: any) => {
      if (event.type === 'product-add') {
        setProducts(prev => [...prev, event.product]);
      } else if (event.type === 'product-delete') {
        setProducts(prev => prev.filter(p => p.id !== event.productId));
      } else if (event.type === 'product-edit') {
        setProducts(prev => prev.map(p => p.id === event.product.id ? event.product : p));
      } else if (event.type === 'user-add') {
        setUsers(prev => [...prev, event.user]);
      } else if (event.type === 'user-delete') {
        setUsers(prev => prev.filter(u => u.userId !== event.userId));
      }
    };
    socket.on('list-event', handler);
    return () => {
      socket.off('list-event', handler);
    };
  }, [listId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!session) {
    return <div className="p-8">Требуется вход...</div>;
  }

  if (loading) {
    return <div className="p-8">Загрузка...</div>;
  }

  // Добавление продукта
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.trim()) return;
    const res = await fetch(`/api/lists/${listId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProduct }),
    });
    if (res.ok) {
      const created = await res.json();
      setProducts(prev => [...prev, created]);
      setNewProduct('');
      getSocket().emit('list-event', listId, { type: 'product-add', product: created });
      toast.success('Продукт добавлен!');
    } else {
      toast.error('Ошибка при добавлении продукта');
    }
  };

  // Удаление продукта
  const handleDeleteProduct = async (productId: string) => {
    const res = await fetch(`/api/lists/${listId}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      getSocket().emit('list-event', listId, { type: 'product-delete', productId });
      toast.success('Продукт удалён!');
    } else {
      toast.error('Ошибка при удалении продукта');
    }
  };

  // Начать редактирование продукта
  const handleStartEdit = (product: Product) => {
    setEditProductId(product.id);
    setEditProductName(product.name);
    setEditProductQty(product.quantity);
  };

  // Сохранить изменения продукта
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductId) return;
    const res = await fetch(`/api/lists/${listId}/products`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: editProductId, name: editProductName, quantity: editProductQty }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      getSocket().emit('list-event', listId, { type: 'product-edit', product: updated });
      setEditProductId(null);
      setEditProductName('');
      setEditProductQty(1);
      toast.success('Продукт обновлён!');
    } else {
      toast.error('Ошибка при редактировании продукта');
    }
  };

  // Отметить продукт как купленный
  const handleToggleChecked = async (product: Product) => {
    const res = await fetch(`/api/lists/${listId}/products`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, checked: !product.checked }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      getSocket().emit('list-event', listId, { type: 'product-edit', product: updated });
      toast.success(updated.checked ? 'Отмечено как куплено!' : 'Снята отметка куплено');
    } else {
      toast.error('Ошибка при обновлении продукта');
    }
  };

  // Добавление участника
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    const res = await fetch(`/api/lists/${listId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newUserEmail }),
    });
    if (res.ok) {
      const userRes = await fetch(`/api/lists/${listId}/users`).then(r => r.json());
      const newUser = userRes[userRes.length - 1];
      setUsers(userRes);
      setNewUserEmail('');
      getSocket().emit('list-event', listId, { type: 'user-add', user: newUser });
      toast.success('Участник добавлен!');
    } else {
      toast.error('Ошибка при добавлении участника');
    }
  };

  // Удаление участника (только владелец или сам)
  const handleDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/lists/${listId}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.userId !== userId));
      getSocket().emit('list-event', listId, { type: 'user-delete', userId });
      toast.success('Участник удалён!');
    } else {
      toast.error('Ошибка при удалении участника');
    }
  };

  // Покинуть список
  const handleLeave = async () => {
    const res = await fetch(`/api/lists/${listId}/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      router.push('/lists');
      getSocket().emit('list-event', listId, { type: 'user-delete', userId: session.user.id });
      toast.success('Вы покинули список');
    } else {
      toast.error('Ошибка при выходе из списка');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      {/* Прогресс-бар */}
      <ProgressBar products={products} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div className="flex items-center gap-3">
          <ShoppingCartIcon className="h-8 w-8 text-blue-500 drop-shadow" />
          <h2 className="text-2xl font-bold text-gray-900 drop-shadow-sm">{listInfo ? listInfo.name : 'Список'}</h2>
        </div>
        <button
          className="px-4 py-2 bg-gray-100 rounded-full shadow hover:bg-gray-200 text-sm flex items-center gap-2 w-auto min-w-[0]"
          onClick={() => setShowUsersModal(true)}
        >
          <UserGroupIcon className="h-5 w-5 text-blue-500" />
          Участники
        </button>
      </div>
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
          Продукты
        </h3>
        <form onSubmit={handleAddProduct} className="flex gap-2 mb-6">
          <input
            className="border rounded-[18px] px-3 py-2 flex-1 shadow focus:ring-2 focus:ring-blue-200 transition"
            value={newProduct}
            onChange={e => setNewProduct(e.target.value)}
            placeholder="Название продукта"
          />
          <button className="bg-blue-600 text-white rounded-full shadow px-6 py-2 font-semibold hover:bg-blue-700 transition">
            + Добавить
          </button>
        </form>
        <ul className="flex flex-col gap-3">
          {products
            .slice()
            .sort((a, b) => {
              if (a.checked !== b.checked) return a.checked ? 1 : -1;
              if (a.createdAt && b.createdAt) {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              }
              return 0;
            })
            .map(p => (
              <li key={p.id} className={`flex items-center gap-3 bg-white rounded-xl shadow border border-gray-100 px-4 py-3 group transition ${p.checked ? 'opacity-60' : ''}`}>
                {editProductId !== p.id && (
                  <input
                    type="checkbox"
                    checked={p.checked}
                    onChange={() => handleToggleChecked(p)}
                    className="accent-green-600 h-5 w-5"
                  />
                )}
                {editProductId === p.id ? (
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 items-stretch flex-1">
                    <div className="flex gap-2">
                      <input
                        className="border rounded px-2 py-1 flex-1"
                        value={editProductName}
                        onChange={e => setEditProductName(e.target.value)}
                      />
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 w-16"
                        value={editProductQty}
                        onChange={e => setEditProductQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button className="bg-green-600 text-white px-2 py-1 rounded-full shadow hover:bg-green-700 transition flex items-center gap-1" type="submit">
                        <CheckCircleIcon className="h-5 w-5" /> Сохранить
                      </button>
                      <button className="bg-gray-300 px-2 py-1 rounded-full shadow hover:bg-gray-400 transition flex items-center gap-1" type="button" onClick={() => setEditProductId(null)}>
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className={`flex-1 ${p.checked ? 'line-through text-gray-400' : ''}`}>
                      {p.name}{p.quantity > 1 ? ` (x${p.quantity})` : ''}
                    </span>
                    <button onClick={() => handleStartEdit(p)} className="text-blue-500 hover:bg-blue-50 rounded-full p-1 transition" title="Редактировать">
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 rounded-full p-1 transition" title="Удалить">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </>
                )}
              </li>
            ))}
        </ul>
      </div>
      {/* Модалка участников */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-[95vw] max-w-xs sm:max-w-md relative border border-gray-100">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowUsersModal(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-3 text-center">Участники</h3>
            <form onSubmit={handleAddUser} className="flex gap-2 mb-3">
              <input
                className="border rounded-full px-3 py-1 flex-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 transition"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="Email участника"
              />
              <button className="bg-blue-600 text-white px-4 py-1 rounded-full shadow hover:bg-blue-700 transition text-sm">Добавить</button>
            </form>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {users.map(u => (
                <li key={u.id} className="flex items-center gap-2 justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="truncate max-w-[120px]">{u.user?.name || u.user?.email}</span>
                  {(u.userId === session.user.id) ? (
                    <button onClick={handleLeave} className="text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-full px-3 py-1 text-xs font-medium transition">Покинуть</button>
                  ) : (
                    <button onClick={() => handleDeleteUser(u.userId)} className="text-red-600 bg-red-100 hover:bg-red-200 rounded-full px-3 py-1 text-xs font-medium transition">Удалить</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button onClick={() => router.push('/lists')} className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-full shadow font-semibold hover:bg-blue-700 transition text-base">
        Назад к спискам
      </button>
    </div>
  );
}

// Прогресс-бар компонент
function ProgressBar({ products }: { products: Product[] }) {
  const total = products.length;
  const bought = products.filter(p => p.checked).length;
  const percent = total === 0 ? 0 : Math.round((bought / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Прогресс покупок</span>
        <span className="text-xs text-gray-500">{bought}/{total}</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
} 