import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Edit2, User, Phone, Mail, 
    Activity, CreditCard, Save, 
    Building2, MapPin, BadgeCheck, AlertCircle, Calendar,
    ChevronLeft, Printer, Wallet, RefreshCw, AlertTriangle
} from 'lucide-react';
import { getOne, update, getAll, COLLECTIONS } from '../services/dbServices';
import { generateStatementPDF } from '../utils/pdfGenerator';
import { useUI } from '../context/UIContext';

interface Resident {
    id?: string;
    name: string;
    lastName: string;
    documentType?: 'Cédula' | 'Pasaporte' | 'Otro';
    documentId: string;
    phone: string;
    email: string;
    buildingId?: string;
    unit: string;
    floor?: string;
    residentType: 'Propietario' | 'Inquilino' | 'Familiar' | 'Encargado' | 'Administrador' | 'Otro';
    status: 'Active' | 'Inactive' | 'Suspended' | 'Exited';
    isDelinquent?: boolean;
    maintenanceFee?: number;
    feeType?: 'Fija' | 'Personalizada' | 'Exonerada' | 'Descuento';
    notes?: string;
    nationality?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}

export function ResidentDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [resident, setResident] = useState<Resident | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Resident | null>(null);
    const [saving, setSaving] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    const [buildings, setBuildings] = useState<any[]>([]);
    const [apartments, setApartments] = useState<any[]>([]);

    useEffect(() => {
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
        fetchStructure();
    }, []);

    useEffect(() => {
        const fetchResident = async () => {
            if (!id) return;
            try {
                const data = await getOne(COLLECTIONS.USERS, id);
                if (data) {
                    setResident(data as Resident);
                    setEditData(data as Resident);
                }
            } catch (error) {
                console.error("Error fetching resident:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResident();
    }, [id]);

    const handleSave = async () => {
        if (!id || !editData) return;
        setSaving(true);
        try {
            await update(COLLECTIONS.USERS, id, editData);
            setResident(editData);
            setIsEditing(false);
            showToast("Información actualizada exitosamente.");
        } catch (error) {
            showToast("Error al actualizar los datos.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadStatement = async () => {
        if (!resident) return;
        setGeneratingPDF(true);
        try {
            const [paymentsData, settingsData] = await Promise.all([
                getAll(COLLECTIONS.PAYMENTS),
                getAll(COLLECTIONS.RESIDENTIAL_SETTINGS)
            ]);
            const residentPayments = (paymentsData as any[])
                .filter(p => p.residentId === resident.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const settings = (settingsData.find((d: any) => d.id === 'global') || settingsData[0] || {}) as any;

            await generateStatementPDF({
                residentName: `${resident.name} ${resident.lastName || ''}`.trim(),
                unit: resident.unit,
                date: new Date().toLocaleDateString('es-ES'),
                payments: residentPayments,
                residentialName: settings.name || 'Administración de Residencial',
                residentialAddress: settings.address || '',
                residentialPhone: settings.phone || '',
                residentialEmail: settings.email || '',
                logoUrl: settings.logoUrl
            });
            showToast("PDF generado exitosamente.");
        } catch (error) {
            showToast('Error al generar el PDF.', 'error');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const getBuildingName = (bid?: string) => buildings.find(b => b.id === bid)?.name || bid;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <RefreshCw className="animate-spin text-primary" size={40} />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Sincronizando Expediente...</p>
        </div>
    );

    if (!resident) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300">
                <AlertCircle size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Expediente no localizado</h2>
            <button onClick={() => navigate('/residents')} className="text-primary font-black uppercase text-xs tracking-widest hover:underline mt-4">Volver al Directorio</button>
        </div>
    );

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col space-y-8 pb-10">
            {/* Action Bar */}
            <div className="flex items-center justify-between relative z-10">
                <motion.button 
                    whileHover={{ x: -5 }} 
                    onClick={() => navigate('/residents')}
                    className="flex items-center gap-2 group text-slate-500 font-black text-[10px] uppercase tracking-widest"
                >
                    <ChevronLeft size={18} className="group-hover:text-primary transition-colors" />
                    Regresar al Listado
                </motion.button>
                
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-rose-500 transition-colors">Descartar</motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={handleSave} 
                                disabled={saving} 
                                className="btn-primary"
                            >
                                <Save size={16} /> {saving ? 'Sincronizando...' : 'Actualizar Expediente'}
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <motion.button 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={handleDownloadStatement} 
                                disabled={generatingPDF}
                                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-primary shadow-sm hover:shadow-md transition-all"
                            >
                                <Printer size={20} className={generatingPDF ? 'animate-pulse' : ''} />
                            </motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.05, y: -2 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={() => setIsEditing(true)} 
                                className="btn-primary"
                            >
                                <Edit2 size={16} /> Modificar Perfil
                            </motion.button>
                        </>
                    )}
                </div>
            </div>

            {/* Profile Hero Section */}
            <motion.div variants={itemVariants} className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 hidden lg:block select-none pointer-events-none">
                    <User size={240} />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-primary/20 transition-transform group-hover:scale-105 group-hover:rotate-2">
                            {resident.name.charAt(0)}{resident.lastName?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-3 rounded-2xl shadow-lg border-4 border-white dark:border-slate-900">
                            <BadgeCheck size={24} />
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter capitalize">{resident.name} {resident.lastName}</h1>
                            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${resident.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                {resident.status === 'Active' ? 'Estatus Activo' : 'Exp expediente Inactivo'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-500 font-black text-xs uppercase tracking-widest">
                            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                <MapPin size={18} className="text-primary" /> 
                                <span>Torre {getBuildingName(resident.buildingId)} • Apt {resident.unit}</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                <Calendar size={18} className="text-secondary" />
                                <span>{resident.residentType}</span>
                            </div>
                            {resident.isDelinquent && (
                                <div className="text-rose-500 flex items-center gap-2 bg-rose-500/5 px-4 py-2 rounded-2xl border border-rose-500/10 animate-pulse">
                                    <AlertTriangle size={18} />
                                    <span>Alerta de Mora</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Information Columns */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
                    {/* Primary Data Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
                            <div className="p-3.5 bg-secondary/10 rounded-2xl text-secondary border border-secondary/20"><User size={24} /></div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none pt-1">Expediente de Identidad</h3>
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Nombres</label>
                                    <input type="text" value={editData?.name} onChange={(e) => setEditData({...editData!, name: e.target.value})} className="input-premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Apellidos</label>
                                    <input type="text" value={editData?.lastName} onChange={(e) => setEditData({...editData!, lastName: e.target.value})} className="input-premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Identificación Documentaria</label>
                                    <input type="text" value={editData?.documentId} onChange={(e) => setEditData({...editData!, documentId: e.target.value})} className="input-premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Vínculo con la Residencia</label>
                                    <select 
                                        value={editData?.residentType} 
                                        onChange={(e) => setEditData({...editData!, residentType: e.target.value as any})} 
                                        className="input-premium text-xs font-black uppercase appearance-none"
                                    >
                                        <option value="Propietario">Propietario</option>
                                        <option value="Inquilino">Inquilino</option>
                                        <option value="Familiar">Familiar</option>
                                        <option value="Administrador">Administrador</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Nacionalidad</label>
                                    <input type="text" value={editData?.nationality} onChange={(e) => setEditData({...editData!, nationality: e.target.value})} className="input-premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-text ml-1">Estatus del Perfil</label>
                                    <select 
                                        value={editData?.status} 
                                        onChange={(e) => setEditData({...editData!, status: e.target.value as any})} 
                                        className="input-premium text-xs font-black uppercase appearance-none"
                                    >
                                        <option value="Active">Activo</option>
                                        <option value="Inactive">Inactivo</option>
                                        <option value="Suspended">Suspendido</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                                <div className="space-y-2 group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Primario</p>
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-transparent group-hover:border-primary/20 transition-all">
                                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-primary shadow-sm"><Phone size={18} /></div>
                                        <p className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{resident.phone || '—'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Correo Electrónico</p>
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-transparent group-hover:border-primary/20 transition-all">
                                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-primary shadow-sm"><Mail size={18} /></div>
                                        <p className="font-black text-slate-900 dark:text-white tracking-tight">{resident.email || '—'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identidad Legal</p>
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-transparent group-hover:border-primary/20 transition-all">
                                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-emerald-500 shadow-sm"><BadgeCheck size={18} /></div>
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{resident.documentType || 'Doc'}: {resident.documentId}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Procedencia</p>
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-transparent group-hover:border-primary/20 transition-all">
                                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-rose-500 shadow-sm"><MapPin size={18} /></div>
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{resident.nationality || ' Dominicana'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Emergency Contact */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Activity size={100} /></div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-50 dark:border-slate-800 pb-4">Protocolo de Emergencia</h3>
                            {isEditing ? (
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="label-text ml-1">Nombre Responsable</label>
                                        <input type="text" placeholder="Ej: Maria Perez" value={editData?.emergencyContactName || ''} onChange={(e) => setEditData({...editData!, emergencyContactName: e.target.value})} className="input-premium" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label-text ml-1">Teléfono Directo</label>
                                        <input type="text" placeholder="809-000-0000" value={editData?.emergencyContactPhone || ''} onChange={(e) => setEditData({...editData!, emergencyContactPhone: e.target.value})} className="input-premium" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter mb-1">Contacto S.O.S</span>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{resident.emergencyContactName || 'No asignado'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-rose-500 text-white px-5 py-3 rounded-2xl w-fit shadow-lg shadow-rose-500/20">
                                        <Phone size={18} /> 
                                        <span className="font-black tracking-widest text-sm">{resident.emergencyContactPhone || '—'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Property Details */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Building2 size={100} /></div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-50 dark:border-slate-800 pb-4">Unidad Asignada</h3>
                            {isEditing ? (
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="label-text ml-1">Edificio / Torre</label>
                                        <select value={editData?.buildingId} onChange={(e) => setEditData({...editData!, buildingId: e.target.value})} className="input-premium text-[10px] font-black uppercase appearance-none">
                                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label-text ml-1">Unidad</label>
                                        <select value={editData?.unit} onChange={(e) => {
                                            const apt = apartments.find(a => a.number === e.target.value);
                                            setEditData({...editData!, unit: e.target.value, floor: apt?.floor?.toString()});
                                        }} className="input-premium text-[10px] font-black uppercase appearance-none">
                                            {apartments.filter(a => a.buildingId === editData?.buildingId).map(a => <option key={a.id} value={a.number}>Apto {a.number}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 leading-none">TORRE {getBuildingName(resident.buildingId)}</span>
                                        <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{resident.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-300 px-4 py-2 rounded-xl w-fit text-xs font-black uppercase tracking-widest shadow-lg">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        Nivel {resident.floor || '1'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Vertical Sidebar: Financials */}
                <motion.div variants={itemVariants} className="space-y-8">
                    {/* Financial Card */}
                    <div className="bg-slate-900 dark:bg-primary/10 rounded-[2.5rem] p-10 text-white border border-slate-800 dark:border-primary/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none"><Wallet size={200} /></div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 leading-none">Mantenimiento</h3>
                        
                        <div className="space-y-10 relative z-10">
                            {isEditing ? (
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Cuota RD$</label>
                                        <input 
                                            type="number" 
                                            value={editData?.maintenanceFee} 
                                            onChange={(e) => setEditData({...editData!, maintenanceFee: Number(e.target.value)})} 
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-black text-2xl outline-none focus:bg-white/10 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Tipología</label>
                                        <select 
                                            value={editData?.feeType} 
                                            onChange={(e) => setEditData({...editData!, feeType: e.target.value as any})} 
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-black uppercase text-xs outline-none appearance-none"
                                        >
                                            <option value="Fija">Fija</option>
                                            <option value="Personalizada">Personalizada</option>
                                            <option value="Exonerada">Exonerada</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-xl font-black text-primary">RD$</span>
                                        <span className="text-6xl font-black tracking-tighter leading-none">{resident.maintenanceFee?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm shadow-sm">{resident.feeType || 'Fija'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ciclo Mensual</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 border-t border-white/10 pt-10">
                                <motion.button whileHover={{ x: 5 }} onClick={handleDownloadStatement} className="w-full flex items-center justify-between group p-3 rounded-2xl hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-primary transition-colors"><Printer size={20} /></div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest">Estado Cuenta</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-1">Generar Expediente PDF</p>
                                        </div>
                                    </div>
                                </motion.button>
                                
                                <motion.button whileHover={{ x: 5 }} className="w-full flex items-center justify-between group p-3 rounded-2xl hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-emerald-500 transition-colors"><CreditCard size={20} /></div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest">Histórico Pagos</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-1">Ver Auditoría Financiera</p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/10 dark:shadow-none">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1 border-b border-slate-50 dark:border-slate-800 pb-4">Observaciones del Administrador</h3>
                        {isEditing ? (
                            <textarea 
                                value={editData?.notes || ''} 
                                onChange={(e) => setEditData({...editData!, notes: e.target.value})} 
                                className="input-premium min-h-[150px] py-4 leading-relaxed font-bold resize-none"
                                placeholder="Anotaciones administrativas..."
                            />
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed tracking-tight italic">
                                "{resident.notes || 'Ninguna observación administrativa registrada para este expediente hasta la fecha.'}"
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
