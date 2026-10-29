import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { warningOutline, shieldHalfOutline, arrowBackOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
    ],
    template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>403 — Acceso Prohibido (Seguridad RBAC)</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-12 col-md-8 col-lg-6">
            <div class="invent-card p-4 p-md-5 text-center border-top border-danger border-4">
              <div class="forbidden-icon mx-auto mb-3 d-flex align-items-center justify-content-center">
                <ion-icon name="lock-closed-outline" class="fs-1 text-danger"></ion-icon>
              </div>

              <span class="badge bg-danger-subtle text-danger px-3 py-1 rounded-pill fw-bold mb-2">
                ERROR HTTP 403 — FORBIDDEN
              </span>

              <h3 class="fw-bold text-dark mt-2 mb-2">
                Acceso No Autorizado Interceptado
              </h3>

              <p class="text-muted mb-4">
                Se ha detectado un intento de acceder a una ruta restringida de nivel
                <strong>Administrador</strong> con una cuenta de rol
                <span class="badge bg-secondary">{{ authService.userRole() }}</span>.
                La factoría <code>roleGuard('admin')</code> ha bloqueado la operación por seguridad.
              </p>

              <div class="alert alert-warning text-start small rounded-3 mb-4">
                <strong><ion-icon name="warning-outline" class="me-1 align-middle"></ion-icon> Aviso de Auditoría:</strong>
                Para acceder al Cuadro de Mando Ejecutivo o dar de alta nuevos productos en el catálogo,
                inicia sesión con credenciales de <strong>Administrador</strong>.
              </div>

              <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                <button
                  type="button"
                  class="btn btn-primary px-4 py-2 fw-semibold rounded-3"
                  (click)="router.navigate(['/user-dashboard'])"
                >
                  Ir al Panel de Operador (/user-dashboard)
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger px-4 py-2 fw-semibold rounded-3"
                  (click)="switchAccount()"
                >
                  Cambiar a Cuenta Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
    styles: [`
      .forbidden-icon {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background-color: #fef2f2;
        border: 2px solid #fecaca;
      }
    `]
})
export class UnauthorizedPage {
    router = inject(Router);
    route = inject(ActivatedRoute);
    authService = inject(AuthService);

    constructor() {
        addIcons({ warningOutline, shieldHalfOutline, arrowBackOutline, lockClosedOutline });
    }

    async switchAccount(): Promise<void> {
        await this.authService.logout();
        this.router.navigate(['/login']);
    }
}
