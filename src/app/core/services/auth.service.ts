import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { UserProfile, UserRole } from '../models/user.model';

/**
 * Estructura de sesión requerida por el dossier del laboratorio DAM2
 */
export interface UserSession {
    username: string;
    role: 'admin' | 'user';
    isAuthenticated: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private supabase: SupabaseClient;

    /**
     * Clave empleada en la Web Storage API (sessionStorage) requerida por el profesor
     */
    private readonly STORAGE_KEY = 'DAM2_AUTH_SESSION';
    private readonly CLOCK_KEY = 'STOCKFLOW_CLOCK_START';
    private readonly CLOCK_ACTIVE_KEY = 'STOCKFLOW_CLOCK_ACTIVE';

    // Signals reactivos para el estado de autenticación, perfil y cronómetro de turno
    private currentUserSignal = signal<User | null>(null);
    private currentProfileSignal = signal<UserProfile | null>(null);
    private isLoadingSignal = signal<boolean>(true);
    private sessionStartTimeSignal = signal<number | null>(null);
    private isClockedInSignal = signal<boolean>(false);

    // Exposición pública de sólo lectura
    readonly currentUser = this.currentUserSignal.asReadonly();
    readonly currentProfile = this.currentProfileSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly sessionStartTime = this.sessionStartTimeSignal.asReadonly();
    readonly isClockedIn = this.isClockedInSignal.asReadonly();

    // Selectores computados automáticos
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
            // 1. Restaurar sesión síncrona/local desde sessionStorage si existe (laboratorio DAM2)
            const localSession = this.readSessionFromStorage();
            if (localSession && localSession.isAuthenticated) {
                this.setLocalUserSession(localSession);
                this.restoreClockState();
            }

            // 2. Verificar sesión activa en Supabase
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                await this.updateUserState(session);
                this.restoreClockState();
            }

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
     * Inicia o restaura el cronómetro de jornada laboral al iniciar sesión
     */
    private restoreClockState(): void {
        const savedStart = sessionStorage.getItem(this.CLOCK_KEY);
        const savedActive = sessionStorage.getItem(this.CLOCK_ACTIVE_KEY);
        if (savedStart) {
            this.sessionStartTimeSignal.set(Number(savedStart));
            this.isClockedInSignal.set(savedActive !== 'false');
        } else {
            this.startWorkShift();
        }
    }

    public startWorkShift(): void {
        const now = Date.now();
        sessionStorage.setItem(this.CLOCK_KEY, String(now));
        sessionStorage.setItem(this.CLOCK_ACTIVE_KEY, 'true');
        this.sessionStartTimeSignal.set(now);
        this.isClockedInSignal.set(true);
    }

    public toggleClockInOut(): void {
        if (this.isClockedInSignal()) {
            sessionStorage.setItem(this.CLOCK_ACTIVE_KEY, 'false');
            this.isClockedInSignal.set(false);
        } else {
            this.startWorkShift();
        }
    }

    public updateAvatarUrl(newAvatarUrl: string): void {
        const current = this.currentProfileSignal();
        if (!current) return;
        const usernameKey = current.role === 'admin' ? 'admin' : 'operador';
        localStorage.setItem(`STOCKFLOW_AVATAR_${usernameKey}`, newAvatarUrl);
        this.currentProfileSignal.set({
            ...current,
            avatar_url: newAvatarUrl
        });
    }

    /**
     * Establece la sesión en memoria para los usuarios simulados del laboratorio
     */
    private setLocalUserSession(sessionData: UserSession): void {
        const isAdminUser = sessionData.role === 'admin';
        const usernameKey = isAdminUser ? 'admin' : 'operador';
        const savedAvatar = localStorage.getItem(`STOCKFLOW_AVATAR_${usernameKey}`);

        const defaultAdminAvatar = 'https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/employees/admin-ivanna.jpg';
        const defaultOperadorAvatar = 'https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/employees/operador-carlos.jpg';

        const mockUser: User = {
            id: 'mock-' + sessionData.username,
            app_metadata: {},
            user_metadata: { full_name: sessionData.username },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: sessionData.username.includes('@') ? sessionData.username : `${sessionData.username}@stockflow.local`
        };

        const mockProfile: UserProfile = {
            id: mockUser.id,
            email: mockUser.email || `${sessionData.username}@stockflow.local`,
            full_name: isAdminUser ? 'Ivanna Simosa (Admin)' : 'Carlos Méndez (Operador)',
            position: isAdminUser ? 'Directora de Operaciones y Stock' : 'Técnico Logístico de Almacén',
            avatar_url: savedAvatar || (isAdminUser ? defaultAdminAvatar : defaultOperadorAvatar),
            role: isAdminUser ? 'admin' : 'standard',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.currentUserSignal.set(mockUser);
        this.currentProfileSignal.set(mockProfile);
    }

    /**
     * Recupera la sesión desde sessionStorage al refrescar la página (F5)
     */
    public readSessionFromStorage(): UserSession | null {
        const rawData = sessionStorage.getItem(this.STORAGE_KEY);
        if (!rawData) {
            return null;
        }
        try {
            return JSON.parse(rawData) as UserSession;
        } catch {
            sessionStorage.removeItem(this.STORAGE_KEY);
            return null;
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

            // Sincronizar en sessionStorage para las Developer Tools
            const sessionData: UserSession = {
                username: session.user.email?.split('@')[0] || 'usuario',
                role: profile?.role === 'admin' ? 'admin' : 'user',
                isAuthenticated: true
            };
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
        } else {
            // Solo si no hay sesión mock activa
            if (!this.readSessionFromStorage()) {
                this.currentUserSignal.set(null);
                this.currentProfileSignal.set(null);
            }
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
     * Inicio de sesión dual:
     * 1. Soporta credenciales requeridas por el enunciado del laboratorio:
     *    - admin / 123 (Rol: 'admin')
     *    - operador / 123 (Rol: 'user')
     * 2. Conexión estándar mediante Supabase Auth
     */
    async login(userOrEmail: string, pass: string) {
        const trimmedUser = (userOrEmail || '').trim().toLowerCase();

        // 1. Validación de credenciales didácticas requeridas por el dossier
        if ((trimmedUser === 'admin' || trimmedUser === 'operador') && pass === '123') {
            const role: 'admin' | 'user' = trimmedUser === 'admin' ? 'admin' : 'user';
            const sessionData: UserSession = {
                username: trimmedUser,
                role: role,
                isAuthenticated: true
            };

            // Guardar en memoria reactiva (Signals) e iniciar cronómetro de sesión
            this.setLocalUserSession(sessionData);
            this.startWorkShift();

            // Persistir en sessionStorage bajo DAM2_AUTH_SESSION
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));

            return {
                user: this.currentUserSignal(),
                session: sessionData,
                role: role
            };
        }

        // 2. Flujo estándar con Supabase
        const response = await this.supabase.auth.signInWithPassword({ email: userOrEmail, password: pass });
        if (response.error) throw response.error;
        await this.updateUserState(response.data.session);
        this.startWorkShift();

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
     * Cierre de sesión seguro:
     * Destruye la sesión activa en memoria, en sessionStorage y en Supabase
     */
    async logout(): Promise<void> {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.CLOCK_KEY);
        sessionStorage.removeItem(this.CLOCK_ACTIVE_KEY);
        try {
            await this.supabase.auth.signOut();
        } catch {
            // Ignorar si era sesión mock del laboratorio
        }
        this.currentUserSignal.set(null);
        this.currentProfileSignal.set(null);
        this.sessionStartTimeSignal.set(null);
        this.isClockedInSignal.set(false);
    }

    /**
     * Acceso directo a la instancia de Supabase para otros servicios
     */
    get client(): SupabaseClient {
        return this.supabase;
    }
}
