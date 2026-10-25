import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Obtenemos los roles permitidos desde la configuración de la ruta (data: { roles: [...] })
    const allowedRoles = route.data['roles'] as UserRole[] | undefined;

    // Si la ruta no especifica roles restringidos, dejamos pasar
    if (!allowedRoles || allowedRoles.length === 0) {
        return true;
    }

    // Obtenemos el perfil en memoria
    let profile = authService.currentProfile();

    // Si no está en memoria (ej. tras recargar F5), lo recuperamos desde la sesión de Supabase
    if (!profile) {
        const { data: { session } } = await authService.client.auth.getSession();
        if (session?.user) {
            profile = await authService.fetchUserProfile(session.user.id);
        }
    }

    // Si no se encuentra perfil, redirigimos a login
    if (!profile) {
        return router.createUrlTree(['/auth/login']);
    }

    // Si el rol del usuario está dentro de los permitidos, concedemos acceso
    if (allowedRoles.includes(profile.role)) {
        return true;
    }

    // Si no tiene el rol requerido, redirigimos a la vista de Acceso No Autorizado
    return router.createUrlTree(['/unauthorized']);
};