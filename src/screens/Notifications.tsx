import { useState, useEffect } from 'react';
import { 
    Bell, 
    CreditCard, 
    Wrench, 
    Send, 
    AlertTriangle, 
    RefreshCw, 
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAll, update, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityItem {
    id: string;
    originId: string;
    title: string;
    desc: string;
    time: string;
    date: Date;
    type: 'payment' | 'ticket' | 'message' | 'system';
    priority: 'low' | 'medium' | 'high';
    path: string;
    metadata?: any;
    status: string;
}

export function Notifications() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'payment' | 'ticket' | 'message'>('all');
    const navigate = useNavigate();
    const { showToast } = useUI();

    const fetchAllActivity = async () => {
        setLoading(true);
        try {
            const [msgs, tickets, payments] = await Promise.all([
                getAll(COLLECTIONS.MESSAGES),
                getAll(COLLECTIONS.TICKETS),
                getAll(COLLECTIONS.PAYMENTS)
            ]);

            const allItems: ActivityItem[] = [];

            // Messages
            (msgs as any[]).filter(m => m.senderRole === 'resident' && !m.read).forEach(m => {
                allItems.push({
                    id: `msg-${m.id}`,
                    originId: m.id,
                    title: `Mensaje de ${m.residentName}`,
                    desc: m.text,
                    time: m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Reciente',
                    date: m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : new Date(),
                    type: 'message',
                    priority: 'high',
                    path: '/messages',
                    status: 'No leído'
                });
            });

            // Tickets
            (tickets as any[]).filter(t => (t.status === 'Abierto' || t.status === 'En Progreso') && !t.seenByAdmin).forEach(t => {
                allItems.push({
                    id: `tick-${t.id}`,
                    originId: t.id,
                    title: `Ticket: ${t.issue}`,
                    desc: `${t.resident} - Unidad ${t.unit}`,
                    time: t.date || 'Pendiente',
                    date: t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(),
                    type: 'ticket',
                    priority: t.priority === 'Alta' ? 'high' : 'medium',
                    path: '/maintenance',
                    status: t.status
                });
            });

            // Payments
            (payments as any[]).filter(p => (p.status === 'En Verificación' || p.status === 'Pendiente') && !p.seenByAdmin).forEach(p => {
                allItems.push({
                    id: `pay-${p.id}`,
                    originId: p.id,
                    title: `Validación de Pago: RD$ ${p.amount}`,
                    desc: `${p.resident} - Unidad ${p.unit}`,
                    time: p.date || 'Pendiente',
                    date: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(),
                    type: 'payment',
                    priority: 'medium',
                    path: '/payments',
                    status: p.status
                });
            });

            // Sort by date desc
            setActivities(allItems.sort((a, b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
            console.error('Error fetching activity:', error);
            showToast('Error al cargar actividades', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllActivity();
    }, []);

    const markAsRead = async (item: ActivityItem) => {
        try {
            if (item.type === 'message') {
                await update(COLLECTIONS.MESSAGES, item.originId, { read: true });
            } else if (item.type === 'ticket') {
                await update(COLLECTIONS.TICKETS, item.originId, { seenByAdmin: true });
            } else if (item.type === 'payment') {
                await update(COLLECTIONS.PAYMENTS, item.originId, { seenByAdmin: true });
            }
            // Remove from list locally for speed
            setActivities(prev => prev.filter(a => a.id !== item.id));
            showToast('Notificación archivada', 'success');
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const filtered = activities.filter(a => filter === 'all' || a.type === filter);

    return (
        <div className="p-10 max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Bell size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Centro de Actividad</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Gestiona todas las tareas y alertas pendientes del residencial.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchAllActivity}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                {[
                    { id: 'all', label: 'Todo', icon: <Bell size={14} /> },
                    { id: 'payment', label: 'Pagos', icon: <CreditCard size={14} /> },
                    { id: 'ticket', label: 'Tickets', icon: <Wrench size={14} /> },
                    { id: 'message', label: 'Mensajes', icon: <Send size={14} /> }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setFilter(t.id as any)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            filter === t.id 
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                            <CheckCircle2 size={48} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400">¡Todo al día!</h3>
                        <p className="text-sm text-slate-400">No hay notificaciones pendientes aquí.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode='popLayout'>
                            {filtered.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all"
                                >
                                    <div className={`p-4 rounded-3xl flex-shrink-0 ${
                                        item.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                                        item.type === 'ticket' ? 'bg-orange-500/10 text-orange-500' :
                                        item.type === 'message' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                                    }`}>
                                        {item.type === 'payment' ? <CreditCard size={28} /> : 
                                         item.type === 'ticket' ? <Wrench size={28} /> : 
                                         item.type === 'message' ? <Send size={28} /> : <AlertTriangle size={28} />}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                                                {item.type === 'payment' ? 'Cobros' : item.type === 'ticket' ? 'Infraestructura' : item.type === 'message' ? 'Atención' : 'General'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{item.time}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{item.title}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button 
                                            onClick={() => markAsRead(item)}
                                            className="flex-1 md:flex-none px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700"
                                        >
                                            Archivar
                                        </button>
                                        <button 
                                            onClick={() => navigate(item.path)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-primary/20"
                                        >
                                            Revisar
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
