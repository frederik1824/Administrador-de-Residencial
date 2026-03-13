import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Search, Command as CommandIcon, Bell } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { motion } from 'framer-motion';

export function AdminLayout() {
    const { toggleCommandCenter, toggleNotifications, unreadCount } = useUI();

    return (
        <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0b0f1a] overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Header */}
                <header className="h-20 glass dark:glass-dark border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-10 z-10 sticky top-0">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex flex-col group transition-all duration-300">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 group-hover:tracking-[0.3em] transition-all">ResiNova Admin</span>
                            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                                Panel de Control
                            </h1>
                        </Link>

                        {/* Search / Command Trigger */}
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={toggleCommandCenter}
                            className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all group"
                        >
                            <Search size={16} />
                            <span className="text-sm font-bold">Buscar residente o comando...</span>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm ml-4">
                                <CommandIcon size={10} />
                                <span className="text-[9px] font-black">K</span>
                            </div>
                        </motion.button>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <motion.button 
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleNotifications}
                                className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 relative"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </motion.button>
                        </div>
                        
                        <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"></div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-xs font-black text-slate-900 dark:text-white">Admin Principal</span>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    En Línea
                                </span>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
                                <img
                                    src="https://ui-avatars.com/api/?name=Admin+ResiNova&background=137fec&color=fff&bold=true"
                                    alt="Admin Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
