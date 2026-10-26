import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonModal,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  addCircleOutline,
  downloadOutline,
  refreshOutline,
  closeOutline
} from 'ionicons/icons';

import { InventoryService } from '../../../../core/services/inventory.service';
import { ExportService } from '../../../../core/services/export.service';
import { MovementLog, MovementType } from '../../../../core/models/inventory-log.model';
import { Product } from '../../../../core/models/product.model';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-movement-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonBadge,
    IonModal,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonTextarea,
    IonToast,
    DataTableComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="router.navigate(['/inventory'])" aria-label="Volver a Inventario">
            <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Historial de Movimientos de Stock</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/dashboard'])">Dashboard</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding movements-content">
      <!-- Encabezado de la página -->
      <div class="movements-header">
        <div>
          <h2>Auditoría de Entradas y Salidas</h2>
          <p>Registro histórico y trazabilidad de existencias en Supabase.</p>
        </div>
        <div class="header-actions">
          <ion-button fill="outline" size="small" (click)="loadLogs()" [disabled]="isLoading()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Refrescar
          </ion-button>
          <ion-button color="primary" size="small" (click)="exportService.exportMovementsToCsv(logs())">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Exportar CSV
          </ion-button>
          <ion-button color="success" size="small" (click)="isModalOpen.set(true)">
            <ion-icon name="add-circle-outline" slot="start"></ion-icon>
            Registrar Movimiento
          </ion-button>
        </div>
      </div>

      <!-- Cuadrícula Responsiva Mobile-First -->
      <app-data-table
        title="Historial de Movimientos"
        [data]="logs()"
        [columns]="columns"
        [showActions]="false"
        [isLoading]="isLoading()"
        searchPlaceholder="Buscar por SKU, producto o motivo..."
        [pageSize]="8"
      ></app-data-table>

      <!-- Modal para Registrar Nuevo Movimiento de Stock -->
      <ion-modal [isOpen]="isModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Registrar Movimiento de Existencias</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeModal()">
                  <ion-icon name="close-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <form (ngSubmit)="submitMovement()">
              <!-- Selección de Producto -->
              <ion-item lines="full" class="modal-field">
                <ion-label position="stacked">Selecciona Producto *</ion-label>
                <ion-select
                  [(ngModel)]="selectedProductId"
                  name="selectedProductId"
                  placeholder="Elige un producto"
                  required
                >
                  @for (p of products(); track p.id) {
                    <ion-select-option [value]="p.id">
                      [{{ p.sku }}] {{ p.name }} (Stock actual: {{ p.stock }})
                    </ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Tipo de Movimiento -->
              <ion-item lines="full" class="modal-field ion-margin-top">
                <ion-label position="stacked">Tipo de Operación *</ion-label>
                <ion-select [(ngModel)]="movementType" name="movementType" required>
                  <ion-select-option value="IN">ENTRADA (Recepción / Compra)</ion-select-option>
                  <ion-select-option value="OUT">SALIDA (Venta / Despacho)</ion-select-option>
                  <ion-select-option value="DAMAGE">MERMA (Baja por daño / rotura)</ion-select-option>
                  <ion-select-option value="ADJUSTMENT">AJUSTE (Auditoría física)</ion-select-option>
                </ion-select>
              </ion-item>

              <!-- Cantidad -->
              <ion-item lines="full" class="modal-field ion-margin-top">
                <ion-label position="stacked">Cantidad de Unidades *</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="quantity"
                  name="quantity"
                  min="1"
                  required
                ></ion-input>
              </ion-item>

              <!-- Motivo -->
              <ion-item lines="full" class="modal-field ion-margin-top">
                <ion-label position="stacked">Motivo / Documento de Referencia *</ion-label>
                <ion-input
                  [(ngModel)]="reason"
                  name="reason"
                  placeholder="Ej. Albarán proveedor #2041, Pedido cliente #890"
                  required
                ></ion-input>
              </ion-item>

              <div class="modal-actions ion-margin-top">
                <ion-button fill="outline" color="medium" (click)="closeModal()">Cancelar</ion-button>
                <ion-button
                  type="submit"
                  color="success"
                  [disabled]="!selectedProductId || quantity < 1 || !reason || isSubmitting()"
                >
                  Confirmar y Guardar
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Toast Feedback -->
      <ion-toast
        [isOpen]="toastMessage() !== null"
        [message]="toastMessage() || ''"
        [duration]="3000"
        (didDismiss)="toastMessage.set(null)"
      ></ion-toast>
    </ion-content>
  `,
  styles: [`
    .movements-content {
      --background: #f8fafc;
    }

    .movements-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
      gap: 12px;
    }

    .movements-header h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
    }

    .movements-header p {
      margin: 4px 0 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .modal-field {
      --background: #f1f5f9;
      border-radius: 8px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }
  `]
})
export class MovementHistoryPage implements OnInit {
  inventoryService = inject(InventoryService);
  exportService = inject(ExportService);
  router = inject(Router);

  logs = signal<MovementLog[]>([]);
  products = signal<Product[]>([]);
  isLoading = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  selectedProductId: string = '';
  movementType: MovementType = 'IN';
  quantity: number = 1;
  reason: string = '';

  readonly columns: ColumnDef[] = [
    { key: 'timestamp', label: 'Fecha y Hora', sortable: true, type: 'date' },
    { key: 'movementType', label: 'Tipo', sortable: true, type: 'badge' },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'productName', label: 'Producto', sortable: true },
    { key: 'quantity', label: 'Cantidad', sortable: true },
    { key: 'newStock', label: 'Stock Resultante', sortable: true, type: 'stock' },
    { key: 'reason', label: 'Motivo', sortable: false },
    { key: 'userEmail', label: 'Operador', sortable: true }
  ];

  constructor() {
    addIcons({
      arrowBackOutline,
      addCircleOutline,
      downloadOutline,
      refreshOutline,
      closeOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadLogs(),
      this.loadProducts()
    ]);
  }

  async loadLogs(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.inventoryService.getMovements();
      this.logs.set(data);
    } catch (err) {
      this.toastMessage.set('Error cargando historial de movimientos.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProducts(): Promise<void> {
    try {
      const data = await this.inventoryService.getProducts();
      this.products.set(data);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedProductId = '';
    this.quantity = 1;
    this.reason = '';
  }

  async submitMovement(): Promise<void> {
    const product = this.products().find(p => p.id === this.selectedProductId);
    if (!product) return;

    this.isSubmitting.set(true);
    const prevStock = product.stock;
    let delta = Number(this.quantity);

    if (this.movementType === 'OUT' || this.movementType === 'DAMAGE') {
      if (prevStock < delta) {
        this.toastMessage.set(`Stock insuficiente. Solo quedan ${prevStock} unidades.`);
        this.isSubmitting.set(false);
        return;
      }
      delta = -delta;
    }

    const calculatedNewStock = prevStock + delta;

    try {
      await this.inventoryService.registerMovement({
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        movementType: this.movementType,
        quantity: Math.abs(Number(this.quantity)),
        previousStock: prevStock,
        newStock: calculatedNewStock,
        reason: this.reason
      });

      this.toastMessage.set('Movimiento registrado con éxito.');
      this.closeModal();

      await Promise.all([
        this.loadLogs(),
        this.loadProducts()
      ]);

    } catch (err: any) {
      this.toastMessage.set(err.message || 'Error guardando movimiento.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
