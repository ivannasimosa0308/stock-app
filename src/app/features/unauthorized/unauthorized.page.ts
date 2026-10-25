import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton
} from '@ionic/angular';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton
    ],
    template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>Acceso No Autorizado (403)</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="max-width: 500px; margin: 50px auto; text-align: center;">
        <ion-card>
          <ion-card-header>
            <ion-card-title color="danger">Permisos Insuficientes</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>No tienes el rol de <strong>Administrador</strong> requerido para ver esta sección.</p>
            <ion-button expand="block" color="primary" class="ion-margin-top" (click)="router.navigate(['/inventory'])">
              Volver al Inventario
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `
})
export class UnauthorizedPage {
    router = inject(Router);
}