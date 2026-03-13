import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Download, Filter, Eye, Plus, RefreshCw, 
    X, Clock, FileText, Wallet, Receipt,
    AlertTriangle, CheckCircle2
} from 'lucide-react';
import { getAll, add, update, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Payment {
    id?: string;
    transactionId: string;
    resident: string;
    residentId?: string;
    unit: string;
    title: string;
    amount: string | number;
    date: string;
    status: string;
    method: string;
    period?: string;
    batchId?: string;
    isMaintenance?: boolean;
    dueDate?: string;
    isLateFee?: boolean;
    relatedPaymentId?: string;
    proofUrl?: string;
    paymentSubmittedAt?: string;
    rejectionReason?: string;
}

interface ResidentLookup {
    id: string;
    name: string;
    lastName?: string;
    unit: string;
    maintenanceFee?: number;
    feeType?: string;
}

export function Payments() {
    const [searchTerm, setSearchTerm] = useState('');
    const [payments, setPayments] = useState<Payment[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [residents, setResidents] = useState<ResidentLookup[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const [formData, setFormData] = useState<Payment>({
        transactionId: '',
        title: '',
        resident: '',
        residentId: '',
        unit: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pendiente',
        method: 'Transferencia'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [paymentsData, residentsData] = await Promise.all([
                getAll(COLLECTIONS.PAYMENTS),
                getAll(COLLECTIONS.USERS)
            ]);

            const sortedPayments = (paymentsData as Payment[]).sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            setPayments(sortedPayments);
            const activeResidents = (residentsData as ResidentLookup[]).filter(r => (r as any).status !== 'Inactive' && (r as any).status !== 'Exited');
            setResidents(activeResidents);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAuditLateFees = async () => {
        if (!window.confirm("¿Ejecutar auditoría de moras? \n\nEsto verificará todas las cuotas de mantenimiento vencidas y les aplicará el cargo por mora configurado en los Ajustes del Residencial.")) {
            return;
        }

        setLoading(true);
        try {
            const [settingsData, paymentsData] = await Promise.all([
                getAll(COLLECTIONS.RESIDENTIAL_SETTINGS),
                getAll(COLLECTIONS.PAYMENTS)
            ]);

            const settings = (settingsData.find((d: any) => d.id === 'global') || settingsData[0] || {}) as any;
            const currentPayments = paymentsData as Payment[];

            let generatedCount = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const pendingInvoices = currentPayments.filter(p =>
                (p.status === 'Pendiente' || p.status === 'Vencido') && p.isMaintenance
            );

            for (const invoice of pendingInvoices) {
                let dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
                if (!dueDate) {
                    dueDate = new Date(invoice.date);
                    dueDate.setDate(dueDate.getDate() + (settings.defaultDueDateDays || 5));
                }

                if (today > dueDate) {
                    const alreadyPenalized = currentPayments.some(p => p.relatedPaymentId === invoice.id);

                    if (!alreadyPenalized) {
                        const originalAmount = typeof invoice.amount === 'number' ? invoice.amount : parseFloat(String(invoice.amount).replace(/[^0-9.-]+/g, "") || "0");
                        let penaltyAmount = settings.lateFeeAmount || 0;

                        if (settings.lateFeeType === 'Porcentaje') {
                            penaltyAmount = (originalAmount * (settings.lateFeeAmount || 5)) / 100;
                        }

                        if (penaltyAmount > 0) {
                            await add(COLLECTIONS.PAYMENTS, {
                                transactionId: `MORA-${Math.floor(Math.random() * 100000)}`,
                                title: `Recargo por Mora - Lote ${invoice.batchId || ''} (${invoice.period || ''})`.trim(),
                                resident: invoice.resident,
                                residentId: invoice.residentId,
                                unit: invoice.unit,
                                amount: penaltyAmount.toFixed(2),
                                date: new Date().toISOString().split('T')[0],
                                dueDate: new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                                status: 'Pendiente',
                                method: 'Sistema',
                                isMaintenance: false,
                                isLateFee: true,
                                relatedPaymentId: invoice.id
                            });

                            generatedCount++;
                        }

                        if (invoice.status === 'Pendiente') {
                            await update(COLLECTIONS.PAYMENTS, invoice.id!, {
                                status: 'Vencido'
                            });
                        }
                    }
                }
            }

            showToast(`Auditoría de moras completada. Se generaron ${generatedCount} cargos.`);
            fetchData();
        } catch (error) {
            console.error('Error auditing late fees:', error);
            showToast('Hubo un error al ejecutar la auditoría de moras.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const ts = Date.now();
            const uniqueId = formData.transactionId || `TRX-${ts}-${Math.floor(Math.random() * 9000 + 1000)}`;
            // Derive period (YYYY-MM) from the emission date so it appears in period-based searches
            const period = formData.date ? formData.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
            await add(COLLECTIONS.PAYMENTS, {
                ...formData,
                transactionId: uniqueId,
                title: formData.title || 'Mantenimiento General',
                period: period,
                isMaintenance: true,
                createdAt: new Date(ts).toISOString()
            });
            showToast('Factura emitida exitosamente.');
            setFormData({ transactionId: '', title: '', resident: '', residentId: '', unit: '', amount: '', date: new Date().toISOString().split('T')[0], status: 'Pendiente', method: 'Transferencia' });
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            showToast('Error al guardar el pago.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleValidatePayment = async (status: 'Pagado' | 'Pendiente' | 'Rechazado', reason?: string) => {
        if (!selectedPayment) return;
        setSaving(true);
        try {
            await update(COLLECTIONS.PAYMENTS, selectedPayment.id!, {
                status: status,
                method: status === 'Pagado' ? (selectedPayment.method || 'Manual (Admin)') : selectedPayment.method,
                paymentApprovedAt: status === 'Pagado' ? new Date().toISOString() : null,
                rejectionReason: status === 'Rechazado' ? reason : null
            });
            setSelectedPayment(null);
            setShowRejectionModal(false);
            setRejectionReason('');
            showToast(`Pago ${status === 'Pagado' ? 'aprobado' : status.toLowerCase()} correctamente.`);
            fetchData();
        } catch (error) {
            showToast('Error al validar pago.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredPayments = payments.filter(tx =>
        tx.resident?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.period?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.batchId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <Wallet size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Finanzas</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Flujo de <span className="text-primary">Efectivo</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-tight">Administra los ingresos, facturas y reportes de pago de la comunidad.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAuditLateFees}
                        className="group flex items-center gap-2 px-5 py-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Auditar Moras
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/30"
                    >
                        <Plus size={18} />
                        Nueva Factura
                    </motion.button>
                </div>
            </div>

            {/* Quick Filter/Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {[
                    { label: 'Ingresos Mensuales', value: '$245k', color: 'text-emerald-500', bg: 'bg-emerald-500/5', icon: Receipt },
                    { label: 'Pagos Pendientes', value: payments.filter(p => p.status === 'Pendiente').length, color: 'text-amber-500', bg: 'bg-amber-500/5', icon: Clock },
                    { label: 'Unidades en Mora', value: payments.filter(p => p.status === 'Vencido').length, color: 'text-rose-500', bg: 'bg-rose-500/5', icon: AlertTriangle },
                    { label: 'Pagos del Mes', value: payments.filter(p => p.status === 'Pagado').length, color: 'text-primary', bg: 'bg-primary/5', icon: CheckCircle2 },
                ].map((stat, idx) => (
                    <motion.div 
                        key={idx}
                        variants={itemVariants}
                        className={`${stat.bg} p-5 rounded-[2rem] border border-white dark:border-slate-800/40 flex items-center justify-between group cursor-default shadow-sm hover:scale-[1.02] transition-transform`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color} dark:text-white tracking-tighter`}>{stat.value}</p>
                        </div>
                        <div className={`p-2.5 rounded-2xl ${stat.bg.replace('/5', '/10')} ${stat.color} group-hover:rotate-12 transition-transform`}>
                            <stat.icon size={20} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter and Search Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/40 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 backdrop-blur-md relative z-10">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por residente, unidad o ID de transacción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium dark:text-white transition-all shadow-inner shadow-slate-50 dark:shadow-none"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <Filter size={14} /> Filtros
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <Download size={14} /> PDF
                    </motion.button>
                </div>
            </motion.div>

            {/* Table Area */}
            <motion.div 
                variants={itemVariants}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[2.5rem] shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden relative z-10"
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Concepto</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Residente</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <RefreshCw className="animate-spin text-primary/30 mx-auto" size={40} />
                                        </td>
                                    </motion.tr>
                                ) : filteredPayments.length === 0 ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No se encontraron pagos</p>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredPayments.map((tx, index) => (
                                        <motion.tr 
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            key={tx.id || index}
                                            className="hover:bg-slate-50/30 dark:hover:bg-primary/5 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 dark:text-white tracking-tight">{tx.title}</span>
                                                        {tx.isMaintenance && <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-lg uppercase tracking-widest">Cuota</span>}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">{tx.transactionId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-slate-700 dark:text-slate-200 text-sm tracking-tight">{tx.resident}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Unidad {tx.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-primary text-sm">RD$ {tx.amount}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tx.date}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                    tx.status === 'Pagado' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                    tx.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-500' :
                                                    tx.status === 'En Verificación' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                                                }`}>
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        tx.status === 'Pagado' ? 'bg-emerald-500' : 
                                                        tx.status === 'Pendiente' ? 'bg-amber-500' : 'bg-rose-500'
                                                    } ${tx.status === 'En Verificación' ? 'animate-pulse bg-blue-500' : ''}`}></div>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setSelectedPayment(tx)}
                                                    className="p-2.5 text-slate-400 hover:text-primary bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm transition-all"
                                                >
                                                    <Eye size={18} />
                                                </motion.button>
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
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                        <Plus size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Emisión de Cobro</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
                            </div>
                            
                            <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto de Facturación</label>
                                    <input
                                        type="text" required
                                        value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                        placeholder="Ej: Mantenimiento de Áreas Verdes"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Seleccionar Residente</label>
                                    <select
                                        value={formData.residentId} required
                                        onChange={(e) => {
                                            const r = residents.find(res => res.id === e.target.value);
                                            if (r) setFormData({...formData, residentId: r.id, resident: `${r.name} ${r.lastName || ''}`, unit: r.unit, amount: r.maintenanceFee || ''});
                                        }}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                    >
                                        <option value="">Buscar en la comunidad...</option>
                                        {residents.map(r => <option key={r.id} value={r.id}>{r.name} - Apt {r.unit}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Importe (RD$)</label>
                                        <input
                                            type="number" required
                                            value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-black text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Emisión</label>
                                        <input
                                            type="date" required
                                            value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                        />
                                    </div>
                                </div>
                            </form>
                            
                            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-4 rounded-b-[2.5rem]">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAddPayment}
                                    disabled={saving}
                                    className="px-10 py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                                >
                                    Emitir Factura
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Details Modal (Simplified for the brief) */}
            <AnimatePresence>
                {selectedPayment && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedPayment(null)}></motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800 flex flex-col md:flex-row h-[500px]">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 p-8 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800">
                                {selectedPayment.proofUrl ? (
                                    <img src={selectedPayment.proofUrl} className="w-full h-full object-contain rounded-2xl shadow-lg" alt="Comprobante" />
                                ) : (
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[28px] flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700 shadow-sm"><FileText size={32} className="text-slate-300" /></div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin Comprobante Digital</p>
                                    </div>
                                )}
                            </div>
                            <div className="w-full md:w-72 p-8 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Información de Operación</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium tracking-tight">Monto Total</span><span className="font-black text-primary">RD$ {selectedPayment.amount}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium tracking-tight">Unidad</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedPayment.unit}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium tracking-tight">Estado</span><span className="text-[10px] font-black uppercase text-secondary">{selectedPayment.status}</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {selectedPayment.status !== 'Pagado' && (
                                        <div className="space-y-3">
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleValidatePayment('Pagado')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">Aprobar Pago</motion.button>
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowRejectionModal(true)} className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest">Rechazar Pago</motion.button>
                                        </div>
                                    )}
                                    <button onClick={() => setSelectedPayment(null)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cerrar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rejection Modal */}
            <AnimatePresence>
                {showRejectionModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRejectionModal(false)}></motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white dark:border-slate-800">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Motivo de Rechazo</h3>
                            </div>
                            <div className="p-8 space-y-4">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Indica al residente el motivo por el cual el comprobante no es válido.</p>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Ej: El comprobante no coincide con el monto o la fecha es incorrecta."
                                    className="w-full h-32 px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border-none text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
                                />
                            </div>
                            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex gap-4">
                                <button onClick={() => setShowRejectionModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
                                <button 
                                    onClick={() => handleValidatePayment('Rechazado', rejectionReason)}
                                    disabled={!rejectionReason.trim()}
                                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                >
                                    Confirmar Rechazo
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
