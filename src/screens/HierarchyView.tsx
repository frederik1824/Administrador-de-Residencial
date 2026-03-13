import { useState, useEffect } from 'react';
import { Network, Building2, Building, DoorOpen, Users, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { getAll, COLLECTIONS } from '../services/dbServices';

export function HierarchyView() {
    const [loading, setLoading] = useState(true);
    const [residentialName, setResidentialName] = useState('Residencial');
    const [buildings, setBuildings] = useState<any[]>([]);
    const [apartments, setApartments] = useState<any[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
    const [expandedApartments, setExpandedApartments] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchHierarchyData();
    }, []);

    const fetchHierarchyData = async () => {
        setLoading(true);
        try {
            const [settingsData, bldgsData, aptsData, resData] = await Promise.all([
                getAll(COLLECTIONS.RESIDENTIAL_SETTINGS),
                getAll(COLLECTIONS.BUILDINGS),
                getAll(COLLECTIONS.APARTMENTS),
                getAll(COLLECTIONS.USERS)
            ]);

            const globalSettings = (settingsData.find((d: any) => d.id === 'global') || settingsData[0]) as any;
            if (globalSettings?.name) {
                setResidentialName(globalSettings.name);
            }

            setBuildings(bldgsData);
            setApartments(aptsData);
            setResidents(resData);

            // Auto-expand first building
            if (bldgsData.length > 0) {
                setExpandedBuildings({ [bldgsData[0].id]: true });
            }
        } catch (error) {
            console.error('Failed to fetch hierarchy data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBuilding = (id: string) => {
        setExpandedBuildings(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleApartment = (id: string) => {
        setExpandedApartments(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Network className="text-primary" size={32} />
                        Vista Jerárquica
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Estructura completa del residencial desde edificios hasta residentes.
                    </p>
                </div>
                <button
                    onClick={fetchHierarchyData}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                    title="Recargar"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed text-primary' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
                    <RefreshCw className="animate-spin text-primary mb-4" size={40} />
                    <p className="text-slate-500 font-medium">Construyendo la vista jerárquica...</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 overflow-x-auto">
                    {/* Level 1: Residential */}
                    <div className="mb-2">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-fit pr-8">
                            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h2 className="font-black text-lg text-slate-900 dark:text-white">{residentialName}</h2>
                                <p className="text-xs text-slate-500 font-medium">Nivel Raíz</p>
                            </div>
                        </div>

                        {/* Level 2: Buildings */}
                        <div className="ml-6 pl-4 border-l-2 border-slate-200 dark:border-slate-700 mt-4 space-y-4">
                            {buildings.length === 0 ? (
                                <p className="text-sm text-slate-400 italic py-2">No hay edificios registrados.</p>
                            ) : (
                                buildings.map(building => {
                                    const bApts = apartments.filter(a => a.buildingId === building.id);
                                    const isExpandedB = expandedBuildings[building.id];

                                    return (
                                        <div key={building.id} className="relative">
                                            {/* Building Node */}
                                            <div
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isExpandedB ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-500'}`}
                                                onClick={() => toggleBuilding(building.id)}
                                            >
                                                <button className="text-slate-400 hover:text-primary transition-colors">
                                                    {isExpandedB ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </button>
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center">
                                                    <Building size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Edificio {building.name}</h3>
                                                    <p className="text-xs text-slate-500">{bApts.length} apartamento(s)</p>
                                                </div>
                                            </div>

                                            {/* Level 3: Apartments */}
                                            {isExpandedB && (
                                                <div className="ml-8 pl-4 border-l-2 border-slate-100 dark:border-slate-800 mt-3 space-y-3">
                                                    {bApts.length === 0 ? (
                                                        <p className="text-sm text-slate-400 italic py-1">No hay apartamentos en este edificio.</p>
                                                    ) : (
                                                        bApts.map(apt => {
                                                            const aptResidents = residents.filter(r => (apt.residentIds || []).includes(r.id));
                                                            const isExpandedA = expandedApartments[apt.id];

                                                            return (
                                                                <div key={apt.id} className="relative">
                                                                    {/* Apartment Node */}
                                                                    <div
                                                                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${isExpandedA ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-500/30' : 'bg-white border-slate-100 hover:border-emerald-200 dark:bg-slate-800/40 dark:border-slate-700/50 dark:hover:border-slate-600'}`}
                                                                        onClick={() => toggleApartment(apt.id)}
                                                                    >
                                                                        <button className="text-slate-400 hover:text-emerald-500 transition-colors">
                                                                            {isExpandedA ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                                        </button>
                                                                        <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center">
                                                                            <DoorOpen size={16} />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Apto {apt.number}</h4>
                                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{apt.type} • {aptResidents.length} ocupantes</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Level 4: Residents */}
                                                                    {isExpandedA && (
                                                                        <div className="ml-8 pl-4 border-l border-slate-100 dark:border-slate-800 mt-2 space-y-2 mb-4">
                                                                            {aptResidents.length === 0 ? (
                                                                                <p className="text-xs text-slate-400 italic">Unidad sin residentes asignados.</p>
                                                                            ) : (
                                                                                aptResidents.map(res => (
                                                                                    <div key={res.id} className="flex items-center gap-3 p-2 bg-slate-50/50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800/80">
                                                                                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center">
                                                                                            <Users size={12} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                                                {res.name} {res.lastName || ''}
                                                                                            </p>
                                                                                            <p className="text-[10px] text-slate-500">{res.residentType || 'Propietario'}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
