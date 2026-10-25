import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1. Si ya está autenticado en memoria, permitimos acceso
    if (authService.isAuthenticated()) {
        return true;
    }

    // 2. Si acaba de recargar la página (F5), consultamos la sesión activa en Supabase
    try {
        const { data: { session } } = await authService.client.auth.getSession();
        if (session?.user) {
            return true;
        }
    } catch (error) {
        console.error('Error verificando sesión en authGuard:', error);
    }

    // 3. Si no tiene sesión, redirigimos al Login guardando la ruta a la que intentaba ir
    return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
    });
};