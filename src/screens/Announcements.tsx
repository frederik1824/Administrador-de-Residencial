import { useState, useEffect } from 'react';
import { Bell, Plus, Image as ImageIcon, RefreshCw, X, Droplets, Leaf, Info, Sparkles, AlertCircle, Wrench, Edit2, Trash2, Calendar, Users } from 'lucide-react';
import { getAll, add, update, remove, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Announcement {
    id: string; // doc id
    title: string;
    content: string;
    date: string; // created string
    timestamp?: number; // for exact sorting
    type: string;
    author: string;
    icon?: string;
    validUntil?: string; // ISO date YYYY-MM-DD
    status?: 'Pendiente' | 'Completado';
    startDate?: string;
    time?: string;
    targetAudience?: string;
}

const ICON_OPTIONS = [
    { id: 'information-circle-outline', name: 'Información', component: <Info size={18} /> },
    { id: 'water-sharp', name: 'Agua/Plomería', component: <Droplets size={18} /> },
    { id: 'leaf-outline', name: 'Jardinería', component: <Leaf size={18} /> },
    { id: 'sparkles-outline', name: 'Evento', component: <Sparkles size={18} /> },
    { id: 'alert-circle-outline', name: 'Alerta', component: <AlertCircle size={18} /> },
    { id: 'build-outline', name: 'Reparación', component: <Wrench size={18} /> },
];

const TextDate = ({ date }: { date: string }) => {
    return (
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            {date.replace(/de /g, '')}
        </span>
    );
};

export function Announcements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // For quick publish
    const [quickTitle, setQuickTitle] = useState('');
    const [quickContent, setQuickContent] = useState('');
    const [quickType, setQuickType] = useState('Informativo');
    const [quickIcon, setQuickIcon] = useState('information-circle-outline');

    // For Full Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'Informativo',
        icon: 'information-circle-outline',
        validUntil: '', // empty means no expiration
        status: 'Pendiente' as 'Pendiente' | 'Completado',
        startDate: '',
        time: '',
        targetAudience: 'Todos'
    });

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const data = await getAll(COLLECTIONS.ANNOUNCEMENTS);
            // Sort by timestamp or fallback to date
            const sortedData = (data as Announcement[]).sort((a, b) => {
                if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            setAnnouncements(sortedData);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const publishAnnouncement = async (
        title: string, content: string, type: string, icon: string, validUntil?: string, idToEdit?: string,
        status: 'Pendiente' | 'Completado' = 'Pendiente', startDate?: string, time?: string, targetAudience: string = 'Todos'
    ) => {
        if (!title.trim() || !content.trim()) {
            showToast('Por favor completa el título y mensaje.', 'info');
            return;
        }

        setSaving(true);
        try {
            const todayDate = new Date();
            const todayStr = todayDate.toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            const payload = {
                title,
                content,
                type,
                author: 'Administración',
                icon,
                validUntil: validUntil || '',
                status,
                startDate: startDate || '',
                time: time || '',
                targetAudience,
                timestamp: todayDate.getTime()
            };

            if (idToEdit) {
                await update(COLLECTIONS.ANNOUNCEMENTS, idToEdit, payload);
            } else {
                await add(COLLECTIONS.ANNOUNCEMENTS, { ...payload, date: todayStr });
            }

            showToast(`Comunicado ${idToEdit ? 'actualizado' : 'publicado'} exitosamente.`);
            fetchAnnouncements();
        } catch (error) {
            console.error(error);
            showToast('Hubo un error al publicar el comunicado.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleQuickPublish = async () => {
        await publishAnnouncement(quickTitle || 'Aviso General', quickContent, quickType, quickIcon);
        if (quickContent.trim()) {
            setQuickTitle('');
            setQuickContent('');
            setQuickType('Informativo');
            setQuickIcon('information-circle-outline');
        }
    };

    const handleModalPublish = async (e: React.FormEvent) => {
        e.preventDefault();
        await publishAnnouncement(
            formData.title, formData.content, formData.type, formData.icon, formData.validUntil, editingId || undefined,
            formData.status, formData.startDate, formData.time, formData.targetAudience
        );
        setFormData({ title: '', content: '', type: 'Informativo', icon: 'information-circle-outline', validUntil: '', status: 'Pendiente', startDate: '', time: '', targetAudience: 'Todos' });
        setEditingId(null);
        setIsModalOpen(false);
    };

    const handleEdit = (ann: Announcement) => {
        setEditingId(ann.id);
        setFormData({
            title: ann.title,
            content: ann.content,
            type: ann.type || 'Informativo',
            icon: ann.icon || 'information-circle-outline',
            validUntil: ann.validUntil || '',
            status: ann.status || 'Pendiente',
            startDate: ann.startDate || '',
            time: ann.time || '',
            targetAudience: ann.targetAudience || 'Todos'
        });
        setIsModalOpen(true);
    };

    const toggleStatus = async (ann: Announcement) => {
        const newStatus = ann.status === 'Completado' ? 'Pendiente' : 'Completado';
        try {
            await update(COLLECTIONS.ANNOUNCEMENTS, ann.id, { status: newStatus });
            showToast(`Estado actualizado a ${newStatus}.`);
            fetchAnnouncements();
        } catch (error) {
            console.error(error);
            showToast('Error al actualizar estado.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este comunicado?')) {
            try {
                await remove(COLLECTIONS.ANNOUNCEMENTS, id);
                showToast('Comunicado eliminado.');
                fetchAnnouncements();
            } catch (error) {
                console.error(error);
                showToast('No se pudo eliminar el comunicado.', 'error');
            }
        }
    };

    const isAnnouncementActive = (validUntil?: string) => {
        if (!validUntil) return true;
        const expirationDate = new Date(validUntil);
        expirationDate.setHours(23, 59, 59, 999); // end of that day
        return new Date() <= expirationDate;
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Comunicados</h1>
                    <p className="text-slate-500 dark:text-slate-400">Publica avisos importantes para todos los residentes.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAnnouncements}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ title: '', content: '', type: 'Informativo', icon: 'information-circle-outline', validUntil: '', status: 'Pendiente', startDate: '', time: '', targetAudience: 'Todos' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary/30"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Nuevo Comunicado</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start pb-10">
                {/* Current Announcements List */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="py-12 flex justify-center items-center">
                            <div className="flex items-center gap-3 text-slate-500 font-medium">
                                <RefreshCw className="animate-spin text-primary" size={24} />
                                Cargando comunicados...
                            </div>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                            No hay comunicados publicados aún.
                        </div>
                    ) : (
                        announcements.map((ann) => {
                            const active = isAnnouncementActive(ann.validUntil);
                            return (
                                <div key={ann.id} className={`group relative bg-white dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80 p-6 flex gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 ${!active ? 'opacity-70' : ''}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border 
                                        ${ann.type === 'Evento' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/50' :
                                            ann.type === 'Mantenimiento' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/50' :
                                                ann.status === 'Completado' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' :
                                                    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
                                        }`}>
                                        {ann.icon ? (
                                            ICON_OPTIONS.find(opt => opt.id === ann.icon)?.component || <Bell size={24} />
                                        ) : (
                                            <Bell size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2 flex-1 pr-4">
                                                <h3 className="text-lg font-black leading-tight text-slate-900 dark:text-slate-100">{ann.title}</h3>
                                                {ann.status === 'Pendiente' && active && (
                                                    <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                )}
                                                {!active && (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                        Expirado
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 absolute top-6 right-6 lg:static lg:mt-0">
                                                <button onClick={() => toggleStatus(ann)} className={`p-1.5 rounded-lg border bg-white dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all shadow-sm ${ann.status === 'Completado' ? 'text-amber-500 border-amber-200 hover:bg-amber-50' : 'text-emerald-500 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-900/30'}`} title={ann.status === 'Completado' ? "Marcar como pendiente" : "Marcar como completado"}>
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button onClick={() => handleEdit(ann)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm" title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(ann.id)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm" title="Eliminar">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 leading-relaxed whitespace-pre-wrap">
                                            {ann.content}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                            <div className="flex flex-row items-center gap-2">
                                                <TextDate date={ann.date} />
                                                {ann.status === 'Completado' ? (
                                                    <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100/50 dark:border-emerald-800/30">
                                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Completado</span>
                                                    </div>
                                                ) : (
                                                    <div className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30">
                                                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest">Pendiente</span>
                                                    </div>
                                                )}
                                                <div className={`px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 ${ann.type === 'Evento' ? 'bg-purple-50 dark:bg-purple-900/20' : ann.type === 'Mantenimiento' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${ann.type === 'Evento' ? 'text-purple-600 dark:text-purple-400' : ann.type === 'Mantenimiento' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {ann.type}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-row items-center gap-3 ml-auto text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    Por {ann.author}
                                                </span>
                                                {ann.startDate && (
                                                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        {new Date(ann.startDate).toLocaleDateString('es-ES')} {ann.time && `a las ${ann.time}`}
                                                    </span>
                                                )}
                                                {ann.validUntil && (
                                                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md" title="Válido hasta">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        Vence: {new Date(ann.validUntil).toLocaleDateString('es-ES')}
                                                    </span>
                                                )}
                                                {ann.targetAudience && ann.targetAudience !== 'Todos' && (
                                                    <span className="flex items-center gap-1 text-primary">
                                                        <Users size={12} />
                                                        {ann.targetAudience}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Quick Publish Widget */}
                <div className="lg:col-span-1 sticky top-24">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Aviso Rápido</h3>

                        <div className="mb-3">
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none dark:text-white placeholder:text-slate-400 font-semibold"
                                placeholder="Título del aviso"
                                value={quickTitle}
                                onChange={(e) => setQuickTitle(e.target.value)}
                            />
                        </div>

                        <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none dark:text-white mb-3 placeholder:text-slate-400"
                            rows={4}
                            placeholder="Escribe el mensaje..."
                            value={quickContent}
                            onChange={(e) => setQuickContent(e.target.value)}
                        />

                        <div className="mb-4">
                            <select
                                value={quickType} onChange={(e) => setQuickType(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none mb-3"
                            >
                                <option value="Informativo">Informativo</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Evento">Evento</option>
                                <option value="Urgente">Urgente</option>
                            </select>

                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Icono del aviso</span>
                            <div className="flex flex-wrap gap-2">
                                {ICON_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setQuickIcon(opt.id)}
                                        className={`p-2 rounded-lg border transition-colors ${quickIcon === opt.id
                                            ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:text-blue-400'
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                                            }`}
                                        title={opt.name}
                                    >
                                        {opt.component}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors" title="Adjuntar imagen (Próximamente)">
                                <ImageIcon size={20} />
                            </button>
                            <button
                                onClick={handleQuickPublish}
                                disabled={saving}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {saving ? "Publicando..." : "Publicar Ahora"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Editar Comunicado' : 'Crear Comunicado Detallado'}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleModalPublish} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Título</label>
                                <input
                                    type="text" required
                                    value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                    <select
                                        value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="Informativo">Informativo</option>
                                        <option value="Mantenimiento">Mantenimiento</option>
                                        <option value="Evento">Evento</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Público Objetivo</label>
                                    <select
                                        value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="Todos">Todos</option>
                                        <option value="Propietarios">Solo Propietarios</option>
                                        <option value="Inquilinos">Solo Inquilinos</option>
                                        <option value="Torre A">Edificio / Torre A</option>
                                        <option value="Personal">Solo Personal / Staff</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                    <select
                                        value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Pendiente' | 'Completado' })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="Pendiente">Pendiente (Activo)</option>
                                        <option value="Completado">Completado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1"><Calendar size={14} /> Inicia el</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hora inicio</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 text-red-500 dark:text-red-400"><X size={14} /> Válido hasta (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Icono representativo</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map((opt) => (
                                        <button
                                            type="button"
                                            key={opt.id}
                                            onClick={() => setFormData({ ...formData, icon: opt.id })}
                                            className={`p-2 rounded-lg border transition-colors flex items-center gap-2 ${formData.icon === opt.id
                                                ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:text-blue-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {opt.component}
                                            <span className="text-xs font-medium">{opt.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mensaje completo</label>
                                <textarea
                                    required rows={5}
                                    value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                    className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center disabled:opacity-70"
                                >
                                    {saving ? (editingId ? 'Actualizando...' : 'Publicando...') : (editingId ? 'Actualizar' : 'Publicar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
