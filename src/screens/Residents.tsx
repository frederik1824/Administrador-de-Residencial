import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, X, RefreshCw, 
    DownloadCloud, UserPlus, Filter, UserCheck, 
    Users as UsersIcon, CreditCard, ChevronRight,
    Building2, MapPin, CheckCircle2 as CheckCircle2Icon, 
    AlertTriangle as AlertTriangleIcon, Edit2
} from 'lucide-react';
import { getAll, add, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

// Add type for Resident
interface Resident {
    id?: string;
    // Personal Info
    name: string;
    lastName: string;
    documentType?: 'Cédula' | 'Pasaporte' | 'Otro';
    documentId: string;
    birthDate?: string;
    gender?: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo';
    nationality?: string;
    avatar?: string;

    // Contact Info
    phone: string;
    secondaryPhone?: string;
    email: string;
    additionalAddress?: string;

    // Residential Relation
    residentialId?: string;
    buildingId?: string;
    unit: string; // Apartment Unit
    floor?: string;
    unitType?: string;

    // Status and Condition
    residentType: 'Propietario' | 'Inquilino' | 'Familiar' | 'Encargado' | 'Administrador' | 'Otro';
    status: 'Active' | 'Inactive' | 'Suspended' | 'Exited';
    entryDate?: string;
    exitDate?: string;
    occupantsCount?: number;

    // Administrative Data
    internalCode?: string;
    notes?: string;
    isDelinquent?: boolean; // Morosidad
    isExonerated?: boolean;
    specialTreatment?: boolean;

    // Emergency Contact
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;

    // Maintenance Config
    maintenanceFee?: number;
    feeType?: 'Fija' | 'Personalizada' | 'Exonerada' | 'Descuento';
    billingFrequency?: 'Mensual' | 'Trimestral' | 'Anual' | 'Otra';
    billingStartDate?: string;
    billingEndDate?: string;
    feeChangeReason?: string;
}

export function Residents() {
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [searchTerm, setSearchTerm] = useState('');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // State for structure
    const [buildings, setBuildings] = useState<any[]>([]);
    const [apartments, setApartments] = useState<any[]>([]);
    const [filteredApartments, setFilteredApartments] = useState<any[]>([]);

    const [filterType, setFilterType] = useState('Todos');
    const [filterStatus, setFilterStatus] = useState('Todos');

    // Form state
    const [formData, setFormData] = useState<Omit<Resident, 'id'>>({
        name: '', lastName: '', documentType: 'Cédula', documentId: '',
        email: '', phone: '', secondaryPhone: '',
        buildingId: '', unit: '', floor: '',
        residentType: 'Propietario', status: 'Active',
        maintenanceFee: 0, feeType: 'Fija', billingFrequency: 'Mensual'
    });

    const fetchStructure = async () => {
        try {
            const [bldgsData, aptsData] = await Promise.all([
                getAll(COLLECTIONS.BUILDINGS),
                getAll(COLLECTIONS.APARTMENTS)
            ]);
            setBuildings(bldgsData);
            setApartments(aptsData);
        } catch (error) {
            console.error('Failed to fetch structure:', error);
        }
    };

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const data = await getAll(COLLECTIONS.USERS);
            setResidents(data as Resident[]);
        } catch (error) {
            console.error('Failed to fetch residents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResidents();
        fetchStructure();
    }, []);

    // Handle building change to filter units
    useEffect(() => {
        if (formData.buildingId) {
            const relevantApts = apartments.filter(a => a.buildingId === formData.buildingId);
            setFilteredApartments(relevantApts);
            
            // If current unit doesn't belong to new building, clear it
            const currentAptValid = relevantApts.some(a => a.number === formData.unit);
            if (!currentAptValid) {
                setFormData(prev => ({ ...prev, unit: '', floor: '', unitType: '' }));
            }
        } else {
            setFilteredApartments([]);
            setFormData(prev => ({ ...prev, unit: '', floor: '', unitType: '' }));
        }
    }, [formData.buildingId, apartments, formData.unit]);

    const handleUnitChange = (unitNumber: string) => {
        const apt = filteredApartments.find(a => a.number === unitNumber);
        if (apt) {
            setFormData(prev => ({ 
                ...prev, 
                unit: apt.number, 
                floor: apt.floor?.toString() || '',
                unitType: apt.type || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, unit: '', floor: '', unitType: '' }));
        }
    };

    const getBuildingName = (id?: string) => {
        if (!id) return '';
        const b = buildings.find(b => b.id === id);
        return b ? b.name : id;
    };

    const handleAddResident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.buildingId || !formData.unit) {
            showToast('Debe seleccionar un edificio y un apartamento válido.', 'info');
            return;
        }
        setSaving(true);
        try {
            await add(COLLECTIONS.USERS, formData);
            showToast(`¡Excelente! ${formData.name} ha sido registrado.`);
        } catch (error) {
            showToast('Hubo un error al registrar el perfil.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredResidents = residents.filter(r => {
        const matchesSearch = 
            (r.name + ' ' + r.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.documentId.includes(searchTerm) ||
            r.unit?.includes(searchTerm);
        
        const matchesType = filterType === 'Todos' || r.residentType === filterType;
        const matchesStatus = filterStatus === 'Todos' || 
            (filterStatus === 'Activos' && r.status === 'Active') ||
            (filterStatus === 'Inactivos' && r.status !== 'Active');

        return matchesSearch && matchesType && matchesStatus;
    });

    const exportToCSV = () => {
        const headers = ['Nombre الكامل', 'Documento', 'Email', 'Teléfono', 'Edificio', 'Unidad', 'Tipo', 'Estado'];
        const csvContent = [
            headers.join(','),
            ...filteredResidents.map(r => [
                `"${r.name} ${r.lastName}"`,
                r.documentId,
                r.email,
                r.phone,
                `"${getBuildingName(r.buildingId)}"`,
                r.unit,
                r.residentType,
                r.status
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'residentes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
            className="flex flex-col space-y-8 pb-10 h-full"
        >
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <UsersIcon size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Comunidad</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Directorio de <span className="text-primary">Residentes</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-tight">Administración centralizada de propietarios, inquilinos y familiares.</p>
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
                        onClick={fetchResidents}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/30 active:shadow-inner transition-all"
                    >
                        <UserPlus size={18} />
                        Nuevo Registro
                    </motion.button>
                </div>
            </div>

            {/* Quick Filter Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {[
                    { label: 'Total Residentes', value: residents.length, color: 'text-primary', bg: 'bg-primary/5', icon: UsersIcon },
                    { label: 'Propietarios', value: residents.filter(r => r.residentType === 'Propietario').length, color: 'text-blue-600', bg: 'bg-blue-600/5', icon: UserCheck },
                    { label: 'En Mora', value: residents.filter(r => r.isDelinquent).length, color: 'text-rose-500', bg: 'bg-rose-500/5', icon: CreditCard },
                    { label: 'Inactivos', value: residents.filter(r => r.status === 'Inactive').length, color: 'text-slate-500', bg: 'bg-slate-500/5', icon: Edit2 },
                ].map((stat, idx) => (
                    <motion.div 
                        key={idx}
                        variants={itemVariants}
                        className={`${stat.bg} p-6 rounded-[2rem] border border-white dark:border-slate-800 flex items-center justify-between group cursor-default shadow-sm hover:shadow-md transition-all`}
                    >
                        <div>
                            <p className="label-text text-[10px] mb-1">{stat.label}</p>
                            <p className={`text-3xl font-black ${stat.color} dark:text-white tracking-tighter`}>{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${stat.bg.replace('/5', '/10')} ${stat.color} group-hover:scale-110 transition-transform border border-current/10`}>
                            <stat.icon size={22} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters and Search Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 backdrop-blur-xl relative z-10 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento o número de unidad..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-premium pl-14 h-14"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-56">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="input-premium pl-12 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer h-14"
                        >
                            <option value="Todos">Roles (Todos)</option>
                            <option value="Propietario">Propietarios</option>
                            <option value="Inquilino">Inquilinos</option>
                            <option value="Familiar">Familiares</option>
                        </select>
                    </div>

                    <div className="relative flex-1 lg:w-56">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500"></div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-premium pl-10 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer h-14"
                        >
                            <option value="Todos">Estado (Cualquiera)</option>
                            <option value="Activos">Activos</option>
                            <option value="Inactivos">Inactivos</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Table Section */}
            <motion.div 
                variants={itemVariants}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex-1 flex flex-col relative z-10"
            >
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-8 py-6 label-text !text-slate-600 dark:!text-slate-400">Residente</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Localización</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Clasificación</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400">Estado Financiero</th>
                                <th className="px-6 py-6 label-text !text-slate-600 dark:!text-slate-400 text-center">Estatus</th>
                                <th className="px-8 py-6 label-text !text-slate-600 dark:!text-slate-400 text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-14 h-14 skeleton" /><div className="space-y-2"><div className="w-32 h-4 skeleton" /><div className="w-48 h-3 skeleton" /></div></div></td>
                                                <td className="px-6 py-6"><div className="w-24 h-4 skeleton mb-2" /><div className="w-32 h-3 skeleton" /></td>
                                                <td className="px-6 py-6"><div className="w-16 h-4 skeleton rounded-full" /></td>
                                                <td className="px-6 py-6"><div className="w-24 h-6 skeleton rounded-xl" /></td>
                                                <td className="px-6 py-6 text-center"><div className="w-4 h-4 skeleton rounded-full mx-auto" /></td>
                                                <td className="px-6 py-6"><div className="w-8 h-8 skeleton rounded-lg ml-auto" /></td>
                                            </tr>
                                        ))}
                                    </>
                                ) : filteredResidents.length === 0 ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No se encontraron residentes</p>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredResidents.map((resident, index) => (
                                        <motion.tr 
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            key={resident.id || index} 
                                            className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary font-black text-xl shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                                                        {resident.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-tight uppercase">{resident.name} {resident.lastName}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-tight mt-0.5">{resident.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                                                        <MapPin size={14} className="text-primary" />
                                                        Unidad {resident.unit}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                        <Building2 size={12} />
                                                        {getBuildingName(resident.buildingId)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest rounded-xl">
                                                    {resident.residentType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                {resident.isDelinquent ? (
                                                    <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 px-3 py-1.5 rounded-xl w-fit shadow-sm">
                                                        <AlertTriangleIcon size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">En Mora</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit shadow-sm">
                                                        <CheckCircle2Icon size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Pago al día</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className={`w-3 h-3 rounded-full mb-1 ${resident.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                        {resident.status === 'Active' ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1, x: 5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => navigate(`/residents/${resident.id}`)}
                                                        className="p-3 text-slate-500 hover:text-primary bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all"
                                                        title="Ver Expediente"
                                                    >
                                                        <ChevronRight size={22} />
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

            {/* Create Modal */}
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
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                        <UserPlus size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Alta de Residente</h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form id="residentForm" onSubmit={handleAddResident} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            <UserCheck size={16} className="text-primary" />
                                            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Información Personal</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="label-text text-[10px] ml-1">Nombres</label>
                                                <input
                                                    type="text" placeholder="Ej: Juan Carlos" required
                                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="input-premium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="label-text text-[10px] ml-1">Apellidos</label>
                                                <input
                                                    type="text" placeholder="Ej: Pérez García" required
                                                    value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                    className="input-premium"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="label-text text-[10px] ml-1">Tipo Doc.</label>
                                                    <select
                                                        value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
                                                        className="input-premium text-xs font-black uppercase appearance-none"
                                                    >
                                                        <option value="Cédula">Cédula</option>
                                                        <option value="Pasaporte">Pasaporte</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="label-text text-[10px] ml-1">Identificación</label>
                                                    <input
                                                        type="text" placeholder="000-0000000-0" required
                                                        value={formData.documentId} onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                                                        className="input-premium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            <Building2 size={16} className="text-slate-500" />
                                            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Asignación Residencial</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="label-text text-[10px] ml-1">Edificio / Torre</label>
                                                <select
                                                    required
                                                    value={formData.buildingId}
                                                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                                                    className="input-premium text-xs font-black appearance-none"
                                                >
                                                    <option value="">Seleccionar edificio...</option>
                                                    {buildings.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="label-text text-[10px] ml-1">Unidad / Apartamento</label>
                                                <select
                                                    required
                                                    disabled={!formData.buildingId}
                                                    value={formData.unit}
                                                    onChange={(e) => handleUnitChange(e.target.value)}
                                                    className="input-premium text-xs font-black appearance-none disabled:opacity-30"
                                                >
                                                    <option value="">Seleccionar unidad...</option>
                                                    {filteredApartments.map(apt => (
                                                        <option key={apt.id} value={apt.number}>{apt.number}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="label-text text-[10px] ml-1">Relación con la Unidad</label>
                                                <select
                                                    value={formData.residentType}
                                                    onChange={(e) => setFormData({ ...formData, residentType: e.target.value as any })}
                                                    className="input-premium text-xs font-black appearance-none"
                                                >
                                                    <option value="Propietario">Propietario</option>
                                                    <option value="Inquilino">Inquilino</option>
                                                    <option value="Familiar">Familiar</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <CreditCard size={16} className="text-emerald-500" />
                                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Canales de Comunicación</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="label-text text-[10px] ml-1">Correo Electrónico</label>
                                            <input
                                                type="email" placeholder="ejemplo@correo.com" required
                                                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="input-premium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="label-text text-[10px] ml-1">Teléfono Móvil</label>
                                            <input
                                                type="tel" placeholder="+1 (000) 000-0000" required
                                                value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="input-premium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                            
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5 rounded-b-[2.5rem]">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    form="residentForm"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving ? 'Registrando...' : 'Confirmar Registro'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
