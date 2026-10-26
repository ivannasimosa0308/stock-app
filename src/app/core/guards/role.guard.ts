import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Factoría de Guards que genera un CanActivateFn validando el rol exigido.
 * Cumple con el Enunciado 4.2 del Dossier.
 * Soporta uso como factoría: roleGuard('admin')
 * y uso directo como CanActivateFn: canActivate: [authGuard, roleGuard]
 */
export const roleGuard: any = (
    allowedRoleOrRoute: 'admin' | 'user' | 'standard' | ActivatedRouteSnapshot = 'admin'
) => {
    // Caso 1: Invocado como factoría -> roleGuard('admin')
    if (typeof allowedRoleOrRoute === 'string') {
        const targetRole = allowedRoleOrRoute;
        return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree => {
            const authService = inject(AuthService);
            const router = inject(Router);

            const currentUser = authService.currentUser();
            const userRole = authService.userRole();

            // Si no está autenticado, redirigir atómicamente a login con queryParams
            if (!authService.isAuthenticated() || !currentUser) {
                return router.createUrlTree(['/auth/login'], {
                    queryParams: { returnUrl: state.url }
                });
            }

            const normalizedRole = userRole === 'standard' ? 'user' : userRole;
            if (normalizedRole === targetRole || userRole === 'admin') {
                return true;
            }

            // Si no tiene permiso para /admin o rol admin, redirigir a /user-dashboard
            return router.createUrlTree(['/user-dashboard']);
        };
    }

    // Caso 2: Invocado directamente como CanActivateFn -> canActivate: [roleGuard]
    const route = allowedRoleOrRoute as ActivatedRouteSnapshot;
    const authService = inject(AuthService);
    const router = inject(Router);

    const currentUser = authService.currentUser();
    const userRole = authService.userRole();

    if (!authService.isAuthenticated() || !currentUser) {
        return router.createUrlTree(['/auth/login']);
    }

    const allowedRoles = route.data?.['roles'] as string[] | undefined;
    const normalizedRole = userRole === 'standard' ? 'user' : userRole;

    if (!allowedRoles || allowedRoles.includes(normalizedRole) || userRole === 'admin') {
        return true;
    }

    return router.createUrlTree(['/user-dashboard']);
};
