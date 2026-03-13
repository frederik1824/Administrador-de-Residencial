import React, { createContext, useContext, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Command, X, Bell, User, Building2, CreditCard, Home, Wrench, ArrowRight, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { update, COLLECTIONS } from '../services/dbServices';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface NotificationItem {
    id: string;
    title: string;
    desc: string;
    time: string;
    type: 'payment' | 'ticket' | 'message' | 'system';
    priority?: 'low' | 'medium' | 'high';
    path: string;
    metadata?: any;
}

interface UIContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    toggleCommandCenter: () => void;
    toggleNotifications: () => void;
    unreadCount: number;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const toggleCommandCenter = () => setIsCommandOpen((prev) => !prev);
    const toggleNotifications = () => {
        setIsNotificationsOpen((prev) => !prev);
        if (!isNotificationsOpen) fetchNotifications();
    };

    // Real-time notifications listener
    useEffect(() => {
        setLoadingNotifs(true);

        const qMessages = query(
            collection(db, COLLECTIONS.MESSAGES),
            where('senderRole', '==', 'resident'),
            where('read', '==', false)
        );

        const qTickets = query(
            collection(db, COLLECTIONS.TICKETS),
            where('seenByAdmin', '==', false)
        );

        const qPayments = query(
            collection(db, COLLECTIONS.PAYMENTS),
            where('seenByAdmin', '==', false)
        );

        const unsubscribes: (() => void)[] = [];
        let allMessages: any[] = [];
        let allTickets: any[] = [];
        let allPayments: any[] = [];

        const updateAll = () => {
            const items: NotificationItem[] = [];

            // Process Messages
            const msgGroups = new Map<string, any>();
            allMessages.forEach(m => {
                const groupKey = m.residentEmail || m.residentId || 'unknown';
                if (!msgGroups.has(groupKey)) msgGroups.set(groupKey, { ...m, count: 0, ids: [] });
                const group = msgGroups.get(groupKey);
                group.count++;
                group.ids.push(m.id);
            });

            msgGroups.forEach((m) => {
                items.push({
                    id: `msg-${m.id}`,
                    title: `Mensaje de ${m.residentName || 'Residente'}`,
                    desc: m.count > 1 ? `${m.count} mensajes nuevos` : m.text,
                    time: m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Reciente',
                    type: 'message',
                    priority: 'high',
                    path: '/messages',
                    metadata: { ids: m.ids }
                });
            });

            // Process Tickets
            allTickets.filter(t => t.status === 'Abierto' || t.status === 'En Progreso').forEach(t => {
                items.push({
                    id: `tick-${t.id}`,
                    title: `Ticket: ${t.issue}`,
                    desc: `${t.resident} - Unidad ${t.unit}`,
                    time: t.date || 'Reciente',
                    type: 'ticket',
                    priority: t.priority === 'Alta' ? 'high' : 'medium',
                    path: '/maintenance'
                });
            });

            // Process Payments
            allPayments.filter(p => p.status === 'En Verificación' || p.status === 'Pendiente').forEach(p => {
                items.push({
                    id: `pay-${p.id}`,
                    title: `Pago por validar: RD$ ${p.amount}`,
                    desc: `${p.resident} - Unidad ${p.unit}`,
                    time: p.date || 'Reciente',
                    type: 'payment',
                    priority: 'medium',
                    path: '/payments'
                });
            });

            setNotifications(items.slice(0, 10));
            setUnreadCount(items.length);
            setLoadingNotifs(false);
        };

        unsubscribes.push(onSnapshot(qMessages, (snapshot) => {
            allMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateAll();
        }));

        unsubscribes.push(onSnapshot(qTickets, (snapshot) => {
            allTickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateAll();
        }));

        unsubscribes.push(onSnapshot(qPayments, (snapshot) => {
            allPayments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateAll();
        }));

        return () => unsubscribes.forEach(unsub => unsub());
    }, []);

    const fetchNotifications = async () => {
        // Handled by snapshots now
    };

    const handleNotificationClick = async (notif: NotificationItem) => {
        setIsNotificationsOpen(false);
        navigate(notif.path);

        try {
            if (notif.type === 'message' && notif.metadata?.ids) {
                // Mark all grouped messages as read
                await Promise.all(notif.metadata.ids.map((msgId: string) => 
                    update(COLLECTIONS.MESSAGES, msgId, { read: true })
                ));
            } else if (notif.type === 'ticket') {
                await update(COLLECTIONS.TICKETS, notif.id.replace('tick-', ''), { seenByAdmin: true });
            } else if (notif.type === 'payment') {
                await update(COLLECTIONS.PAYMENTS, notif.id.replace('pay-', ''), { seenByAdmin: true });
            }
            // Refresh to reflect changes
            fetchNotifications();
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandCenter();
            }
            if (e.key === 'Escape') {
                setIsCommandOpen(false);
                setIsNotificationsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commands = [
        { name: 'Ir al Dashboard', icon: Home, path: '/', shortcut: 'D' },
        { name: 'Gestionar Residentes', icon: User, path: '/residents', shortcut: 'R' },
        { name: 'Ver Edificios', icon: Building2, path: '/buildings', shortcut: 'B' },
        { name: 'Registrar Pagos', icon: CreditCard, path: '/payments', shortcut: 'P' },
        { name: 'Mantenimiento', icon: Wrench, path: '/maintenance', shortcut: 'M' },
        { name: 'Configuración', icon: Command, path: '/settings', shortcut: 'S' },
    ].filter(cmd => cmd.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <UIContext.Provider value={{ showToast, toggleCommandCenter, toggleNotifications, unreadCount }}>
            {children}

            {/* Global Toasts */}
            <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                            className="toast-premium"
                        >
                            <div className={`p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm ${
                                toast.type === 'success' ? 'text-emerald-500' : 
                                toast.type === 'error' ? 'text-rose-500' : 'text-primary'
                            }`}>
                                <Bell size={18} />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{toast.message}</p>
                            <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Command Center Overlay */}
            <AnimatePresence>
                {isCommandOpen && (
                    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh]">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCommandOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative z-10"
                        >
                            <div className="flex items-center gap-4 p-8 border-b border-slate-100 dark:border-slate-800">
                                <Search size={24} className="text-primary" />
                                <input 
                                    autoFocus
                                    placeholder="¿Qué deseas realizar? Escribe un comando..."
                                    className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && commands.length > 0) {
                                            navigate(commands[0].path);
                                            setIsCommandOpen(false);
                                            setSearchQuery('');
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESC cerrar</span>
                                </div>
                            </div>

                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                <div className="px-4 py-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comandos Sugeridos</p>
                                </div>
                                {commands.map((cmd) => (
                                    <button
                                        key={cmd.path}
                                        onClick={() => {
                                            navigate(cmd.path);
                                            setIsCommandOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                <cmd.icon size={20} />
                                            </div>
                                            <span className="font-black text-slate-700 dark:text-slate-200 tracking-tight">{cmd.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-600">
                                                {cmd.shortcut}
                                            </div>
                                            <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                                {commands.length === 0 && (
                                    <div className="p-10 text-center">
                                        <p className="text-slate-400 font-bold italic">No se encontraron comandos para "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-black text-slate-500">⏎</div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ejecutar</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-black text-slate-500">↑↓</div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Navegar</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Command size={14} className="text-primary" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">ResiNova Command v1.0</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Center Overlay */}
            <AnimatePresence>
                {isNotificationsOpen && (
                    <div className="fixed inset-0 z-[150] flex items-start justify-end p-8 pt-20">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsNotificationsOpen(false)}
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative z-10 flex flex-col"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                        <Bell size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Centro de Avisos</h3>
                                </div>
                                <button onClick={() => setIsNotificationsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[60vh] custom-scrollbar">
                                <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</p>
                                
                                {loadingNotifs ? (
                                    <div className="flex flex-col items-center justify-center p-10 gap-3">
                                        <RefreshCw size={24} className="animate-spin text-primary" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <p className="text-slate-400 font-bold italic">No hay avisos pendientes</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <button 
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-all group text-left"
                                        >
                                            <div className={`mt-1 p-2 rounded-xl flex-shrink-0 ${
                                                notif.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                                                notif.type === 'ticket' ? 'bg-orange-500/10 text-orange-500' :
                                                notif.type === 'message' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                                            }`}>
                                                {notif.type === 'payment' ? <CreditCard size={18} /> : 
                                                 notif.type === 'ticket' ? <Wrench size={18} /> : 
                                                 notif.type === 'message' ? <Send size={18} /> : <AlertTriangle size={18} />}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-0.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-sm">{notif.title}</span>
                                                        {notif.priority === 'high' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400">{notif.time}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{notif.desc}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => {
                                        navigate('/notifications');
                                        setIsNotificationsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Ver todas las notificaciones
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
