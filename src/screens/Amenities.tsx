import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Plus, RefreshCw, X, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import { getAll, add, update, remove, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Reservation {
    id: string; // doc id
    reservationId: string;
    resident: string;
    amenity: string;
    date: string;
    time: string;
    status: string;
}

interface Amenity {
    id: string;
    name: string;
    capacity: string;
    hours: string;
    price: string;
    image: string;
}

export function Amenities() {
    const [activeTab, setActiveTab] = useState('Pendientes');
    const [viewMode, setViewMode] = useState<'reservations' | 'amenities'>('reservations');
    
    // Reservation States
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Amenity States
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [editingAmenityId, setEditingAmenityId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        resident: '',
        amenity: '',
        date: '',
        startTime: '',
        endTime: '',
        status: 'Pendiente'
    });

    const [amenityFormData, setAmenityFormData] = useState({
        name: '',
        capacity: '',
        hours: '',
        price: '',
        image: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resData, amenData] = await Promise.all([
                getAll(COLLECTIONS.RESERVATIONS),
                getAll(COLLECTIONS.AMENITIES)
            ]);
            setReservations(resData as Reservation[]);
            setAmenities(amenData as Amenity[]);
            
            // Set default amenity in reservation form if exists
            if (amenData.length > 0 && !formData.amenity) {
                setFormData(prev => ({ ...prev, amenity: (amenData[0] as Amenity).name }));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await add(COLLECTIONS.RESERVATIONS, {
                resident: formData.resident,
                amenity: formData.amenity,
                date: formData.date,
                time: `${formData.startTime} - ${formData.endTime}`,
                status: formData.status,
                reservationId: `RSV-${Math.floor(Math.random() * 10000)}`
            });
            showToast('Reserva guardada exitosamente.');
            setFormData({ resident: '', amenity: amenities[0]?.name || '', date: '', startTime: '', endTime: '', status: 'Pendiente' });
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            showToast('Error al guardar la reserva.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAmentiyImageSave = async (): Promise<string> => {
        if (!selectedFile) return amenityFormData.image;

        const formData = new FormData();
        formData.append('photo', selectedFile);

        const response = await fetch('https://devsdesign.cloud/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Error al subir la imagen al VPS');
        }

        const data = await response.json();

        // Normalize URL: replace raw VPS IP:port with HTTPS domain proxy
        // This avoids Mixed Content blocking in production (HTTPS page + HTTP image)
        const rawUrl: string = data.url || data.imageUrl || data.path || '';
        const publicUrl = rawUrl
            .replace('http://72.62.167.179:3001', 'https://devsdesign.cloud')
            .replace('http://127.0.0.1:3001', 'https://devsdesign.cloud')
            .replace('http://localhost:3001', 'https://devsdesign.cloud');

        return publicUrl || rawUrl;
    };

    const handleSaveAmenity = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const imageUrl = await handleAmentiyImageSave();
            
            const payload = {
                name: amenityFormData.name,
                capacity: amenityFormData.capacity,
                hours: amenityFormData.hours,
                price: amenityFormData.price,
                image: imageUrl
            };

            if (editingAmenityId) {
                await update(COLLECTIONS.AMENITIES, editingAmenityId, payload);
            } else {
                await add(COLLECTIONS.AMENITIES, payload);
            }

            setAmenityFormData({ name: '', capacity: '', hours: '', price: '', image: '' });
            setSelectedFile(null);
            setEditingAmenityId(null);
            setIsAmenityModalOpen(false);
            showToast(`Área común ${editingAmenityId ? 'actualizada' : 'creada'} exitosamente.`);
            fetchData();
        } catch (error) {
            console.error('Save amenity error:', error);
            showToast('Error al guardar el área común.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAmenity = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta área común?')) return;
        try {
            await remove(COLLECTIONS.AMENITIES, id);
            showToast('Área común eliminada.');
            fetchData();
        } catch (error) {
            showToast('Error al eliminar el área.', 'error');
        }
    };

    const openEditAmenity = (amenity: Amenity) => {
        setAmenityFormData({ ...amenity });
        setEditingAmenityId(amenity.id);
        setSelectedFile(null);
        setIsAmenityModalOpen(true);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await update(COLLECTIONS.RESERVATIONS, id, { status: newStatus });
            showToast(`Reserva ${newStatus.toLowerCase()}.`);
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error('Failed to update status', error);
            showToast('Error al actualizar la reserva.', 'error');
        }
    };

    const filtered = reservations.filter(r => {
        if (activeTab === 'Todas') return true;
        const mappedStatus = r.status === 'Pendiente' ? 'Pendientes' :
            r.status === 'Aprobada' ? 'Aprobadas' :
                r.status === 'Rechazada' ? 'Rechazadas' : r.status;
        return mappedStatus === activeTab;
    });

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reservas y Áreas Comunes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestiona las solicitudes y las áreas configurables.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin cursor-not-allowed' : ''} />
                    </button>
                    {viewMode === 'reservations' ? (
                        <>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary/30"
                            >
                                <Plus size={20} />
                                <span className="hidden sm:inline">Nueva Reserva</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                setAmenityFormData({ name: '', capacity: '', hours: '', price: '', image: '' });
                                setEditingAmenityId(null);
                                setSelectedFile(null);
                                setIsAmenityModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-emerald-500/30"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Nueva Área</span>
                        </button>
                    )}
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setViewMode('reservations')}
                    className={`px-4 py-2 font-medium text-sm rounded-lg transition-all ${viewMode === 'reservations' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Solicitudes de Reserva
                </button>
                <button
                    onClick={() => setViewMode('amenities')}
                    className={`px-4 py-2 font-medium text-sm rounded-lg transition-all ${viewMode === 'amenities' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Gestión de Áreas
                </button>
            </div>

            {viewMode === 'reservations' && (
                <>
                    {/* Tabs */}
                    <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6">
                        {['Pendientes', 'Aprobadas', 'Rechazadas', 'Todas'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                {loading ? (
                    <div className="flex-1 flex justify-center items-center py-20">
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                            <RefreshCw className="animate-spin text-primary" size={24} />
                            Cargando reservas...
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((r) => (
                            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                        r.status === 'Rechazada' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                            'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                        }`}>
                                        {r.status}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{r.reservationId || r.id.substring(0, 6).toUpperCase()}</span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{r.amenity}</h3>
                                <p className="text-sm font-medium text-primary mt-1">{r.date} • {r.time}</p>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-500">Solicitado por</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{r.resident}</p>
                                    </div>

                                    {r.status === 'Pendiente' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(r.id, 'Aprobada')}
                                                className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-colors"
                                                title="Aprobar"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(r.id, 'Rechazada')}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                                                title="Rechazar"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                No se encontraron reservas en esta categoría.
                            </div>
                        )}
                    </div>
                )}
                </>
            )}

            {viewMode === 'amenities' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loading ? (
                         <div className="col-span-full flex-1 flex justify-center items-center py-20">
                            <div className="flex items-center gap-3 text-slate-500 font-medium">
                                <RefreshCw className="animate-spin text-primary" size={24} />
                                Cargando amenidades...
                            </div>
                        </div>
                    ) : (
                        <>
                            {amenities.map(amen => (
                                <div key={amen.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="h-48 bg-slate-100 dark:bg-slate-800 relative">
                                        {amen.image ? (
                                            <img src={amen.image} alt={amen.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <ImageIcon size={48} opacity={0.5} />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            <button onClick={() => openEditAmenity(amen)} className="p-2 bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-700 dark:text-slate-200 rounded-full shadow-sm backdrop-blur-sm transition-all">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteAmenity(amen.id)} className="p-2 bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 hover:text-red-500 text-slate-700 dark:text-slate-200 rounded-full shadow-sm backdrop-blur-sm transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{amen.name}</h3>
                                        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex justify-between">
                                                <span>Precio:</span>
                                                <span className="font-semibold text-primary">{amen.price || 'Gratis'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Capacidad:</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{amen.capacity}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Horario:</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{amen.hours}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {amenities.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-500">
                                    No hay áreas comunes configuradas. Crea una nueva.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Create Reservation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Reserva</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddReservation} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Residente</label>
                                <input
                                    type="text" required
                                    value={formData.resident} onChange={(e) => setFormData({ ...formData, resident: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Amenidad</label>
                                <select
                                    value={formData.amenity} onChange={(e) => setFormData({ ...formData, amenity: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="" disabled>Selecciona un área</option>
                                    {amenities.map(amen => (
                                        <option key={amen.id} value={amen.name}>{amen.name}</option>
                                    ))}
                                    {amenities.length === 0 && <option value="" disabled>No hay áreas configuradas</option>}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                                    <input
                                        type="date" required
                                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hora Inicio</label>
                                    <input
                                        type="time" required
                                        value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hora Fin</label>
                                    <input
                                        type="time" required
                                        value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select
                                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Aprobada">Aprobada</option>
                                    <option value="Rechazada">Rechazada</option>
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
                                    className="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center disabled:opacity-70"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Reserva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Create/Edit Amenity Modal */}
            {isAmenityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setIsAmenityModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingAmenityId ? 'Editar Área Común' : 'Nueva Área Común'}
                            </h3>
                            <button
                                onClick={() => setIsAmenityModalOpen(false)}
                                disabled={saving}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAmenity} className="p-6 space-y-4">
                            
                            {/* Image Upload Area */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fotografía (VPS)</label>
                                <div 
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl h-32 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-800/50 cursor-pointer overflow-hidden relative group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {selectedFile ? (
                                        <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" alt="Preview" />
                                    ) : amenityFormData.image ? (
                                        <img src={amenityFormData.image} className="w-full h-full object-cover" alt="Saved Preview" />
                                    ) : (
                                        <>
                                            <ImageIcon className="text-slate-400 mb-2" size={28} />
                                            <span className="text-xs text-slate-500 font-medium">Click para subir foto</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                                        <span className="text-white font-medium text-sm">Cambiar Imagen</span>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/jpeg, image/png, image/webp"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelectedFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre del Área</label>
                                <input
                                    type="text" required
                                    placeholder="Ej. Salón de Eventos"
                                    value={amenityFormData.name} onChange={(e) => setAmenityFormData({ ...amenityFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Capacidad</label>
                                    <input
                                        type="text" required
                                        placeholder="Ej. 50 personas"
                                        value={amenityFormData.capacity} onChange={(e) => setAmenityFormData({ ...amenityFormData, capacity: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Precio / Costo</label>
                                    <input
                                        type="text" required
                                        placeholder="Ej. Gratis o $50.00"
                                        value={amenityFormData.price} onChange={(e) => setAmenityFormData({ ...amenityFormData, price: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Horario Disponible</label>
                                <input
                                    type="text" required
                                    placeholder="Ej. 08:00 AM - 10:00 PM"
                                    value={amenityFormData.hours} onChange={(e) => setAmenityFormData({ ...amenityFormData, hours: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAmenityModalOpen(false)}
                                    disabled={saving}
                                    className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center disabled:opacity-70"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Área'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
