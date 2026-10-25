import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonLabel, IonInput, IonButton, IonSpinner, IonText
} from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
        IonCardHeader, IonCardTitle, IonCardContent, IonItem,
        IonLabel, IonInput, IonButton, IonSpinner, IonText
    ],
    template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>StockFlow - Iniciar Sesión</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="max-width: 450px; margin: 40px auto 0;">
        <ion-card>
          <ion-card-header>
            <ion-card-title class="ion-text-center">Bienvenido</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <ion-item lines="full" class="ion-margin-bottom">
                <ion-label position="stacked">Correo Electrónico</ion-label>
                <ion-input type="email" formControlName="email" placeholder="usuario@empresa.com"></ion-input>
              </ion-item>

              <ion-item lines="full" class="ion-margin-bottom">
                <ion-label position="stacked">Contraseña</ion-label>
                <ion-input type="password" formControlName="password" placeholder="••••••••"></ion-input>
              </ion-item>

              @if (errorMessage()) {
                <ion-text color="danger" class="ion-padding-vertical">
                  <p class="ion-text-center">{{ errorMessage() }}</p>
                </ion-text>
              }

              <ion-button expand="block" type="submit" [disabled]="loginForm.invalid || isLoading()" class="ion-margin-top">
                @if (isLoading()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  Acceder al Sistema
                }
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `
})
export class LoginPage {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    async onSubmit() {
        if (this.loginForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const { email, password } = this.loginForm.value;

        try {
            await this.authService.login(email, password);
            // Tras login exitoso, redirige al inventario
            this.router.navigate(['/inventory']);
        } catch (err: any) {
            this.errorMessage.set(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
        } finally {
            this.isLoading.set(false);
        }
    }
}