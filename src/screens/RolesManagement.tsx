import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Check, Smartphone, Globe, Save, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { getAll, add, update, COLLECTIONS } from '../services/dbServices';

interface Permission {
    id: string;
    name: string;
    module: string;
    description: string;
}

interface Role {
    id: string;
    name: string;
    description: string;
    level: number;
    permissions: string[];
    channels: string[];
    createdAt?: any;
    updatedAt?: any;
}

const MODULES = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'residents', name: 'Residentes / Propiedades' },
    { id: 'payments', name: 'Pagos / Contabilidad' },
    { id: 'billing', name: 'Emisión de Cuotas' },
    { id: 'announcements', name: 'Comunicados' },
    { id: 'maintenance', name: 'Mantenimiento' },
    { id: 'messages', name: 'Mensajería' },
    { id: 'users', name: 'Gestión de Acceso' },
    { id: 'settings', name: 'Configuración Sistema' }
];

export function RolesManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [expandedModule, setExpandedModule] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        level: 3,
        permissions: [] as string[],
        channels: ['web'] as string[]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesData, permissionsData] = await Promise.all([
                getAll(COLLECTIONS.ROLES),
                getAll(COLLECTIONS.PERMISSIONS)
            ]);
            setRoles(rolesData as Role[]);
            setPermissions(permissionsData as Permission[]);
        } catch (error) {
            console.error('Error fetching roles/permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;

        setSaving(true);
        try {
            if (selectedRole) {
                await update(COLLECTIONS.ROLES, selectedRole.id, form);
            } else {
                const roleId = form.name.toLowerCase().replace(/\s+/g, '_');
                await add(COLLECTIONS.ROLES, { ...form, id: roleId });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Error al guardar el rol');
        } finally {
            setSaving(false);
        }
    };

    const openCreate = () => {
        setSelectedRole(null);
        setForm({
            name: '',
            description: '',
            level: 3,
            permissions: [],
            channels: ['mobile']
        });
        setShowModal(true);
    };

    const openEdit = (role: Role) => {
        setSelectedRole(role);
        setForm({
            name: role.name,
            description: role.description || '',
            level: role.level || 3,
            permissions: role.permissions || [],
            channels: role.channels || ['web']
        });
        setShowModal(true);
    };

    const togglePermission = (permId: string) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(id => id !== permId)
                : [...prev.permissions, permId]
        }));
    };

    const toggleChannel = (channel: string) => {
        setForm(prev => ({
            ...prev,
            channels: prev.channels.includes(channel)
                ? prev.channels.filter(c => c !== channel)
                : [...prev.channels, channel]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-glow-sm">Roles y Permisos</h1>
                    <p className="text-slate-500 dark:text-slate-400">Define los niveles de acceso y responsabilidades del sistema.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={20} />
                    Nuevo Rol
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center animate-pulse">
                        <Shield className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={48} />
                        <p className="text-slate-400">Cargando roles...</p>
                    </div>
                ) : roles.map(role => (
                    <div key={role.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(role)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="w-12 h-12 bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 border border-primary/10">
                            <Shield size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors">{role.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow leading-relaxed line-clamp-2">{role.description || 'Sin descripción detallada.'}</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nivel de Seguridad</span>
                                <span className="text-xs font-bold bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300">Level {role.level}</span>
                            </div>

                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Canales de Acceso</span>
                                <div className="flex gap-2 text-slate-400">
                                    {role.channels?.includes('web') && <Globe size={14} className="text-primary" />}
                                    {role.channels?.includes('mobile') && <Smartphone size={14} className="text-emerald-500" />}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest uppercase tracking-widest">Permisos Asignados</span>
                                <span className="text-xs font-bold text-primary">{role.permissions?.length || 0} permisos</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                            <div>
                                <h3 className="text-2xl font-black dark:text-white">{selectedRole ? 'Configurar Rol' : 'Crear Nuevo Rol'}</h3>
                                <p className="text-sm text-slate-500">Ajusta los permisos y el nivel de acceso para este perfil.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all shadow-sm">
                                <Plus size={24} className="text-slate-500 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6 text-slate-900 dark:text-white">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Rol</label>
                                            <input
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none text-lg font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
                                                placeholder="Ej. Administrador General"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                                            <textarea
                                                rows={3}
                                                value={form.description}
                                                onChange={e => setForm({ ...form, description: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none text-sm font-medium resize-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                placeholder="Describe las funciones de este rol..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-slate-900 dark:text-white">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel Jerárquico</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={form.level}
                                                    onChange={e => setForm({ ...form, level: parseInt(e.target.value) })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2 text-slate-900 dark:text-white">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Accesibilidad</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleChannel('web')}
                                                        className={`flex-1 p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${form.channels.includes('web') ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                                    >
                                                        <Globe size={18} /> <span className="font-bold text-xs uppercase">Web</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleChannel('mobile')}
                                                        className={`flex-1 p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${form.channels.includes('mobile') ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                                    >
                                                        <Smartphone size={18} /> <span className="font-bold text-xs uppercase">App</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions Matrix */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Matriz de Permisos</label>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{form.permissions.length} activos</span>
                                        </div>
                                        <div className="space-y-3">
                                            {MODULES.map(module => (
                                                <div key={module.id} className={`border rounded-2xl transition-all ${expandedModule === module.id ? 'border-primary/30 ring-4 ring-primary/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                                                        className="w-full flex items-center justify-between p-4"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModule === module.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                                <Lock size={16} />
                                                            </div>
                                                            <span className={`font-bold text-sm ${expandedModule === module.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{module.name}</span>
                                                        </div>
                                                        {expandedModule === module.id ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                    </button>

                                                    {expandedModule === module.id && (
                                                        <div className="px-4 pb-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-200">
                                                            {permissions.filter(p => p.module === module.id).map(perm => (
                                                                <button
                                                                    key={perm.id}
                                                                    type="button"
                                                                    onClick={() => togglePermission(perm.id)}
                                                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${form.permissions.includes(perm.id)
                                                                        ? 'bg-primary/5 border-primary/20 text-primary active:scale-[0.98]'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${form.permissions.includes(perm.id) ? 'bg-primary border-primary text-white' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
                                                                        {form.permissions.includes(perm.id) && <Check size={14} strokeWidth={4} />}
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="font-bold text-xs">{perm.name}</p>
                                                                        <p className="text-[10px] opacity-70 leading-tight">{perm.description}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/25 hover:bg-blue-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                                >
                                    {saving ? <Shield className="animate-pulse" size={18} /> : <Save size={18} />}
                                    {selectedRole ? 'Guardar Cambios' : 'Crear Perfil Legislado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
