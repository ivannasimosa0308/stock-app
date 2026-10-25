import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent
} from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonButton, IonButtons, IonCard, IonCardHeader,
        IonCardTitle, IonCardContent
    ],
    template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Panel de Administración</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/inventory'])">Ver Inventario</ion-button>
          <ion-button (click)="onLogout()">Salir</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Cuadro de Mando (Métricas y Analítica)</h2>
      <ion-card>
        <ion-card-header>
          <ion-card-title>Zona Exclusiva de Administrador</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Aquí se cargarán las gráficas de Chart.js y las exportaciones a PDF/CSV (Fase 3).
        </ion-card-content>
      </ion-card>
    </ion-content>
  `
})
export class AdminDashboardPage {
    authService = inject(AuthService);
    router = inject(Router);

    async onLogout() {
        await this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}