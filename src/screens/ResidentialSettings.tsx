import { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Home, Save, RefreshCw, CreditCard, Palette, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAll, add, update, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface ResidentialSettings {
    id?: string;
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    buildingsCount: number;
    apartmentsCount: number;
    defaultFloorsPerBuilding: number;
    defaultAptsPerBuilding: number;
    apartmentTypes: string[];
    logoUrl?: string;
    imageUrl?: string;
    // Billing Settings
    billingGenerationDay: number;
    billingCycle: string;
    autoNotifyResidents: boolean;
    excludeInactiveResidents: boolean;
    defaultDueDateDays: number;
    // Late Fees
    lateFeeType: 'Fijo' | 'Porcentaje';
    lateFeeAmount: number;
}

const defaultSettings: ResidentialSettings = {
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    buildingsCount: 0,
    apartmentsCount: 0,
    defaultFloorsPerBuilding: 1,
    defaultAptsPerBuilding: 1,
    apartmentTypes: ['Standard', 'Penthouse', 'Duplex', 'Estudio'],
    logoUrl: '',
    imageUrl: '',
    billingGenerationDay: 1,
    billingCycle: 'Mensual',
    autoNotifyResidents: true,
    excludeInactiveResidents: true,
    defaultDueDateDays: 5,
    lateFeeType: 'Porcentaje',
    lateFeeAmount: 5
};

export function ResidentialSettings() {
    const [settings, setSettings] = useState<ResidentialSettings>(defaultSettings);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [docId, setDocId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'estructura', label: 'Estructura', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { id: 'finanzas', label: 'Finanzas', icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'apariencia', label: 'Apariencia', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-500/10' }
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getAll(COLLECTIONS.RESIDENTIAL_SETTINGS);

            // Should be a singleton "global" document ideally
            const globalSettings = (data.find((d: any) => d.id === 'global') || data[0]) as any;

            if (globalSettings) {
                setDocId(globalSettings.id);
                setSettings({
                    name: globalSettings.name || '',
                    address: globalSettings.address || '',
                    city: globalSettings.city || '',
                    country: globalSettings.country || '',
                    phone: globalSettings.phone || '',
                    email: globalSettings.email || '',
                    buildingsCount: globalSettings.buildingsCount || 0,
                    apartmentsCount: globalSettings.apartmentsCount || 0,
                    defaultFloorsPerBuilding: globalSettings.defaultFloorsPerBuilding || 1,
                    defaultAptsPerBuilding: globalSettings.defaultAptsPerBuilding || 1,
                    apartmentTypes: globalSettings.apartmentTypes || ['Standard', 'Penthouse', 'Duplex', 'Estudio'],
                    logoUrl: globalSettings.logoUrl || '',
                    imageUrl: globalSettings.imageUrl || '',
                    billingGenerationDay: globalSettings.billingGenerationDay || 1,
                    billingCycle: globalSettings.billingCycle || 'Mensual',
                    autoNotifyResidents: globalSettings.autoNotifyResidents !== undefined ? globalSettings.autoNotifyResidents : true,
                    excludeInactiveResidents: globalSettings.excludeInactiveResidents !== undefined ? globalSettings.excludeInactiveResidents : true,
                    defaultDueDateDays: globalSettings.defaultDueDateDays || 5,
                    lateFeeType: globalSettings.lateFeeType || 'Porcentaje',
                    lateFeeAmount: globalSettings.lateFeeAmount || 5
                });
            }
        } catch (error) {
            console.error('Failed to fetch residential settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (docId) {
                await update(COLLECTIONS.RESIDENTIAL_SETTINGS, docId, settings);
            } else {
                // Hardcode ID 'global' if supported by service, or let it generate
                const newId = await add(COLLECTIONS.RESIDENTIAL_SETTINGS, settings);
                setDocId(newId);
            }
            showToast('Configuración guardada exitosamente.');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast('Error al guardar configuración.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof ResidentialSettings, value: string | number | boolean | string[]) => {
        setSettings((prev: ResidentialSettings) => ({ ...prev, [field]: value }));
    };

    const handleAddType = () => {
        const type = window.prompt("Ingrese el nombre del nuevo tipo de apartamento (ej: Tipo A, VIP):");
        if (type && type.trim() && !settings.apartmentTypes.includes(type.trim())) {
            setSettings((prev: ResidentialSettings) => ({
                ...prev,
                apartmentTypes: [...prev.apartmentTypes, type.trim()]
            }));
        }
    };

    const handleRemoveType = (typeToRemove: string) => {
        if (window.confirm(`¿Seguro que desea eliminar el tipo "${typeToRemove}"?`)) {
            setSettings((prev: ResidentialSettings) => ({
                ...prev,
                apartmentTypes: prev.apartmentTypes.filter((t: string) => t !== typeToRemove)
            }));
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <RefreshCw className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-12 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Configuración <span className="text-primary">Maestra</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Administra el ADN de tu complejo residencial desde un solo lugar.
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/25 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Procesando...' : 'Guardar Configuración'}
                </motion.button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:w-72 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <div className={`p-2.5 rounded-2xl ${activeTab === tab.id ? tab.bg : 'bg-slate-100 dark:bg-slate-800'} ${activeTab === tab.id ? tab.color : 'text-slate-400'} transition-colors`}>
                                <tab.icon size={20} />
                            </div>
                            <span className={`text-sm font-black uppercase tracking-widest ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'general' && (
                                <div className="space-y-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Información General</h2>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Datos básicos de identidad y contacto del complejo.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Nombre del Residencial</label>
                                            <div className="relative group">
                                                <Building2 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    value={settings.name}
                                                    onChange={e => handleChange('name', e.target.value)}
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                                                    placeholder="Ej: Residencial Las Palmas"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Email de Administración</label>
                                            <div className="relative group">
                                                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="email"
                                                    value={settings.email}
                                                    onChange={e => handleChange('email', e.target.value)}
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Dirección Completa</label>
                                            <div className="relative group">
                                                <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    value={settings.address}
                                                    onChange={e => handleChange('address', e.target.value)}
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Ciudad / Provincia</label>
                                            <input
                                                type="text"
                                                value={settings.city}
                                                onChange={e => handleChange('city', e.target.value)}
                                                className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Teléfono</label>
                                            <div className="relative group">
                                                <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={settings.phone}
                                                    onChange={e => handleChange('phone', e.target.value)}
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'estructura' && (
                                <div className="space-y-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Métricas Estructurales</h2>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Define la capacidad y organización física.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-4">Unidades de Edificación</label>
                                            <div className="flex items-center gap-6">
                                                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500"><Building2 size={24} /></div>
                                                <div className="flex-1">
                                                    <input
                                                        type="number"
                                                        value={settings.buildingsCount}
                                                        onChange={e => handleChange('buildingsCount', parseInt(e.target.value) || 0)}
                                                        className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none"
                                                        min="1" required
                                                    />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Edificios</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-4">Densidad Habitacional</label>
                                            <div className="flex items-center gap-6">
                                                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><Home size={24} /></div>
                                                <div className="flex-1">
                                                    <input
                                                        type="number"
                                                        value={settings.apartmentsCount}
                                                        onChange={e => handleChange('apartmentsCount', parseInt(e.target.value) || 0)}
                                                        className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none"
                                                        min="1" required
                                                    />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Apartamentos</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Pisos (Promedio)</label>
                                            <input
                                                type="number"
                                                value={settings.defaultFloorsPerBuilding}
                                                onChange={e => handleChange('defaultFloorsPerBuilding', parseInt(e.target.value) || 1)}
                                                className="w-full bg-transparent text-xl font-black text-slate-900 dark:text-white outline-none mt-2"
                                                min="1" required
                                            />
                                        </div>

                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Aptos/Edif (Promedio)</label>
                                            <input
                                                type="number"
                                                value={settings.defaultAptsPerBuilding}
                                                onChange={e => handleChange('defaultAptsPerBuilding', parseInt(e.target.value) || 1)}
                                                className="w-full bg-transparent text-xl font-black text-slate-900 dark:text-white outline-none mt-2"
                                                min="1" required
                                            />
                                        </div>

                                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipificación de Unidades</h3>
                                                <button type="button" onClick={handleAddType} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">+ Agregar Tipo</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {settings.apartmentTypes.map((type: string, idx: number) => (
                                                    <motion.span 
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        key={idx} 
                                                        className="inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 shadow-sm"
                                                    >
                                                        {type}
                                                        <button onClick={() => handleRemoveType(type)} className="p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors">&times;</button>
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'finanzas' && (
                                <div className="space-y-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reglas de Negocio</h2>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Configura el comportamiento automatizado de cobros y moras.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Día de Facturación</label>
                                                <select
                                                    value={settings.billingGenerationDay}
                                                    onChange={e => handleChange('billingGenerationDay', parseInt(e.target.value))}
                                                    className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-3xl outline-none text-sm font-black text-slate-900 dark:text-white appearance-none"
                                                >
                                                    {[...Array(28)].map((_, i) => <option key={i+1} value={i+1}>Día {i+1} de cada mes</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prórroga de Vencimiento</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={settings.defaultDueDateDays}
                                                        onChange={e => handleChange('defaultDueDateDays', parseInt(e.target.value) || 0)}
                                                        className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-3xl outline-none text-sm font-black text-slate-900 dark:text-white transition-all shadow-inner"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Días</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-6 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><CreditCard size={18} /></div>
                                                <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Política de Moras</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex gap-2">
                                                    {['Porcentaje', 'Fijo'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => handleChange('lateFeeType', type)}
                                                            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                settings.lateFeeType === type 
                                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                                                : 'bg-white dark:bg-slate-800 text-slate-400'
                                                            }`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-indigo-500">{settings.lateFeeType === 'Fijo' ? '$' : '%'}</span>
                                                    <input
                                                        type="number"
                                                        value={settings.lateFeeAmount}
                                                        onChange={e => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl outline-none text-xl font-black text-indigo-600 dark:text-indigo-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-4 pt-6 mt-2">
                                            <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between border border-slate-100 dark:border-slate-800/50">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Push Notifications Automático</p>
                                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Alertar vía App Mobile al emitir cuotas.</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleChange('autoNotifyResidents', !settings.autoNotifyResidents)}
                                                    className={`w-14 h-8 rounded-full transition-all relative ${settings.autoNotifyResidents ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settings.autoNotifyResidents ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'apariencia' && (
                                <div className="space-y-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identidad Visual</h2>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Personaliza cómo se ve el residencial para los inquilinos.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">URL del Logo</label>
                                                <input
                                                    type="url"
                                                    value={settings.logoUrl}
                                                    onChange={e => handleChange('logoUrl', e.target.value)}
                                                    className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-3xl outline-none text-sm font-medium text-slate-900 dark:text-white"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            {settings.logoUrl && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                    <img src={settings.logoUrl} alt="Logo" className="max-h-24 object-contain" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Imagen de Fachada</label>
                                                <input
                                                    type="url"
                                                    value={settings.imageUrl}
                                                    onChange={e => handleChange('imageUrl', e.target.value)}
                                                    className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-3xl outline-none text-sm font-medium text-slate-900 dark:text-white"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            {settings.imageUrl && (
                                                <div className="h-48 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg">
                                                    <img src={settings.imageUrl} alt="Fachada" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
