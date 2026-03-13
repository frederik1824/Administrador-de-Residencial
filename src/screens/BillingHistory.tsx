import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Layers } from 'lucide-react';
import { getAll } from '../services/dbServices';

interface BillingBatch {
    id: string; // Firebase format docs add `id`
    batchId: string;
    period: string;
    generatedAt: string;
    generatedBy: string;
    totalGenerated: number;
    totalAmount: number;
    excludedCount: number;
    status: string;
    type: string;
}

export function BillingHistory() {
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState<BillingBatch[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Collection 'billing_batches' was created on the fly in handleGenerate
            const data = await getAll('billing_batches');

            // Sort by generatedAt descending
            const sorted = (data as BillingBatch[]).sort((a, b) => {
                return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
            });

            setBatches(sorted);
        } catch (error) {
            console.error('Failed to fetch billing batches', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = batches.filter(b =>
        b.period.includes(searchTerm) ||
        b.batchId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Historial de Emisiones</h1>
                    <p className="text-slate-500 dark:text-slate-400">Auditoría y trazabilidad de facturación masiva.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchHistory}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por periodo o Lote ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Filter size={18} />
                    <span>Filtros</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="overflow-x-auto h-full flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lote e Identificador</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Periodo</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha Generación</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Monto Total</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Cuotas Validables</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-primary" size={24} />
                                            Cargando historial...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredBatches.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                        No hay emisiones masivas registradas.
                                    </td>
                                </tr>
                            ) : (
                                filteredBatches.map(batch => (
                                    <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                                    <Layers size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{batch.batchId}</p>
                                                    <p className="text-xs text-slate-500">Por: {batch.generatedBy}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-sm">
                                                {batch.period}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {new Date(batch.generatedAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(batch.generatedAt).toLocaleTimeString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                ${(batch.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="text-center">
                                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{batch.totalGenerated}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Generadas</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-slate-400">{batch.excludedCount}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Excluidas</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
