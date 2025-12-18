/**
 * Item CRUD 组件
 * 实现创建、列表展示、删除功能
 */

import { useState, useEffect } from 'react';
import { itemApi, type Item } from '../services/api';
import './ItemList.css';

export function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 Items
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await itemApi.getAll();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  // 创建 Item
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await itemApi.create(title, content);
      setTitle('');
      setContent('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // 删除 Item
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await itemApi.delete(id);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="item-list">
      <h2>Item Management</h2>

      {/* 错误提示 */}
      {error && <div className="error">{error}</div>}

      {/* 创建表单 */}
      <form onSubmit={handleCreate} className="create-form">
        <h3>Create New Item</h3>
        <div className="form-group">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <textarea
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Item'}
        </button>
      </form>

      {/* Items 列表 */}
      <div className="items">
        <h3>Items ({items.length})</h3>
        {loading && items.length === 0 ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p className="empty">No items yet. Create one above!</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="item-card">
                <div className="item-header">
                  <h4>{item.title}</h4>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={loading}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
                <p>{item.content}</p>
                <small>Created: {new Date(item.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
