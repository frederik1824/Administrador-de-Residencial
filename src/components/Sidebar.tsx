import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, CalendarDays, Wrench, LogOut,
    MessageSquare, Settings, Building2, DoorOpen, Network, Receipt,
    History, TrendingDown, PieChart, UserCircle, ChevronDown,
    LayoutDashboard, Wallet, Megaphone, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoResinova from '../assets/logo-resinova.png';

export function Sidebar() {
    const location = useLocation();
    const { user, logout, hasPermission } = useAuth();
    
    // State to track which groups are expanded
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'Resumen': true,
        'Propiedades': true,
        'Finanzas': true,
        'Social & Ops': false,
        'Sistema': false,
    });

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const menuGroups = [
        {
            title: 'Resumen',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
            ]
        },
        {
            title: 'Propiedades',
            items: [
                { name: 'Estructura', icon: Network, path: '/hierarchy' },
                { name: 'Edificios', icon: Building2, path: '/buildings' },
                { name: 'Apartamentos', icon: DoorOpen, path: '/apartments' },
                { name: 'Residentes', icon: Users, path: '/residents' },
            ]
        },
        {
            title: 'Finanzas',
            items: [
                { name: 'Pagos', icon: Wallet, path: '/payments' },
                { name: 'Facturación', icon: Receipt, path: '/billing-generation' },
                { name: 'Historial', icon: History, path: '/billing-history' },
                { name: 'Egresos', icon: TrendingDown, path: '/expenses' },
                { name: 'Análisis', icon: PieChart, path: '/reports' },
            ]
        },
        {
            title: 'Social & Ops',
            items: [
                { name: 'Amenidades', icon: CalendarDays, path: '/amenities' },
                { name: 'Avisos', icon: Megaphone, path: '/announcements' },
                { name: 'Chat Interno', icon: MessageSquare, path: '/messages' },
                { name: 'Tickets', icon: Wrench, path: '/maintenance' },
            ]
        },
        {
            title: 'Sistema',
            items: [
                { name: 'Personal', icon: UserCircle, path: '/users', permission: 'users_view' },
                { name: 'Seguridad', icon: ShieldCheck, path: '/roles', permission: 'roles_manage' },
                { name: 'Ajustes', icon: Settings, path: '/settings', permission: 'settings_view' },
            ]
        }
    ];

    const filteredMenuGroups = menuGroups
        .map(group => {
            const filteredItems = group.items.filter(item => {
                const currentRoleId = (user?.roleId || '').toLowerCase();

                if (currentRoleId === 'superadmin' || currentRoleId === 'super_admin' || currentRoleId === 'super administrador') {
                    return true;
                }

                if (item.path === '/') return true;

                if ('permission' in item && item.permission) {
                    return hasPermission(item.permission as string);
                }

                return true;
            });

            return { ...group, items: filteredItems };
        })
        .filter(group => group.items.length > 0);

    return (
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 z-20 shadow-xl shadow-slate-200/20 dark:shadow-none">
            {/* Logo Area */}
            <Link 
                to="/" 
                className="h-24 flex items-center justify-center border-b border-slate-100 dark:border-slate-800/50 p-6 bg-white dark:bg-slate-900 relative group overflow-hidden transition-all"
            >
                <div className="absolute top-0 left-0 w-full h-full opacity-10 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] transition-opacity duration-700"></div>
                <img 
                    src={logoResinova} 
                    alt="ResiNova Logo" 
                    className="h-full w-auto object-contain z-10 drop-shadow-md group-hover:scale-110 group-hover:-rotate-2 transition-all duration-700 ease-out" 
                />
            </Link>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                {filteredMenuGroups.map((group, groupIndex) => {
                    const isExpanded = expandedGroups[group.title];
                    return (
                        <div key={group.title} className={groupIndex > 0 ? "pt-2" : ""}>
                            <button 
                                onClick={() => toggleGroup(group.title)}
                                className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 group transition-all duration-300"
                            >
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">
                                    {group.title}
                                </p>
                                <ChevronDown 
                                    size={14} 
                                    className={`text-slate-300 dark:text-slate-600 group-hover:text-primary transition-transform duration-500 ${isExpanded ? '' : '-rotate-90'}`} 
                                />
                            </button>
                            
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'circOut' }}
                                        className="space-y-1 overflow-hidden"
                                    >
                                        {group.items.map((item) => {
                                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                                            return (
                                                <Link
                                                    key={item.name}
                                                    to={item.path}
                                                    className={`flex items-center px-4 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isActive
                                                        ? 'text-white'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:translate-x-1'
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <motion.div 
                                                            layoutId="activeNav"
                                                            className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 z-0"
                                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                    
                                                    <item.icon
                                                        size={20}
                                                        strokeWidth={isActive ? 2.5 : 2}
                                                        className={`mr-3 relative z-10 transition-colors ${isActive ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-primary'}`}
                                                    />
                                                    <span className={`font-semibold text-[13px] relative z-10 ${isActive ? 'tracking-wide' : ''}`}>
                                                        {item.name}
                                                    </span>

                                                    {isActive && (
                                                        <motion.div 
                                                            layoutId={`dot-${item.name}`}
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50 z-10"
                                                        />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-black shadow-inner">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.name}</p>
                            <span className="inline-block text-[9px] font-bold bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded-full uppercase tracking-tighter mt-1">
                                {user?.roleName || user?.roleId || 'Admin'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 group"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white transition-all mr-3">
                        <LogOut size={18} />
                    </div>
                    <span className="font-bold text-sm">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
