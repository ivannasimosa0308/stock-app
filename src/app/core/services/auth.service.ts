import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private supabase: SupabaseClient;

    // Signals reactivos para el estado de autenticación y perfil
    private currentUserSignal = signal<User | null>(null);
    private currentProfileSignal = signal<UserProfile | null>(null);
    private isLoadingSignal = signal<boolean>(true);

    // Exposición pública de sólo lectura
    readonly currentUser = this.currentUserSignal.asReadonly();
    readonly currentProfile = this.currentProfileSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();

    // Computados automáticos
    readonly isAuthenticated = computed(() => !!this.currentUserSignal());
    readonly isAdmin = computed(() => this.currentProfileSignal()?.role === 'admin');
    readonly userRole = computed(() => this.currentProfileSignal()?.role ?? 'standard');

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
        this.initAuth();
    }

    /**
     * Inicializa la sesión actual y suscribe al observador de cambios de autenticación
     */
    private async initAuth(): Promise<void> {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            await this.updateUserState(session);

            this.supabase.auth.onAuthStateChange(async (_event, session) => {
                await this.updateUserState(session);
            });
        } catch (error) {
            console.error('Error inicializando autenticación:', error);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Actualiza el usuario y consulta su perfil en la tabla 'profiles'
     */
    private async updateUserState(session: Session | null): Promise<void> {
        if (session?.user) {
            this.currentUserSignal.set(session.user);
            const profile = await this.fetchUserProfile(session.user.id);
            this.currentProfileSignal.set(profile);
        } else {
            this.currentUserSignal.set(null);
            this.currentProfileSignal.set(null);
        }
    }

    /**
     * Obtiene el perfil (con rol admin o standard) desde la base de datos de Supabase
     */
    async fetchUserProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.warn('No se pudo obtener el perfil del usuario:', error);
            return null;
        }
        return data as UserProfile;
    }

    /**
     * Inicio de sesión con correo y contraseña
     */
    async login(email: string, password: string) {
        const response = await this.supabase.auth.signInWithPassword({ email, password });
        if (response.error) throw response.error;
        await this.updateUserState(response.data.session);
        return response.data;
    }

    /**
     * Registro de nuevo usuario (por defecto rol 'standard')
     */
    async register(email: string, password: string, fullName: string, role: UserRole = 'standard') {
        const response = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
            }
        });
        if (response.error) throw response.error;
        return response.data;
    }

    /**
     * Cierre de sesión seguro
     */
    async logout(): Promise<void> {
        await this.supabase.auth.signOut();
        this.currentUserSignal.set(null);
        this.currentProfileSignal.set(null);
    }

    /**
     * Acceso directo a la instancia de Supabase para otros servicios
     */
    get client(): SupabaseClient {
        return this.supabase;
    }
}