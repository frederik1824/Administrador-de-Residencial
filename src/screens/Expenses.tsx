import React, { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, X, Receipt } from 'lucide-react';
import { getAll, add } from '../services/dbServices';
import { useAuth } from '../context/AuthContext';

interface Expense {
    id?: string;
    provider: string;
    category: string;
    description: string;
    amount: number | string;
    date: string;
    receiptUrl?: string; // Optional image/pdf link
    status: string; // 'Pagado', 'Pendiente'
    registeredBy: string;
}

export function Expenses() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Expense>({
        provider: '',
        category: 'Mantenimiento',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pagado',
        registeredBy: user?.name || 'Admin',
    });

    const categories = [
        'Mantenimiento General',
        'Jardinería y Áreas Verdes',
        'Limpieza y Conserjería',
        'Seguridad y Vigilancia',
        'Electricidad y Energía',
        'Agua y Plomería',
        'Administrativos',
        'Reparaciones Imprevistas',
        'Otros'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            // Re-using a dummy collection string 'expenses' if not in COLLECTIONS yet
            const expenseRef = 'expenses';
            const data = await getAll(expenseRef as any);

            // Sort by date descending
            const sorted = (data as Expense[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExpenses(sorted);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const expenseRef = 'expenses';
            await add(expenseRef as any, {
                ...formData,
                amount: Number(formData.amount),
                registeredBy: user?.name || 'Admin'
            });
            setIsModalOpen(false);
            setFormData({
                provider: '',
                category: 'Mantenimiento General',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                status: 'Pagado',
                registeredBy: user?.name || 'Admin',
            });
            fetchData();
        } catch (error) {
            console.error('Error saving expense', error);
            alert('Error al guardar el gasto.');
        } finally {
            setSaving(false);
        }
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Gastos y Egresos</h1>
                    <p className="text-slate-500 dark:text-slate-400">Control de pagos a proveedores y operativos.</p>
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
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary/30"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Registrar Gasto</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Egresos (Lista)</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">RD${totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar proveedor, detalle o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto h-full flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle del Gasto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha / Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-primary" size={24} />
                                            Cargando gastos...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                        No se encontraron registros de gastos.
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                {exp.description}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
                                                    {exp.category}
                                                </span>
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white">{exp.provider}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">
                                            - RD${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-900 dark:text-white">{exp.date}</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${exp.status === 'Pagado' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                                {exp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-500">{exp.registeredBy}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Gasto</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Concepto / Descripción detallada</label>
                                <input
                                    type="text" required placeholder="Ej: Compra de bombillas para pasillos Torre 1"
                                    value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Proveedor / Entidad</label>
                                    <input
                                        type="text" required placeholder="Ej: Ferretería Americana"
                                        value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                    <select
                                        value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Monto Pagado (RD$)</label>
                                    <input
                                        type="number" step="0.01" required placeholder="0.00"
                                        value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha de pago</label>
                                    <input
                                        type="date" required
                                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                <select
                                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="Pagado">Pagado</option>
                                    <option value="Pendiente">Pendiente por pagar</option>
                                </select>
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
                                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-md shadow-rose-600/20 transition-all flex items-center justify-center disabled:opacity-70 gap-2"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={18} /> : null}
                                    {saving ? 'Guardando...' : 'Registrar Salida'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
