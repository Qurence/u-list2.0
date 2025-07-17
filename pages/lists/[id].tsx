import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../../lib/socketClient';
import toast from 'react-hot-toast';

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
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-2xl font-bold">{listInfo ? listInfo.name : 'Список'}</h2>
        <button
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 w-full sm:w-auto"
          onClick={() => setShowUsersModal(true)}
        >
          Участники
        </button>
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Продукты</h3>
        <form onSubmit={handleAddProduct} className="flex gap-2 mb-4">
          <input
            className="border rounded px-2 py-1 flex-1"
            value={newProduct}
            onChange={e => setNewProduct(e.target.value)}
            placeholder="Название продукта"
          />
          <button className="bg-blue-600 text-white px-4 py-1 rounded">Добавить</button>
        </form>
        <ul>
          {products
            .slice() // копия массива
            .sort((a, b) => {
              // Сначала неотмеченные, потом отмеченные
              if (a.checked !== b.checked) return a.checked ? 1 : -1;
              // Внутри группы сортировка по createdAt (по возрастанию)
              if (a.createdAt && b.createdAt) {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              }
              return 0;
            })
            .map(p => (
              <li key={p.id} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={p.checked}
                  onChange={() => handleToggleChecked(p)}
                  className="accent-green-600"
                />
                {editProductId === p.id ? (
                  <form onSubmit={handleSaveEdit} className="flex gap-2 items-center">
                    <input
                      className="border rounded px-2 py-1"
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
                    <button className="bg-green-600 text-white px-2 py-1 rounded" type="submit">Сохранить</button>
                    <button className="bg-gray-300 px-2 py-1 rounded" type="button" onClick={() => setEditProductId(null)}>Отмена</button>
                  </form>
                ) : (
                  <>
                    <span className={p.checked ? 'line-through text-gray-400' : ''}>
                      {p.name}{p.quantity > 1 ? ` (x${p.quantity})` : ''}
                    </span>
                    <button onClick={() => handleStartEdit(p)} className="text-blue-500">Редактировать</button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500">Удалить</button>
                  </>
                )}
              </li>
            ))}
        </ul>
      </div>
      {/* Модалка участников */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setShowUsersModal(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-2">Участники</h3>
            <form onSubmit={handleAddUser} className="flex gap-2 mb-4">
              <input
                className="border rounded px-2 py-1 flex-1"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="Email участника"
              />
              <button className="bg-blue-600 text-white px-4 py-1 rounded">Добавить</button>
            </form>
            <ul>
              {users.map(u => (
                <li key={u.id} className="flex items-center gap-2 mb-2">
                  <span>{u.user?.name || u.user?.email}</span>
                  {(u.userId === session.user.id) ? (
                    <button onClick={handleLeave} className="text-orange-500">Покинуть</button>
                  ) : (
                    <button onClick={() => handleDeleteUser(u.userId)} className="text-red-500">Удалить</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button onClick={() => router.push('/lists')} className="text-blue-600 underline">Назад к спискам</button>
    </div>
  );
} 