import { db } from '../config/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { COLLECTIONS } from './dbServices';

const PERMISSIONS = [
    // Dashboard
    { id: 'dashboard_view', name: 'Ver Dashboard', module: 'dashboard', description: 'Acceso a estadísticas principales' },

    // Residents
    { id: 'residents_view', name: 'Ver Residentes', module: 'residents', description: 'Listado y búsqueda de residentes' },
    { id: 'residents_manage', name: 'Gestionar Residentes', module: 'residents', description: 'Crear, editar y eliminar residentes' },
    { id: 'units_manage', name: 'Gestionar Unidades', module: 'residents', description: 'Configuración de edificios y apartamentos' },

    // Payments
    { id: 'payments_view', name: 'Ver Pagos', module: 'payments', description: 'Ver historial de transacciones' },
    { id: 'payments_validate', name: 'Validar Comprobantes', module: 'payments', description: 'Aprobar o rechazar pagos recibidos' },
    { id: 'expenses_manage', name: 'Gestionar Gastos', module: 'payments', description: 'Registro de gastos operativos' },

    // Billing
    { id: 'billing_generate', name: 'Emisión de Cuotas', module: 'billing', description: 'Generar mantenimientos masivos' },
    { id: 'billing_history', name: 'Historial de Emisión', module: 'billing', description: 'Ver lotes de facturación generados' },

    // Communications
    { id: 'announcements_manage', name: 'Gestionar Comunicados', module: 'announcements', description: 'Crear avisos para la comunidad' },
    { id: 'messages_view', name: 'Ver Mensajes', module: 'messages', description: 'Acceso a chat de soporte/consultas' },

    // Maintenance
    { id: 'maintenance_manage', name: 'Gestionar Mantenimiento', module: 'maintenance', description: 'Control de tickets de reparaciones' },

    // Access Management
    { id: 'users_view', name: 'Ver Usuarios', module: 'users', description: 'Ver personal con acceso al sistema' },
    { id: 'users_manage', name: 'Gestionar Usuarios', module: 'users', description: 'Crear y configurar cuentas de usuario' },
    { id: 'roles_manage', name: 'Gestionar Roles', module: 'users', description: 'Configurar permisos y niveles de acceso' },

    // System Settings
    { id: 'settings_view', name: 'Ver Configuración', module: 'settings', description: 'Ver parámetros del residencial' },
    { id: 'settings_manage', name: 'Editar Configuración', module: 'settings', description: 'Cambiar reglas y datos del residencial' }
];

const ROLES = [
    {
        id: 'superadmin',
        name: 'Súper Administrador',
        description: 'Acceso total y configuración de seguridad del sistema.',
        level: 1,
        permissions: PERMISSIONS.map(p => p.id),
        channels: ['web', 'mobile']
    },
    {
        id: 'administrador',
        name: 'Administrador Residencial',
        description: 'Gestión operativa completa del residencial.',
        level: 2,
        permissions: PERMISSIONS.filter(p => !p.id.includes('roles_manage')).map(p => p.id),
        channels: ['web', 'mobile']
    },
    {
        id: 'contabilidad',
        name: 'Contabilidad / Cobros',
        description: 'Enfocado en validación de pagos y emisión de cuotas.',
        level: 3,
        permissions: [
            'dashboard_view', 'residents_view', 'payments_view',
            'payments_validate', 'billing_generate', 'billing_history',
            'expenses_manage', 'settings_view'
        ],
        channels: ['web']
    },
    {
        id: 'seguridad',
        name: 'Seguridad / Recepción',
        description: 'Control de acceso y visualización de comunicados.',
        level: 4,
        permissions: ['dashboard_view', 'residents_view', 'announcements_manage', 'messages_view'],
        channels: ['web', 'mobile']
    },
    {
        id: 'residente',
        name: 'Residente / Propietario',
        description: 'Acceso limitado a información propia y comunidad.',
        level: 5,
        permissions: ['dashboard_view', 'payments_view', 'messages_view'],
        channels: ['mobile']
    }
];

export async function seedAuthData() {
    const batch = writeBatch(db);

    // Seed Permissions
    PERMISSIONS.forEach(perm => {
        const permRef = doc(db, COLLECTIONS.PERMISSIONS, perm.id);
        batch.set(permRef, perm);
    });

    // Seed Roles
    ROLES.forEach(role => {
        const roleRef = doc(db, COLLECTIONS.ROLES, role.id);
        batch.set(roleRef, role);
    });

    await batch.commit();
    console.log('Seeding completed successfully!');
}
