import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { platform } from '../utils/platform';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'new_song';
    date: number;
    read: boolean;
    actionPath?: string;
    actionLabel?: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY = 'fluxaudio_notifications_v1';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Also track "Toasts" which are ephemeral
    const [toasts, setToasts] = useState<AppNotification[]>([]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
        const newNotif: AppNotification = {
            ...notif,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: Date.now(),
            read: false
        };

        setNotifications(prev => [newNotif, ...prev].slice(0, 100)); // Keep max 100
        
        // Add to toast queue
        setToasts(prev => [...prev, newNotif]);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== newNotif.id));
        }, 4000);

        // Native push notification if possible
        if (platform.isNative()) {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: notif.title,
                            body: notif.message,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 100) },
                        }]
                    });
                }
            } catch (e) {
                console.warn("Native notification failed", e);
            }
        } else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notif.title, {
                body: notif.message,
                icon: '/icon-192.png'
            });
        }

    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            removeNotification
        }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-24 right-4 md:right-8 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={`toast-${toast.id}`} 
                        className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-fade-in transition-all
                            ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                              toast.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                              'bg-white/10 border-white/20 text-white backdrop-blur-md bg-zinc-900'}
                        `}
                    >
                        <div className="flex-1 min-w-0 pointer-events-auto">
                            <h4 className="font-bold text-sm truncate">{toast.title}</h4>
                            <p className="text-xs opacity-90 truncate">{toast.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useAppNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useAppNotifications must be used within NotificationProvider');
    return ctx;
}
