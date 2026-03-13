import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, DollarSign, Calendar, RefreshCw, UserPlus, 
    Receipt, Bell, TrendingDown, LayoutDashboard,
    TrendingUp, ArrowUpRight, CheckCircle2, AlertTriangle,
    Wrench, Building2, Wallet
} from 'lucide-react';
import { getAll, COLLECTIONS } from '../services/dbServices';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export function Dashboard() {
    const { hasPermission } = useAuth();
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        residentsCount: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        pendingReservations: 0,
        openTickets: 0,
        totalBuildings: 0,
        totalApartments: 0,
        occupiedApartments: 0,
        availableApartments: 0,
        newResidentsThisMonth: 0,
        pendingValidationCount: 0
    });

    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [urgentTickets, setUrgentTickets] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, paymentsData, reservationsData, ticketsData, buildingsData, apartmentsData, expensesData] = await Promise.all([
                getAll(COLLECTIONS.USERS),
                getAll(COLLECTIONS.PAYMENTS),
                getAll(COLLECTIONS.RESERVATIONS),
                getAll(COLLECTIONS.TICKETS),
                getAll(COLLECTIONS.BUILDINGS),
                getAll(COLLECTIONS.APARTMENTS),
                getAll('expenses' as any)
            ]);

            const residentsCount = usersData.length;
            const income = paymentsData
                .filter((p: any) => p.status === 'Pagado')
                .reduce((sum: number, p: any) => {
                    const amount = typeof p.amount === 'string' ? parseFloat(p.amount.replace(/[^0-9.-]+/g, "")) : (p.amount || 0);
                    return sum + amount;
                }, 0);

            const pendingRes = reservationsData.filter((r: any) => r.status === 'Pendiente').length;
            const openT = ticketsData.filter((t: any) => t.status === 'Abierto' || t.status === 'En Progreso').length;
            const totalBuildings = buildingsData.length;
            const totalApartments = apartmentsData.length;
            const occupiedApartments = apartmentsData.filter((a: any) => a.status === 'occupied').length;
            const availableApartments = apartmentsData.filter((a: any) => a.status === 'available').length;

            const expenses = expensesData
                ? (expensesData as any[])
                    .filter((e: any) => e.status === 'Pagado')
                    .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
                : 0;

            const newResidentsThisMonth = Math.ceil(residentsCount * 0.1);
            const pendingValCount = paymentsData.filter((p: any) => p.status === 'En Verificación').length;

            setMetrics({
                residentsCount,
                monthlyIncome: income,
                monthlyExpenses: expenses,
                pendingReservations: pendingRes,
                openTickets: openT,
                totalBuildings,
                totalApartments,
                occupiedApartments,
                availableApartments,
                newResidentsThisMonth,
                pendingValidationCount: pendingValCount
            });

            const recentP = paymentsData
                .filter((p: any) => p.status === 'Pagado')
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);
            setRecentPayments(recentP);

            const urgentT = ticketsData
                .filter((t: any) => t.priority === 'Alta' && t.status !== 'Completado')
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);
            setUrgentTickets(urgentT);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            if (!loading) showToast('Métricas actualizadas correctamente.');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const stats = [
        { title: 'Residentes Activos', value: metrics.residentsCount.toString(), icon: Users, change: `+${metrics.newResidentsThisMonth} este mes`, trend: 'up' },
        { title: 'Ingresos Pagados', value: `RD$${metrics.monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Wallet, change: 'En tiempo real', trend: 'up' },
        { title: 'Pagos por Validar', value: metrics.pendingValidationCount.toString(), icon: Calendar, change: 'Verificar en Pagos', trend: 'up' },
        { title: 'Reportes Abiertos', value: metrics.openTickets.toString(), icon: Wrench, change: 'Atención urgente', trend: 'down' },
    ];

    const occupancyRate = metrics.totalApartments > 0
        ? Math.round((metrics.occupiedApartments / metrics.totalApartments) * 100)
        : 0;

    const quickActions = [
        { name: 'Nuevo Residente', icon: UserPlus, path: '/residents', color: 'bg-primary', permission: 'residents_manage' },
        { name: 'Registrar Pago', icon: DollarSign, path: '/payments', color: 'bg-emerald-500', permission: 'payments_view' },
        { name: 'Emitir Cuotas', icon: Receipt, path: '/billing-generation', color: 'bg-indigo-500', permission: 'billing_generate' },
        { name: 'Nuevo Comunicado', icon: Bell, path: '/announcements', color: 'bg-amber-500', permission: 'announcements_manage' },
        { name: 'Registrar Gasto', icon: TrendingDown, path: '/expenses', color: 'bg-rose-500', permission: 'expenses_manage' },
    ].filter(action => !action.permission || hasPermission(action.permission));

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col h-full space-y-10 relative pb-20"
        >
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <LayoutDashboard size={14} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Sistema de Gestión Central</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Resumen <span className="text-primary">Gubernamental</span>
                    </h1>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchData}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm hover:shadow-md"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </motion.button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
                {stats.map((stat, index) => (
                    <motion.div 
                        key={index} 
                        variants={itemVariants}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-all group-hover:scale-110 pointer-events-none">
                            <stat.icon size={120} />
                        </div>
                        
                        <div className="flex flex-col relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                <stat.icon size={24} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.title}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {loading ? '...' : stat.value}
                            </h3>
                            <div className="mt-5">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {stat.trend === 'up' ? <TrendingUp size={10} className="mr-1.5" /> : <TrendingDown size={10} className="mr-1.5" />}
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions & Occupancy Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
                <motion.div variants={itemVariants} className="xl:col-span-2 space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-[2px] bg-primary"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Operaciones de Control</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                        {quickActions.map((action) => (
                            <Link key={action.path} to={action.path} className="block group">
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-4 text-center border-b-4 border-b-transparent hover:border-b-primary"
                                >
                                    <div className={`w-14 h-14 rounded-2xl ${action.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                        <action.icon size={28} />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-tight">{action.name}</span>
                                </motion.div>
                            </Link>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Building2 size={100} /></div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                            <span className="p-2 bg-primary/10 rounded-xl text-primary"><Building2 size={18} /></span>
                            Estado de la Propiedad Horizontal
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { label: 'Edificios/Torres', value: metrics.totalBuildings, icon: Building2, color: 'text-primary' },
                                { label: 'Total Unidades', value: metrics.totalApartments, icon: LayoutDashboard, color: 'text-slate-500' },
                                { label: 'Unidades Ocupadas', value: metrics.occupiedApartments, icon: CheckCircle2, color: 'text-emerald-500' },
                                { label: 'Unidades Libres', value: metrics.availableApartments, icon: AlertTriangle, color: 'text-amber-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{item.label}</p>
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={item.color} />
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden border border-slate-800 shadow-2xl">
                    <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none rotate-12"><Building2 size={200} /></div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 relative z-10">Nivel de Consolidación</h3>
                    
                    <div className="relative w-48 h-48 mb-8 relative z-10">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <path className="text-white/5" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <motion.path
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${occupancyRate}, 100` }}
                                transition={{ duration: 2, ease: "circOut" }}
                                className="text-primary" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-white tracking-tighter">{occupancyRate}%</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-6 relative z-10">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest"><div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(19,127,236,0.6)]"></div> Ocupación</div>
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500 tracking-widest"><div className="w-2 h-2 rounded-full bg-white/10"></div> Disponibilidad</div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Flujo de Ingresos</h3>
                        <Link to="/payments" className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"><ArrowUpRight size={20} /></Link>
                    </div>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar pr-4 flex-1">
                        {recentPayments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase shadow-sm">{p.resident?.charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.resident}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">RD${Number(p.amount).toLocaleString()}</p>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">Sincronizado</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Incidentes de Seguridad</h3>
                        <Link to="/maintenance" className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><AlertTriangle size={20} /></Link>
                    </div>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar pr-4 flex-1">
                        {urgentTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <CheckCircle2 size={60} className="text-emerald-500 mb-4" />
                                <p className="font-black uppercase tracking-[0.3em] text-xs">Sin incidentes críticos</p>
                            </div>
                        ) : urgentTickets.map((t, i) => (
                            <div key={i} className="flex justify-between items-center p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 hover:border-rose-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg"><AlertTriangle size={20} /></div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate w-40">{t.issue}</p>
                                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest leading-none mt-1">Nivel: {t.priority}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20 uppercase tracking-widest">Atención Urgente</span>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Unidad {t.unit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
