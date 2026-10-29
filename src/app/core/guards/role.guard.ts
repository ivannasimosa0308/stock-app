import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Factoría de Guards que genera un CanActivateFn validando el rol exigido.
 * Cumple con el Enunciado 4.2 del Dossier y registra alertas de intrusión (403).
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

            if (!authService.isAuthenticated() || !currentUser) {
                return router.createUrlTree(['/login'], {
                    queryParams: { returnUrl: state.url }
                });
            }

            const normalizedRole = userRole === 'standard' ? 'user' : userRole;
            if (normalizedRole === targetRole || userRole === 'admin') {
                return true;
            }

            // Registrar intento de intrusión para mostrar el aviso de Acceso Prohibido (403)
            sessionStorage.setItem(
                'STOCKFLOW_FORBIDDEN_ATTEMPT',
                JSON.stringify({
                    attemptedUrl: state.url,
                    user: currentUser.email || 'operador',
                    role: normalizedRole,
                    timestamp: new Date().toLocaleTimeString('es-ES')
                })
            );

            // Redirigir a /user-dashboard (o /unauthorized si se solicita explícitamente)
            return router.createUrlTree(['/user-dashboard'], {
                queryParams: { forbidden: 'true', attempted: state.url }
            });
        };
    }

    // Caso 2: Invocado directamente como CanActivateFn -> canActivate: [roleGuard]
    const route = allowedRoleOrRoute as ActivatedRouteSnapshot;
    const authService = inject(AuthService);
    const router = inject(Router);

    const currentUser = authService.currentUser();
    const userRole = authService.userRole();

    if (!authService.isAuthenticated() || !currentUser) {
        return router.createUrlTree(['/login']);
    }

    const allowedRoles = route?.data?.['roles'] as string[] | undefined;
    if (!allowedRoles || allowedRoles.length === 0) {
        return true;
    }

    if (allowedRoles.includes(userRole) || userRole === 'admin') {
        return true;
    }

    return router.createUrlTree(['/unauthorized']);
};
