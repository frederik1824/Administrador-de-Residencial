import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { getAll, update, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Ticket {
    id: string; // doc id
    ticketId?: string;
    resident: string;
    unit: string;
    issue: string;
    priority: string;
    status: string;
    date: string;
    description?: string;
}

export function Maintenance() {
    const [searchTerm, setSearchTerm] = useState('');
    const [requests, setRequests] = useState<Ticket[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [updating, setUpdating] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getAll(COLLECTIONS.TICKETS);
            // sort by date assuming YYYY-MM-DD or parseable dates
            const sortedData = (data as Ticket[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRequests(sortedData);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = requests.filter(req =>
        req.issue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.resident?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.includes(searchTerm)
    );

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedTicket) return;
        setUpdating(true);
        try {
            await update(COLLECTIONS.TICKETS, selectedTicket.id, { status: newStatus });
            showToast(`Ticket marcado como ${newStatus.toLowerCase()}.`);
            setSelectedTicket(null);
            fetchRequests();
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Error al actualizar el estado del ticket.', 'error');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Mantenimientos (PQRs)</h1>
                    <p className="text-slate-500 dark:text-slate-400">Atiende las solicitudes y reportes de los residentes.</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                    title="Recargar"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed' : ''} />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por asunto o residente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white shadow-sm"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                    <Filter size={18} />
                    <span>Filtros</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto h-full min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asunto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitante</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-primary" size={24} />
                                            Cargando reportes...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No se encontraron reportes.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700 dark:text-slate-400 text-sm">
                                                {req.ticketId || `REQ-${req.id.substring(0, 5).toUpperCase()}`}
                                            </span>
                                            <p className="text-xs text-slate-400 mt-1">{req.date}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white">{req.issue}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{req.resident}</p>
                                            <p className="text-xs text-slate-500">Unidad: {req.unit}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${req.priority === 'Alta' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                                    req.priority === 'Media' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                }`}>
                                                {req.priority || 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${req.status === 'Completado' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                                                    req.status === 'En Progreso' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                        'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                                }`}>
                                                {req.status || 'Abierto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedTicket(req)}
                                                className="text-primary hover:text-blue-600 font-medium text-sm transition-colors"
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ticket Details Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !updating && setSelectedTicket(null)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Ticket {selectedTicket.ticketId || `REQ-${selectedTicket.id.substring(0, 5).toUpperCase()}`}
                            </h3>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                disabled={updating}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Solicitante</p>
                                    <p className="text-slate-900 dark:text-white">{selectedTicket.resident}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Unidad</p>
                                    <p className="text-slate-900 dark:text-white">{selectedTicket.unit}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Fecha</p>
                                    <p className="text-slate-900 dark:text-white">{selectedTicket.date}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Prioridad</p>
                                    <p className="text-slate-900 dark:text-white">{selectedTicket.priority}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Asunto</p>
                                <p className="text-slate-900 dark:text-white font-medium">{selectedTicket.issue}</p>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Descripción detallada</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {selectedTicket.description || 'No se proporcionó una descripción adicional.'}
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800 my-4" />

                            <div className="flex flex-col gap-2 pt-2">
                                <p className="text-sm font-semibold text-slate-500 mb-2">Cambiar Estado:</p>
                                <div className="flex gap-3">
                                    {selectedTicket.status !== 'Abierto' && (
                                        <button
                                            onClick={() => handleUpdateStatus('Abierto')}
                                            disabled={updating}
                                            className="flex-1 py-2 text-sm font-medium border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                        >
                                            Marcar Abierto
                                        </button>
                                    )}
                                    {selectedTicket.status !== 'En Progreso' && (
                                        <button
                                            onClick={() => handleUpdateStatus('En Progreso')}
                                            disabled={updating}
                                            className="flex-1 py-2 text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                                        >
                                            En Progreso
                                        </button>
                                    )}
                                    {selectedTicket.status !== 'Completado' && (
                                        <button
                                            onClick={() => handleUpdateStatus('Completado')}
                                            disabled={updating}
                                            className="flex-1 py-2 text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                                        >
                                            Completado
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
