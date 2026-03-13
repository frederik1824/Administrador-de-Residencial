import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UserPlus, Search, Shield, Smartphone, Globe, 
    X, KeyRound, Filter, RefreshCw, 
    ShieldCheck, Edit
} from 'lucide-react';
import { getAll, add, update, COLLECTIONS } from '../services/dbServices';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

interface UserAccount {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
    status: 'Active' | 'Inactive' | 'Suspended' | 'Pending' | 'Blocked';
    channels: string[];
    lastLogin?: any;
    phone?: string;
    createdAt?: any;
}

interface Role {
    id: string;
    name: string;
}

export function UsersManagement() {
    const { updateUserPassword, resetPassword } = useAuth();
    const { showToast } = useUI();
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
    const [saving, setSaving] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        roleId: 'residente',
        status: 'Active' as UserAccount['status'],
        channels: ['web'] as string[],
        phone: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                getAll(COLLECTIONS.USERS),
                getAll(COLLECTIONS.ROLES)
            ]);
            setUsers(usersData as UserAccount[]);
            setRoles(rolesData as Role[]);
        } catch (error) {
            console.error('Error loading users data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const roleName = roles.find((r: any) => r.id === form.roleId)?.name || 'Residente';
            const userData = { ...form, roleName };

            if (selectedUser) {
                await update(COLLECTIONS.USERS, selectedUser.id, userData);
            } else {
                await add(COLLECTIONS.USERS, userData);
            }
            showToast(`Usuario ${selectedUser ? 'actualizado' : 'creado'} exitosamente.`);
            setShowModal(false);
            fetchData();
        } catch (error) {
            showToast('Error al guardar el usuario.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !newPassword) return;
        setSaving(true);
        try {
            await updateUserPassword(selectedUser.id, newPassword);
            showToast(`Contraseña actualizada para ${selectedUser.name}.`);
            setShowPasswordModal(false);
            setNewPassword('');
        } catch (error: any) {
            showToast(`Error al actualizar contraseña.`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSendResetEmail = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            await resetPassword(selectedUser.email);
            showToast(`Correo de restablecimiento enviado a ${selectedUser.email}.`);
            setShowPasswordModal(false);
        } catch (error: any) {
            showToast(`Error al enviar el correo.`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const openCreate = () => {
        setSelectedUser(null);
        setForm({
            name: '',
            email: '',
            roleId: 'residente',
            status: 'Active',
            channels: ['mobile'],
            phone: ''
        });
        setShowModal(true);
    };

    const openEdit = (user: UserAccount) => {
        setSelectedUser(user);
        setForm({
            name: user.name,
            email: user.email,
            roleId: user.roleId || 'residente',
            status: user.status,
            channels: user.channels || ['web'],
            phone: user.phone || ''
        });
        setShowModal(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || user.roleId === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    });

    const getStatusStyles = (status: UserAccount['status']) => {
        switch (status) {
            case 'Active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Inactive': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'Suspended': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Blocked': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'Pending': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

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
            className="flex flex-col space-y-8 pb-10"
        >
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <ShieldCheck size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Control de Acceso</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Gestión de <span className="text-primary">Usuarios</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-tight">Administra los permisos y accesos de residentes y administradores.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openCreate}
                        className="btn-primary"
                    >
                        <UserPlus size={18} />
                        Alta de Usuario
                    </motion.button>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 backdrop-blur-xl relative z-10 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo electrónico..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-premium pl-14 h-14"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-56">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="input-premium pl-12 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer h-14"
                        >
                            <option value="all">Filtro por Rol</option>
                            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </div>

                    <div className="relative flex-1 lg:w-56">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500"></div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="input-premium pl-10 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer h-14"
                        >
                            <option value="all">Estatus (Todos)</option>
                            <option value="Active">Activo</option>
                            <option value="Inactive">Inactivo</option>
                            <option value="Suspended">Suspendido</option>
                        </select>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchData}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div 
                variants={itemVariants}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex-1 flex flex-col relative z-10"
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-8 py-6 label-text !text-slate-600 dark:!text-slate-400">Usuario</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Nivel de Acceso</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Dispositivos</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Estado</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <RefreshCw className="animate-spin text-primary" size={40} />
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Sincronizando seguridad...</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : filteredUsers.map((user, index) => (
                                    <motion.tr 
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        key={user.id} 
                                        className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white tracking-tight uppercase">{user.name}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 w-fit uppercase tracking-widest">
                                                <Shield size={12} /> {user.roleName || 'Sin Rol'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-3 opacity-60">
                                                <Globe size={18} className={user.channels?.includes('web') ? 'text-primary' : 'text-slate-300'} />
                                                <Smartphone size={18} className={user.channels?.includes('mobile') ? 'text-emerald-500' : 'text-slate-300'} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(user.status)}`}>
                                                <div className="size-1.5 rounded-full bg-current"></div>
                                                {user.status === 'Active' ? 'Activo' : user.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }} 
                                                    whileTap={{ scale: 0.9 }} 
                                                    onClick={() => { setSelectedUser(user); setNewPassword(''); setShowPasswordModal(true); }} 
                                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-amber-500 shadow-sm"
                                                    title="Gestionar Seguridad"
                                                >
                                                    <KeyRound size={20} />
                                                </motion.button>
                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }} 
                                                    whileTap={{ scale: 0.9 }} 
                                                    onClick={() => openEdit(user)} 
                                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-primary shadow-sm"
                                                    title="Editar Perfil"
                                                >
                                                    <Edit size={20} />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modals with Premium Styling */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !saving && setShowModal(false)}></motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20"><UserPlus size={24} /></div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{selectedUser ? 'Editar Perfil' : 'Nueva Cuenta'}</h3>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                            </div>
                            <form id="userForm" onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Nombre Completo</label>
                                    <input type="text" required placeholder="Ej: Administrador Central" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Email de Acceso</label>
                                    <input type="email" required placeholder="admin@residenova.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-premium" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="label-text ml-1">Rol Operativo</label>
                                        <select value={form.roleId} onChange={e => setForm({...form, roleId: e.target.value})} className="input-premium text-xs font-black appearance-none uppercase tracking-widest">
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-text ml-1">Estatus Actual</label>
                                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="input-premium text-xs font-black appearance-none uppercase tracking-widest">
                                            <option value="Active">Activo</option>
                                            <option value="Suspended">Suspendido</option>
                                            <option value="Blocked">Bloqueado</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="label-text ml-1">Canales Permitidos</label>
                                    <div className="flex gap-4">
                                        {['web', 'mobile'].map(channel => (
                                            <button
                                                key={channel}
                                                type="button"
                                                onClick={() => setForm(prev => ({
                                                    ...prev,
                                                    channels: prev.channels.includes(channel) 
                                                        ? prev.channels.filter(c => c !== channel) 
                                                        : [...prev.channels, channel]
                                                }))}
                                                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                                                    form.channels.includes(channel) 
                                                    ? 'bg-primary/5 border-primary text-primary' 
                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                {channel === 'web' ? <Globe size={16} /> : <Smartphone size={16} />}
                                                {channel}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5 rounded-b-[2.5rem]">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" form="userForm" disabled={saving} className="btn-primary">
                                    {saving ? 'Guardando...' : 'Sincronizar Datos'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showPasswordModal && selectedUser && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !saving && setShowPasswordModal(false)}></motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800">
                             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-500/5">
                                <div className="flex items-center gap-3 text-amber-500 font-black">
                                    <KeyRound size={24} />
                                    <h3 className="text-xl tracking-tight leading-none uppercase pt-1">Seguridad</h3>
                                </div>
                                <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Usuario Seleccionado</p>
                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedUser.name}</p>
                                    <p className="text-xs font-bold text-primary">{selectedUser.email}</p>
                                </div>

                                <div className="space-y-4">
                                    <button 
                                        onClick={handleSendResetEmail}
                                        disabled={saving}
                                        className="w-full flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary transition-all shadow-sm"
                                    >
                                        Enviarme Recovery Email
                                    </button>

                                    <div className="relative flex items-center gap-4 py-2">
                                        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">O CAMBIO MANUAL</span>
                                        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                                    </div>

                                    <form id="passForm" onSubmit={handlePasswordUpdate} className="space-y-1.5">
                                        <label className="label-text ml-1">Nueva Contraseña</label>
                                        <input 
                                            type="password" required 
                                            placeholder="Mínimo 8 caracteres..." 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="input-premium"
                                        />
                                    </form>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                                    type="submit" form="passForm"
                                    disabled={saving || !newPassword} 
                                    className="btn-primary w-full !bg-amber-500 !border-amber-600 shadow-amber-500/30"
                                >
                                    {saving ? 'Procesando...' : 'Forzar Cambio Clave'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
