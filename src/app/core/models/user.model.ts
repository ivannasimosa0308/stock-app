// Define los dos roles exigidos por el proyecto
export type UserRole = 'admin' | 'standard';

// Representa el perfil del usuario autenticado almacenado en Supabase
export interface UserProfile {
    id: string;              // UUID único vinculado a auth.users de Supabase
    email: string;           // Correo corporativo del empleado
    full_name: string;       // Nombre y apellidos
    role: UserRole;          // 'admin' (acceso total) o 'standard' (operador básico)
    avatar_url?: string;     // Foto del empleado en Supabase Storage
    position?: string;       // Cargo en el almacén
    created_at?: string;     // Fecha de alta en el sistema
    updated_at?: string;
}
