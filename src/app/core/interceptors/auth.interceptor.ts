import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Interceptor funcional para la inyección de token Bearer en peticiones al backend corporativo
 * y gestión centralizada de excepciones de seguridad (401 Unauthorized / 403 Forbidden).
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Filtrado de dominio: Solo adjuntar token si la petición va dirigida a endpoints de la API de StockFlow
  const isTargetApi = req.url.startsWith(environment.supabaseUrl) || req.url.startsWith('/api');
  let authReq = req;

  if (isTargetApi) {
    // Obtener sesión activa (Supabase o credenciales locales simuladas)
    const localSession = authService.readSessionFromStorage();
    const token = localSession ? `mock-jwt-token-${localSession.role}` : null;

    if (token) {
      // HttpRequest es inmutable: se clona para inyectar cabecera Authorization
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'X-App-Client': 'StockFlow-Ionic-Client'
        }
      });
    }
  }

  // 2. Flujo reactivo (Pipeline Onion) y captura centralizada de errores HTTP
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado o inválido: destruir sesión y forzar redirección con URL de retorno
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url, sessionExpired: 'true' }
        });
      } else if (error.status === 403) {
        // Intento de acceso sin privilegios de rol suficientes (RBAC)
        router.navigate(['/unauthorized']);
      }
      return throwError(() => error);
    })
  );
};
