import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Search, Building, Trash2, 
    RefreshCw, Building2, Hash, Layers, 
    X, LayoutGrid, DoorOpen
} from 'lucide-react';
import { getAll, add, update, remove, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface BuildingItem {
    id?: string;
    name: string;
    code: string;
    floors: number;
    apartmentsPerFloor: number;
    status: 'active' | 'inactive';
}

export function BuildingsManagement() {
    const [buildings, setBuildings] = useState<BuildingItem[]>([]);
    const [apartments, setApartments] = useState<any[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<BuildingItem>({
        name: '',
        code: '',
        floors: 1,
        apartmentsPerFloor: 1,
        status: 'active'
    });

    useEffect(() => {
        fetchBuildings();
    }, []);

    const fetchBuildings = async () => {
        setLoading(true);
        try {
            const [bData, aData] = await Promise.all([
                getAll(COLLECTIONS.BUILDINGS),
                getAll(COLLECTIONS.APARTMENTS)
            ]);
            setBuildings(bData as BuildingItem[]);
            setApartments(aData as any[]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (building?: BuildingItem) => {
        if (building) {
            setEditingId(building.id || null);
            setFormData({
                name: building.name,
                code: building.code,
                floors: building.floors,
                apartmentsPerFloor: building.apartmentsPerFloor,
                status: building.status
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                code: '',
                floors: 1,
                apartmentsPerFloor: 1,
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await update(COLLECTIONS.BUILDINGS, editingId, formData);
            } else {
                await add(COLLECTIONS.BUILDINGS, formData);
            }
            showToast(`Edificio ${editingId ? 'actualizado' : 'creado'} exitosamente.`);
            setIsModalOpen(false);
            fetchBuildings();
        } catch (error) {
            console.error('Error saving building:', error);
            showToast('Lamentablemente ocurrió un error al procesar el edificio.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el edificio "${name}"?\nEsta acción no eliminará automáticamente los apartamentos vinculados.`)) {
            try {
                await remove(COLLECTIONS.BUILDINGS, id);
                showToast(`Edificio "${name}" eliminado.`);
                fetchBuildings();
            } catch (error) {
                console.error('Error deleting building:', error);
                showToast('No se pudo eliminar el edificio.', 'error');
            }
        }
    };

    const filteredBuildings = buildings.filter(b =>
        (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getOccupiedCount = (buildingId: string) => {
        return apartments.filter(a => a.buildingId === buildingId && a.status === 'occupied').length;
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
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <Building2 size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Master Data</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Estructura <span className="text-primary">Residencial</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-tight">Define las torres, bloques y edificios que componen tu complejo.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchBuildings}
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
                        Añadir Estructura
                    </motion.button>
                </div>
            </div>

            {/* Filter Section */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/40 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 backdrop-blur-md relative z-10">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código de edificio..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium dark:text-white transition-all shadow-inner shadow-slate-50 dark:shadow-none"
                    />
                </div>
            </motion.div>

            {/* Grid of Buildings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-64 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800"></div>
                        ))
                    ) : filteredBuildings.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <Building size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-loose">No hay estructuras registradas.<br/>Empieza agregando un edificio o torre.</p>
                        </div>
                    ) : (
                        filteredBuildings.map((building, index) => (
                            <motion.div
                                key={building.id || index}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/80 p-8 hover:shadow-2xl hover:shadow-primary/10 transition-all flex flex-col justify-between overflow-hidden shadow-sm"
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${building.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {building.status === 'active' ? 'Operativo' : 'Inactivo'}
                                    </span>
                                </div>

                                <div>
                                    <div className="w-16 h-16 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform border border-primary/10 shadow-sm">
                                        <Building2 size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2 uppercase">{building.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        <Hash size={14} className="text-primary" />
                                        <span>Código: <span className="text-slate-900 dark:text-white font-black">{building.code || 'B-00'}</span></span>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                                    <div className="flex flex-col">
                                        <span className="label-text text-[10px] mb-1">Pisos</span>
                                        <div className="flex items-center gap-1.5">
                                            <Layers size={14} className="text-primary" />
                                            <span className="font-black text-slate-900 dark:text-white text-sm">{building.floors}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="label-text text-[10px] mb-1">Total Ud.</span>
                                        <div className="flex items-center gap-1.5">
                                            <LayoutGrid size={14} className="text-secondary" />
                                            <span className="font-black text-slate-900 dark:text-white text-sm">{(building.floors || 0) * (building.apartmentsPerFloor || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="label-text text-[10px] mb-1">Ocupados</span>
                                        <div className="flex items-center gap-1.5">
                                            <DoorOpen size={14} className="text-emerald-500" />
                                            <span className="font-black text-slate-900 dark:text-white text-sm">{getOccupiedCount(building.id || '')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleOpenModal(building)}
                                        className="flex-1 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 hover:bg-primary dark:hover:bg-primary dark:hover:text-white"
                                    >
                                        Editar Perfil
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDelete(building.id!, building.name)}
                                        className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 rounded-xl transition-all shadow-sm flex items-center justify-center"
                                    >
                                        <Trash2 size={18} />
                                    </motion.button>
                                </div>


                                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Building2 size={160} />
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

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
                                        <Building size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {editingId ? 'Actualizar Estructura' : 'Alta de Estructura'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form id="buildingForm" onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="label-text text-[10px] ml-1">Nombre Comercial de la Torre</label>
                                    <input
                                        type="text" required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-premium"
                                        placeholder="Ej: Torre Diamante"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-text text-[10px] ml-1">Código de Identificación Interna</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="input-premium"
                                        placeholder="Ej: T-01, BLQ-A"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Niveles / Pisos</label>
                                        <input
                                            type="number" required min="1"
                                            value={formData.floors}
                                            onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) || 1 })}
                                            className="input-premium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-text text-[10px] ml-1">Aptos por Nivel</label>
                                        <input
                                            type="number" required min="1"
                                            value={formData.apartmentsPerFloor}
                                            onChange={(e) => setFormData({ ...formData, apartmentsPerFloor: parseInt(e.target.value) || 1 })}
                                            className="input-premium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-text text-[10px] ml-1">Estado de la Estructura</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                        className="input-premium appearance-none cursor-pointer"
                                    >
                                        <option value="active">Activo y Operativo</option>
                                        <option value="inactive">Inactivo / Fuera de Servicio</option>
                                    </select>
                                </div>
                            </form>
                            
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5 rounded-b-[2.5rem]">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    Descartar
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    form="buildingForm"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving && <RefreshCw className="animate-spin mr-2" size={16} />}
                                    {editingId ? 'Actualizar Estructura' : 'Guardar Estructura'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}

