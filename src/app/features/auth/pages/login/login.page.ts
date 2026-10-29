import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  personOutline,
  lockClosedOutline,
  flashOutline,
  cubeOutline
} from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>StockFlow S.L</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-12 col-md-8 col-lg-5">
            <div class="invent-card p-4 p-md-5">
              <!-- Encabezado Corporativo -->
              <div class="text-center mb-4">
                <div class="brand-badge mx-auto mb-3 d-flex align-items-center justify-content-center">
                  <ion-icon name="cube-outline" class="fs-2 text-white"></ion-icon>
                </div>
                <h3 class="fw-bold text-dark mb-1">Control de Acceso</h3>
                <p class="text-muted small mb-0">
                  Sistema de Gestión de Inventario y Turnos en Tiempo Real
                </p>
              </div>

              <!-- Acceso Rápido -->
              <div class="demo-panel p-3 rounded-4 mb-4">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="small fw-bold text-primary text-uppercase">
                    <ion-icon name="flash-outline" class="me-1 align-middle"></ion-icon>
                    Acceso Rápido 
                  </span>
                  <span class="badge bg-primary-subtle text-primary rounded-pill">1-Clic</span>
                </div>
                <p class="extra-small text-muted mb-3">
                  Inicia sesión automáticamente e inicia el cronómetro de jornada laboral:
                </p>
                <div class="row g-2">
                  <div class="col-6">
                    <button
                      type="button"
                      class="btn btn-primary w-100 fw-semibold py-2 rounded-3 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                      (click)="loginDemo('admin')"
                      [disabled]="isLoading()"
                    >
                      <ion-icon name="shield-checkmark-outline"></ion-icon>
                      <span>Demo Admin</span>
                    </button>
                  </div>
                  <div class="col-6">
                    <button
                      type="button"
                      class="btn btn-outline-dark w-100 fw-semibold py-2 rounded-3 d-flex align-items-center justify-content-center gap-1"
                      (click)="loginDemo('operador')"
                      [disabled]="isLoading()"
                    >
                      <ion-icon name="person-outline"></ion-icon>
                      <span>Demo Operador</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="divider-text text-center my-3">
                <span class="bg-white px-3 text-muted small">o acceso manual</span>
              </div>

              <!-- Formulario Reactivo Estándar -->
              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label fw-semibold small text-secondary">
                    Usuario o Correo Corporativo
                  </label>
                  <input
                    type="text"
                    class="form-control form-control-lg fs-6 rounded-3"
                    formControlName="email"
                    placeholder="admin / operador o usuario@empresa.com"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold small text-secondary">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    class="form-control form-control-lg fs-6 rounded-3"
                    formControlName="password"
                    placeholder="•••••••• (123 para demo)"
                  />
                </div>

                @if (errorMessage()) {
                  <div class="alert alert-danger py-2 small text-center rounded-3 mb-3">
                    {{ errorMessage() }}
                  </div>
                }

                <button
                  type="submit"
                  class="btn btn-dark w-100 py-2 fw-bold rounded-3 mt-2"
                  [disabled]="loginForm.invalid || isLoading()"
                >
                  @if (isLoading()) {
                    <ion-spinner name="crescent" color="light"></ion-spinner>
                  } @else {
                    Acceder al Sistema
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
      .brand-badge {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: linear-gradient(135deg, #5b47fb 0%, #3b28cc 100%);
        box-shadow: 0 8px 20px rgba(91, 71, 251, 0.3);
      }
      .demo-panel {
        background-color: #f5f3ff;
        border: 1px solid #ddd6fe;
      }
      .extra-small {
        font-size: 0.76rem;
      }
      .divider-text {
        position: relative;
      }
      .divider-text::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        border-top: 1px solid #e2e8f0;
        z-index: 0;
      }
      .divider-text span {
        position: relative;
        z-index: 1;
      }
    `]
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(3)]]
  });

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      personOutline,
      lockClosedOutline,
      flashOutline,
      cubeOutline
    });
  }

  async loginDemo(profileType: 'admin' | 'operador'): Promise<void> {
    this.loginForm.patchValue({
      email: profileType,
      password: '123'
    });
    await this.onSubmit();
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else if (this.authService.isAdmin()) {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/user-dashboard']);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
