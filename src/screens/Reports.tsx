import { useState, useEffect } from 'react';
import {
    Download,
    TrendingUp,
    TrendingDown,
    Users,
    AlertCircle,
    Calendar
} from 'lucide-react';
import { getAll, COLLECTIONS } from '../services/dbServices';
import { exportToCSV } from '../utils/exportGenerator';

export function Reports() {
    const [isLoading, setIsLoading] = useState(true);

    // Core data
    const [payments, setPayments] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    // Analytics state
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [defaulters, setDefaulters] = useState<any[]>([]);

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState<string>(
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` // YYYY-MM
    );

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedPayments, fetchedExpenses, fetchedUsers] = await Promise.all([
                getAll(COLLECTIONS.PAYMENTS),
                getAll(COLLECTIONS.EXPENSES),
                getAll(COLLECTIONS.USERS)
            ]);

            setPayments(fetchedPayments);
            setExpenses(fetchedExpenses);

            processReports(fetchedPayments, fetchedExpenses, fetchedUsers, selectedMonth);
        } catch (error) {
            console.error('Error fetching data for reports', error);
        } finally {
            setIsLoading(false);
        }
    };

    const processReports = (allPayments: any[], allExpenses: any[], allUsers: any[], monthFilter: string) => {
        // 1. Calculate Income (Paid invoices mapping to the selected month)
        // Since invoices might have `date` or `period`, let's check `period` primarily, fallback to `date`
        const incomeThisMonth = allPayments.filter(p => {
            if (p.status !== 'Pagado') return false;
            if (p.period === monthFilter) return true;
            if (p.date && p.date.startsWith(monthFilter)) return true;
            // Fallback: check if paid At was in this month
            if (p.paidAt && typeof p.paidAt.toDate === 'function') {
                const paidString = p.paidAt.toDate().toISOString().substring(0, 7);
                if (paidString === monthFilter) return true;
            }
            return false;
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        setTotalIncome(incomeThisMonth);

        // 2. Calculate Expenses
        const expensesThisMonth = allExpenses.filter(e => {
            if (e.date && typeof e.date === 'string' && e.date.startsWith(monthFilter)) return true;
            if (e.createdAt && typeof e.createdAt.toDate === 'function') {
                const createdString = e.createdAt.toDate().toISOString().substring(0, 7);
                if (createdString === monthFilter) return true;
            }
            return false;
        }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        setTotalExpenses(expensesThisMonth);

        // 3. Top Defaulters (Morosos)
        // Defaulters are users who have multiple 'Pendiente' or 'Vencido' invoices
        const userDebtMap: Record<string, { name: string, unit: string, totalDebt: number, overdueCount: number }> = {};

        allPayments.forEach(p => {
            if (p.status === 'Pendiente' || p.status === 'Vencido') {
                const amount = Number(p.amount) || 0;
                // If the invoice is strictly from a past period and not paid
                const isOverdue = p.status === 'Vencido' ||
                    (p.dueDate && new Date(p.dueDate) < new Date());

                if (isOverdue) {
                    const uid = p.residentId || p.resident;
                    if (uid) {
                        if (!userDebtMap[uid]) {
                            const foundUser = allUsers.find(u => u.id === uid || u.name === p.resident);
                            userDebtMap[uid] = {
                                name: foundUser?.name || p.resident || 'Desconocido',
                                unit: foundUser?.unit || foundUser?.apartment || 'N/A',
                                totalDebt: 0,
                                overdueCount: 0
                            };
                        }
                        userDebtMap[uid].totalDebt += amount;
                        userDebtMap[uid].overdueCount += 1;
                    }
                }
            }
        });

        const sortedDefaulters = Object.values(userDebtMap).sort((a, b) => b.totalDebt - a.totalDebt);
        setDefaulters(sortedDefaulters);
    };

    const handleExportDefaulters = () => {
        if (!defaulters.length) return;

        const exportData = defaulters.map((d, index) => ({
            'Ranking': index + 1,
            'Residente': d.name,
            'Unidad': d.unit,
            'Deuda Total ($)': d.totalDebt.toFixed(2),
            'Cuotas Atrasadas': d.overdueCount
        }));

        exportToCSV(exportData, `Reporte_Morosidad_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportCashFlow = () => {
        // Flatten expenses and income for the selected month to export a ledger-style CSV
        const ledger: any[] = [];

        payments.forEach(p => {
            if (p.status === 'Pagado' && (p.period === selectedMonth || (p.date && p.date.startsWith(selectedMonth)))) {
                ledger.push({
                    'Fecha': p.date || p.period || 'N/A',
                    'Tipo': 'Ingreso',
                    'Concepto': p.description || 'Cuota',
                    'Residente/Proveedor': p.resident || 'N/A',
                    'Monto ($)': Number(p.amount).toFixed(2)
                });
            }
        });

        expenses.forEach(e => {
            if (e.date?.startsWith(selectedMonth)) {
                ledger.push({
                    'Fecha': e.date,
                    'Tipo': 'Egreso',
                    'Concepto': e.category || 'Gasto Operativo',
                    'Residente/Proveedor': e.provider || 'N/A',
                    'Monto ($)': `-${Number(e.amount).toFixed(2)}`
                });
            }
        });

        exportToCSV(ledger, `Flujo_Caja_${selectedMonth}`);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const netFlow = totalIncome - totalExpenses;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        Reportes Avanzados
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Análisis financiero, histórico de morosidad y proyecciones.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm font-medium text-slate-700 dark:text-slate-300"
                        />
                    </div>
                </div>
            </div>

            {/* Cash Flow Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp size={64} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        Ingresos Reales ({selectedMonth})
                    </p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                        ${totalIncome.toFixed(2)}
                    </h3>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-300">
                        <TrendingDown size={64} className="text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <TrendingDown size={16} className="text-red-500" />
                        Egresos Operativos ({selectedMonth})
                    </p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                        ${totalExpenses.toFixed(2)}
                    </h3>
                </div>

                <div className={`rounded-2xl p-6 border shadow-sm relative overflow-hidden group ${netFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'}`}>
                    <p className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        Flujo de Caja Neto
                    </p>
                    <h3 className={`text-3xl font-black mt-2 ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${netFlow.toFixed(2)}
                    </h3>
                    <button
                        onClick={handleExportCashFlow}
                        className="mt-4 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors border border-black/5 dark:border-white/5"
                    >
                        <Download size={16} />
                        Exportar Flujo a CSV
                    </button>
                </div>
            </div>

            {/* Top Defaulters Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top Morosos</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Residentes con deuda acumulada pendiente o vencida</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportDefaulters}
                        disabled={defaulters.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={18} />
                        Exportar a CSV
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Residente / Unidad</th>
                                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuotas Vencidas</th>
                                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Deuda Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {defaulters.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        No hay residentes morosos detectados. ¡Excelente trabajo!
                                    </td>
                                </tr>
                            ) : (
                                defaulters.map((d, index) => (
                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Users size={12} /> {d.unit}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                {d.overdueCount} cuotas
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-black text-red-600 dark:text-red-400">
                                                ${d.totalDebt.toFixed(2)}
                                            </span>
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
