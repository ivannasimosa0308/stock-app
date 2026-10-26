import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state): Promise<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1. Verificación de estado reactivo (nutrido desde memoria o sessionStorage Web Storage)
    if (authService.isAuthenticated()) {
        return true;
    }

    // 2. Si acaba de recargar la página (F5) con sesión de Supabase, consultamos la sesión activa
    try {
        const { data: { session } } = await authService.client.auth.getSession();
        if (session?.user) {
            return true;
        }
    } catch (error) {
        console.error('Error verificando sesión en authGuard:', error);
    }

    // 3. Si no está autenticado, redirigir atómicamente a la página de login devolviendo un UrlTree
    return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
    });
};
