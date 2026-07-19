import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function useNotifications() {
  const { token, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [isAuthenticated]);

  // Setup SSE
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetchNotifications();

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
    const sse = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Ignore connection event
        if (data.type === 'CONNECTED') return;

        // New Notification
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        toast(data.title + '\\n' + data.message, {
          icon: '🔔',
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }
        });
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    sse.onerror = () => {
      console.error('SSE Connection Error');
      // EventSource auto-reconnects, but we can log it here
    };

    return () => {
      sse.close();
    };
  }, [isAuthenticated, token, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
