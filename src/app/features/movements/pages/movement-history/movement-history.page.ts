import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons
} from '@ionic/angular';

@Component({
    selector: 'app-movement-history',
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonButton, IonButtons
    ],
    template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Historial de Movimientos</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/inventory'])">Volver</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h2>Movimientos en Tiempo Real (MongoDB)</h2>
      <p>Aquí se listarán las entradas, salidas y mermas registradas.</p>
    </ion-content>
  `
})
export class MovementHistoryPage {
    router = inject(Router);
}