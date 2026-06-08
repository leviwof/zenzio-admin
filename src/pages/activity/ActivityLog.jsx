import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Bell, Check, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead } from '../../services/api';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
import { filterRecentNotifications } from '../../utils/notifications';

const ActivityLog = () => {
    const navigate = useNavigate();
    const { socketNotifs, socketConnected } = useOrderNotifications();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const observer = useRef();

    const LIMIT = 15;

    const fetchNotifications = async (pageNum) => {
        try {
            setLoading(true);
            const response = await getNotifications(pageNum, LIMIT);
            const newNotifications = filterRecentNotifications(response.data?.data || []);
            const apiIds = new Set(newNotifications.map(n => n.id));
            const socketOnly = filterRecentNotifications(socketNotifs.filter(n => !apiIds.has(n.id)));
            const merged = pageNum === 1
                ? [...socketOnly, ...newNotifications]
                : [...newNotifications];
            setNotifications(merged);
            setHasMore(newNotifications.length === LIMIT);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(1);
    }, []);

    useEffect(() => {
        if (socketNotifs.length > 0) {
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const newFromSocket = filterRecentNotifications(socketNotifs.filter(n => !existingIds.has(n.id)));
                if (newFromSocket.length === 0) return prev;
                return [...newFromSocket, ...prev].slice(0, 100);
            });
        }
    }, [socketNotifs]);

    const lastNotificationRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchNotifications(nextPage);
                    return nextPage;
                });
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const handleMarkAsRead = async (id) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Bell className="w-8 h-8 text-red-600" />
                    Activity Log
                </h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ml-auto ${socketConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                    {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    <span>{socketConnected ? 'Live' : 'Fallback'}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {notifications.length === 0 && !loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No activity yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notif, index) => {
                            const isLast = index === notifications.length - 1;
                            return (
                                <div
                                    key={notif.id}
                                    ref={isLast ? lastNotificationRef : null}
                                    className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/40' : ''}`}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                    {notif.title}
                                                </h3>
                                                {!notif.isRead && (
                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{notif.body}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(notif.createdAt).toLocaleString()}
                                            </p>
                                        </div>

                                        {!notif.isRead && (
                                            <button
                                                onClick={() => handleMarkAsRead(notif.id)}
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                                                title="Mark as read"
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {loading && (
                    <div className="p-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
