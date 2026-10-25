import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonIcon, IonBadge
} from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-inventory-list',
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonButton, IonButtons, IonBadge
    ],
    template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Control de Inventario</ion-title>
        <ion-buttons slot="end">
          @if (authService.isAdmin()) {
            <ion-button (click)="router.navigate(['/dashboard'])">Dashboard Admin</ion-button>
          }
          <ion-button (click)="onLogout()">Cerrar Sesión</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>Catálogo de Productos</h2>
        <ion-badge color="secondary">Rol: {{ authService.userRole() | uppercase }}</ion-badge>
      </div>
      <p>Bienvenido, {{ authService.currentUser()?.email }}.</p>
    </ion-content>
  `
})
export class InventoryListPage {
    authService = inject(AuthService);
    router = inject(Router);

    async onLogout() {
        await this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}