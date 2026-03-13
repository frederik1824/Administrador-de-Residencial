import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Search, DoorOpen, Edit2, Trash2, 
    RefreshCw, Building, LayoutGrid, CheckCircle2, 
    Wrench, DownloadCloud, Building2,
    Filter, X
} from 'lucide-react';
import { getAll, add, update, remove, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Apartment {
    id?: string;
    buildingId: string;
    buildingName: string;
    number: string;
    floor: number;
    type: string;
    size?: string;
    ownerId?: string;
    status: 'occupied' | 'available' | 'maintenance';
    residentIds: string[];
}

interface BuildingItem {
    id: string;
    name: string;
}

export function ApartmentsManagement() {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [buildings, setBuildings] = useState<BuildingItem[]>([]);
    const [apartmentTypes, setApartmentTypes] = useState<string[]>(['Standard', 'Penthouse', 'Duplex', 'Estudio']);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBuildingId, setFilterBuildingId] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Apartment, 'id'>>({
        buildingId: '',
        buildingName: '',
        number: '',
        floor: 1,
        type: 'Standard',
        size: '',
        ownerId: '',
        status: 'available',
        residentIds: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [aptsData, bldgsData, settingsData] = await Promise.all([
                getAll(COLLECTIONS.APARTMENTS),
                getAll(COLLECTIONS.BUILDINGS),
                getAll(COLLECTIONS.RESIDENTIAL_SETTINGS)
            ]);
            setApartments(aptsData as Apartment[]);
            setBuildings(bldgsData as BuildingItem[]);

            const globalSettings = (settingsData.find((d: any) => d.id === 'global') || settingsData[0]) as any;
            if (globalSettings && globalSettings.apartmentTypes) {
                setApartmentTypes(globalSettings.apartmentTypes);
            }

            if (bldgsData.length > 0 && !formData.buildingId) {
                setFormData(prev => ({ ...prev, buildingId: bldgsData[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (apt?: Apartment) => {
        if (apt) {
            setEditingId(apt.id || null);
            setFormData({
                buildingId: apt.buildingId,
                buildingName: apt.buildingName,
                number: apt.number,
                floor: apt.floor,
                type: apt.type,
                size: apt.size || '',
                ownerId: apt.ownerId || '',
                status: apt.status,
                residentIds: apt.residentIds || []
            });
        } else {
            setEditingId(null);
            setFormData({
                buildingId: buildings.length > 0 ? buildings[0].id : '',
                buildingName: buildings.length > 0 ? buildings[0].name : '',
                number: '',
                floor: 1,
                type: apartmentTypes.length > 0 ? apartmentTypes[0] : 'Standard',
                size: '',
                ownerId: '',
                status: 'available',
                residentIds: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const selectedBldg = buildings.find(b => b.id === formData.buildingId);
            const dataToSave = {
                ...formData,
                buildingName: selectedBldg ? selectedBldg.name : formData.buildingName
            };

            if (editingId) {
                await update(COLLECTIONS.APARTMENTS, editingId, dataToSave);
            } else {
                await add(COLLECTIONS.APARTMENTS, dataToSave);
            }
            showToast(`Apartamento ${editingId ? 'actualizado' : 'creado'} exitosamente.`);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving apartment:', error);
            showToast('Ocurrió un error al procesar el apartamento.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, number: string) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el apartamento "${number}"?`)) {
            try {
                await remove(COLLECTIONS.APARTMENTS, id);
                showToast(`Apartamento "${number}" eliminado.`);
                fetchData();
            } catch (error) {
                console.error('Error deleting apartment:', error);
                showToast('No se pudo eliminar el apartamento.', 'error');
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'occupied':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20"><CheckCircle2 size={12} /> Ocupado</span>;
            case 'available':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={12} /> Disponible</span>;
            case 'maintenance':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20"><Wrench size={12} /> Taller</span>;
            default:
                return status;
        }
    };

    const exportToCSV = () => {
        const headers = ['Apartamento', 'Edificio', 'Piso', 'Tipo', 'Metraje', 'Estado', 'Cantidad Residentes', 'Propietario ID'];
        const csvContent = [
            headers.join(','),
            ...filteredApartments.map(apt => [
                apt.number,
                `"${apt.buildingName}"`,
                apt.floor,
                `"${apt.type}"`,
                `"${apt.size || ''}"`,
                apt.status,
                apt.residentIds?.length || 0,
                apt.ownerId || ''
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'apartamentos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredApartments = apartments.filter(a => {
        const matchesSearch = (a.number || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBuilding = filterBuildingId === 'all' || a.buildingId === filterBuildingId;
        const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
        return matchesSearch && matchesBuilding && matchesStatus;
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <Building2 size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Propiedades</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Unidades de <span className="text-primary">Vivienda</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-tight">Gestiona la disponibilidad, residentes y mantenimiento de cada unidad.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={exportToCSV} 
                        className="group flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all shadow-sm"
                    >
                        <DownloadCloud size={16} className="group-hover:-translate-y-1 transition-transform" />
                        Exportar
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchData}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/30 active:shadow-inner transition-all"
                    >
                        <Plus size={18} />
                        Nueva Unidad
                    </motion.button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {[
                    { label: 'Total Unidades', value: apartments.length, color: 'text-primary', bg: 'bg-primary/5', icon: LayoutGrid },
                    { label: 'Disponibles', value: apartments.filter(a => a.status === 'available').length, color: 'text-emerald-500', bg: 'bg-emerald-500/5', icon: CheckCircle2 },
                    { label: 'Ocupadas', value: apartments.filter(a => a.status === 'occupied').length, color: 'text-blue-600', bg: 'bg-blue-600/5', icon: DoorOpen },
                    { label: 'En Mantenimiento', value: apartments.filter(a => a.status === 'maintenance').length, color: 'text-amber-500', bg: 'bg-amber-500/5', icon: Wrench },
                ].map((stat, idx) => (
                    <motion.div 
                        key={idx}
                        variants={itemVariants}
                        className={`${stat.bg} p-6 rounded-[2rem] border border-white dark:border-slate-800/40 flex items-center justify-between group cursor-default shadow-sm`}
                    >
                        <div>
                            <p className="label-text text-[10px] mb-1">{stat.label}</p>
                            <p className={`text-3xl font-black ${stat.color} dark:text-white tracking-tighter`}>{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${stat.bg.replace('/5', '/10')} ${stat.color} group-hover:scale-110 transition-transform border border-current/10 shadow-sm`}>
                            <stat.icon size={22} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters and Search Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 backdrop-blur-xl relative z-10 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por número de unidad..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium pl-12"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-56">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterBuildingId}
                            onChange={(e) => setFilterBuildingId(e.target.value)}
                            className="input-premium pl-12 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer"
                        >
                            <option value="all">Edificios (Todos)</option>
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 lg:w-56">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-premium pl-12 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer"
                        >
                            <option value="all">Estados (Todos)</option>
                            <option value="occupied">Ocupado</option>
                            <option value="available">Disponible</option>
                            <option value="maintenance">Mantenimiento</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Table Area */}
            <motion.div 
                variants={itemVariants}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden relative z-10"
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-8 py-6 label-text !text-slate-600 dark:!text-slate-400">Unidad</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Ubicación</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400 text-center">Configuración</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400 text-center">Estado</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <RefreshCw className="animate-spin text-primary mx-auto" size={40} />
                                        </td>
                                    </motion.tr>
                                ) : filteredApartments.length === 0 ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No se encontraron unidades</p>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredApartments.map((apt, index) => (
                                        <motion.tr 
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            key={apt.id || index}
                                            className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary font-black text-xl shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                                                        <DoorOpen size={26} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter uppercase">{apt.number}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.15em]">Unidad Residencial</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">{apt.buildingName}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Piso {apt.floor}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{apt.type}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-emerald-500 font-black mt-0.5">{apt.size ? `${apt.size} m²` : 'Pendiente'}</p>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {getStatusBadge(apt.status)}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenModal(apt)}
                                                        className="p-3 text-slate-500 hover:text-primary bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all"
                                                        title="Editar Unidad"
                                                    >
                                                        <Edit2 size={18} />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDelete(apt.id!, apt.number)}
                                                        className="p-3 text-slate-500 hover:text-rose-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all"
                                                        title="Eliminar Unidad"
                                                    >
                                                        <Trash2 size={18} />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                            onClick={() => !saving && setIsModalOpen(false)}
                        ></motion.div>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                        <DoorOpen size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {editingId ? 'Editar Unidad' : 'Registrar Unidad'}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form id="aptForm" onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Número de Apto</label>
                                        <input
                                            type="text" required
                                            value={formData.number}
                                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                            className="input-premium"
                                            placeholder="Ex: 501B"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Piso / Nivel</label>
                                        <input
                                            type="number" required
                                            value={formData.floor}
                                            onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                                            className="input-premium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-text text-[10px] ml-1">Edificio / Torre</label>
                                    <select
                                        required
                                        value={formData.buildingId}
                                        onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                                        className="input-premium appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Seleccionar estructura...</option>
                                        {buildings.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Tipo de Unidad</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="input-premium appearance-none cursor-pointer"
                                        >
                                            {apartmentTypes.map((type, idx) => (
                                                <option key={idx} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Estado Operativo</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                            className="input-premium appearance-none cursor-pointer"
                                        >
                                            <option value="occupied">Ocupado</option>
                                            <option value="available">Disponible</option>
                                            <option value="maintenance">Mantenimiento</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text text-[10px] ml-1">Metraje Construcción (m²)</label>
                                    <input
                                        type="text"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        className="input-premium"
                                        placeholder="Ejem: 185.50"
                                    />
                                </div>
                            </form>
                            
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5 rounded-b-[2.5rem]">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    form="aptForm"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving && <RefreshCw className="animate-spin mr-2" size={16} />}
                                    {editingId ? 'Actualizar Datos' : 'Confirmar Registro'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
