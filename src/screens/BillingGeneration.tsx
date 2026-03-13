import { useState, useEffect } from 'react';
import { RefreshCw, Play, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { getAll, add, COLLECTIONS } from '../services/dbServices';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

// Re-using/Mocking basic interfaces for the logic
interface ResidentLookup {
    id: string;
    unit: string;
    name: string;
    lastName?: string;
    status: string;
    maintenanceFee?: number;
    feeType?: string;
    billingFrequency?: string;
}

export function BillingGeneration() {
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [residents, setResidents] = useState<ResidentLookup[]>([]);
    const [existingPayments, setExistingPayments] = useState<any[]>([]);
    const { user } = useAuth();

    // Config controls
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resData, payData] = await Promise.all([
                getAll(COLLECTIONS.USERS),
                getAll(COLLECTIONS.PAYMENTS) // Need to check duplicates
            ]);
            setResidents(resData as ResidentLookup[]);
            setExistingPayments(payData || []);
        } catch (error) {
            console.error('Error fetching data for billing', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const activeResidents = residents.filter(r => r.status !== 'Inactive' && r.status !== 'Exited');

    // Find units that ALREADY have a payment generated in this period
    // Simple mock logic: checking if a payment's date starts with `selectedPeriod`
    const paymentsThisPeriod = existingPayments.filter(p => p.date?.startsWith(selectedPeriod));
    const alreadyBilledIds = paymentsThisPeriod.map(p => p.residentId).filter(Boolean);

    // Filter pending and excluded
    const pendingToBill = activeResidents.filter(r =>
        !alreadyBilledIds.includes(r.id) &&
        r.feeType !== 'Exonerada'
    );
    const excludedCount = residents.length - activeResidents.length + activeResidents.filter(r => r.feeType === 'Exonerada').length;

    const projectedAmount = pendingToBill.reduce((sum, r) => sum + (Number(r.maintenanceFee) || 0), 0);

    const handleGenerate = async () => {
        if (!window.confirm(`Se generarán ${pendingToBill.length} cuotas de mantenimiento por un total de RD$${projectedAmount.toLocaleString('en-US')}. ¿Desea continuar?`)) {
            return;
        }

        setGenerating(true);
        try {
            // Use a stable base timestamp for the batch
            const baseTs = Date.now();
            const batchId = `BATCH-${baseTs.toString().slice(-8)}`;

            // 1. Log the Batch
            await add('billing_batches', {
                batchId: batchId,
                period: selectedPeriod,
                generatedAt: new Date(baseTs).toISOString(),
                generatedBy: user?.email || 'System',
                totalGenerated: pendingToBill.length,
                totalAmount: projectedAmount,
                excludedCount: excludedCount + alreadyBilledIds.length,
                status: 'Procesado',
                type: 'Manual'
            });

            // 2. Generate Payments — filter again to be safe
            const toProcess = pendingToBill.filter(
                r => !alreadyBilledIds.includes(r.id) && r.feeType !== 'Exonerada'
            );

            for (let i = 0; i < toProcess.length; i++) {
                const r = toProcess[i];
                const amount = Number(r.maintenanceFee) || 0;
                if (!r.id) continue; // Skip if resident has no valid ID

                // Unique transactionId: base timestamp + loop index + random suffix
                const uniqueId = `INV-${batchId}-${String(i + 1).padStart(4, '0')}`;
                const dueDate = new Date(baseTs + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                await add(COLLECTIONS.PAYMENTS, {
                    transactionId: uniqueId,
                    batchId: batchId,
                    period: selectedPeriod,
                    isMaintenance: true,
                    title: `Mantenimiento ${selectedPeriod}`,
                    resident: `${r.name} ${r.lastName || ''}`.trim(),
                    residentId: r.id,          // Always populated
                    unit: r.unit || '',
                    amount: amount.toString(),
                    date: new Date(baseTs).toISOString().split('T')[0],
                    dueDate: dueDate,
                    status: 'Pendiente',
                    method: 'Por Definir'
                });

                // Notification tied to the resident's user ID
                await add('notifications', {
                    userId: r.id,
                    title: 'Boleto de Mantenimiento Emitido',
                    body: `Tu cuota de mantenimiento por RD$${amount.toLocaleString('en-US')} para el periodo ${selectedPeriod} ha sido generada. Vence el ${dueDate}.`,
                    type: 'billing',
                    read: false,
                    date: new Date(baseTs).toISOString()
                });
            }

            showToast(`¡Emisión exitosa! Se generaron ${pendingToBill.length} cuotas.`, 'success');
            fetchData(); // Reload data

        } catch (error) {
            console.error('Error in batch generation', error);
            showToast('Hubo un error al generar el lote de facturas.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Emisión Masiva de Cuotas</h1>
                    <p className="text-slate-500 dark:text-slate-400">Proyecta y genera las facturas de mantenimiento del periodo.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed' : ''} />
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || generating || pendingToBill.length === 0}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                        <span className="hidden sm:inline">{generating ? 'Procesando...' : 'Ejecutar Emisión'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Period Selector Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Periodo a Facturar</label>
                    <input
                        type="month"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white"
                    />
                </div>

                {/* Metrics */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Total Proyectado</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">RD$${projectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-sm text-slate-500 mt-1">A cobrar en esta corrida</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Pendientes de Emitir</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{pendingToBill.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Unidades listas para factura</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                            <AlertCircle size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Excluidos / Ya Emitidos</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{excludedCount + alreadyBilledIds.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Unidades ignoradas</p>
                </div>
            </div>

            {/* Preview Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Previsualización del Lote</h2>
                </div>
                <div className="overflow-x-auto h-full flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Residente</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarifa/Cuota</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción Prevista</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 font-medium">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-indigo-500" size={24} />
                                            Analizando unidades y facturas previas...
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeResidents.map(r => {
                                    const isBilled = alreadyBilledIds.includes(r.id);
                                    const isExonerated = r.feeType === 'Exonerada';
                                    let statusNode = <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">Cobrar</span>;

                                    if (isBilled) statusNode = <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold">Ignorar (Ya Emitida)</span>;
                                    else if (isExonerated) statusNode = <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-bold">Ignorar (Exonerada)</span>;

                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                Apt {r.unit || 'S/N'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 dark:text-white">{r.name} {r.lastName || ''}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900 dark:text-white">
                                                    RD$${isExonerated ? '0.00' : (r.maintenanceFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs text-slate-500">{r.feeType || 'General'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {statusNode}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

