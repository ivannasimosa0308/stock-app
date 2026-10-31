import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  IonModal,
  IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  addCircleOutline,
  removeCircleOutline,
  downloadOutline,
  refreshOutline,
  closeOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  barChartOutline,
  cubeOutline,
  timeOutline,
  logOutOutline,
  searchOutline
} from 'ionicons/icons';

import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ExportService } from '../../../../core/services/export.service';
import { MovementLog, MovementType } from '../../../../core/models/inventory-log.model';
import { Product } from '../../../../core/models/product.model';

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
    IonModal,
    IonToast
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Control de entradas y salidas</ion-title>
        <ion-buttons slot="end">
          @if (authService.isAdmin()) {
            <ion-button (click)="router.navigate(['/admin'])">
              <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
              Dashboard
            </ion-button>
          }
          <ion-button (click)="router.navigate(['/movements'])" color="primary">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          <ion-button (click)="router.navigate(['/inventory'])">
            <ion-icon name="cube-outline" slot="start"></ion-icon>
            Catálogo
          </ion-button>
          <ion-button (click)="onLogout()" color="danger">
            <ion-icon name="log-out-outline" slot="start"></ion-icon>
            Salir
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container-fluid py-4 px-3 px-lg-4">
        <!-- Encabezado y Acciones Rápidas -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h4 class="fw-bold text-dark mb-0">Registro de movimientos: entradas y salidas</h4>
            <p class="text-muted small mb-0">
              Panel dividido de recepciones de almacén (entradas) y despachos de mercancía (salidas)
            </p>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 bg-white"
              (click)="loadLogs()"
              [disabled]="isLoading()"
            >
              <ion-icon name="refresh-outline"></ion-icon>
              <span>Refrescar</span>
            </button>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 bg-white"
              (click)="exportService.exportMovementsToCsv(logs())"
            >
              <ion-icon name="download-outline"></ion-icon>
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              class="btn btn-success btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 text-white shadow-sm"
              (click)="openMovementModal('IN')"
            >
              <ion-icon name="add-circle-outline"></ion-icon>
              <span>Nueva entrada</span>
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 text-white shadow-sm"
              (click)="openMovementModal('OUT')"
            >
              <ion-icon name="remove-circle-outline"></ion-icon>
              <span>Nueva salida</span>
            </button>
          </div>
        </div>

        <!-- Indicador superior de total real de existencias + buscador en tiempo real -->
        <div class="row g-3 mb-4 align-items-stretch">
          <div class="col-12 col-lg-4">
            <div class="invent-kpi-indigo p-3 h-100 d-flex justify-content-between align-items-center">
              <div>
                <div class="small opacity-75 fw-semibold">Total real de existencias</div>
                <div class="fs-3 fw-bold my-1">{{ totalRealStock() }} unidades</div>
                <div class="extra-small opacity-75">Stock físico actual consolidado en almacén ({{ products().length }} productos)</div>
              </div>
              <div class="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px;">
                <ion-icon name="cube-outline" class="fs-3 text-white"></ion-icon>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <div class="invent-card p-3 h-100 d-flex flex-column justify-content-center">
              <label class="form-label small fw-semibold text-secondary mb-2">
                Buscador en tiempo real de movimientos
              </label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0">
                  <ion-icon name="search-outline" class="text-muted"></ion-icon>
                </span>
                <input
                  type="text"
                  class="form-control border-start-0 bg-light"
                  placeholder="Filtrar entradas y salidas por producto, código SKU o motivo..."
                  [ngModel]="searchTerm()"
                  (ngModelChange)="searchTerm.set($event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- PANEL DIVIDIDO EN DOS COLUMNAS: ENTRADAS (IZQUIERDA) | SALIDAS (DERECHA) -->
        <div class="row g-4">
          <!-- COLUMNA 1: ENTRADAS DE MERCANCÍA (RECEPCIÓN) -->
          <div class="col-12 col-lg-6">
            <div class="invent-card p-4 h-100 border-top border-success border-4">
              <!-- Cabecera Columna Entradas -->
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
                <div class="d-flex align-items-center gap-2">
                  <div class="icon-circle bg-success-subtle text-success">
                    <ion-icon name="arrow-down-circle-outline" class="fs-4"></ion-icon>
                  </div>
                  <div>
                    <h5 class="fw-bold text-dark mb-0">Entradas de mercancía</h5>
                    <span class="text-muted extra-small">Recepción de proveedores y reposición de stock</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-success text-white fw-semibold rounded-pill px-3"
                  (click)="openMovementModal('IN')"
                >
                  Registrar entrada
                </button>
              </div>

              <!-- Resumen rápido de entradas -->
              <div class="invent-kpi-emerald p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div class="small opacity-75 fw-semibold">Total de unidades recibidas</div>
                  <div class="fs-4 fw-bold">+{{ totalUnitsIn() }} unidades</div>
                </div>
                <div class="text-end">
                  <span class="badge bg-white text-success rounded-pill px-3 py-1 fw-bold">
                    {{ entryLogs().length }} operaciones
                  </span>
                </div>
              </div>

              <!-- Lista Visual de Entradas -->
              <div class="d-flex flex-column gap-3">
                @if (entryLogs().length === 0) {
                  <div class="text-center py-5 text-muted small">
                    No hay registros de entrada que coincidan con la búsqueda.
                  </div>
                } @else {
                  @for (item of entryLogs(); track item.id) {
                    <div class="movement-item movement-in p-3 rounded-3">
                      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div class="d-flex align-items-center gap-3">
                          <img
                            [src]="getProductImage(item.sku)"
                            [alt]="item.productName"
                            class="rounded-3 border product-thumb"
                          />
                          <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                              <span class="badge bg-white text-secondary border extra-small">{{ item.sku }}</span>
                              <span class="text-muted extra-small">{{ item.timestamp | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>
                            <h6 class="fw-bold text-dark mb-1">{{ item.productName }}</h6>
                            <p class="text-muted extra-small mb-0">
                              <strong>Motivo:</strong> {{ item.reason }}
                            </p>
                          </div>
                        </div>

                        <div class="text-end flex-shrink-0">
                          <span class="badge bg-success fs-6 px-3 py-1 rounded-pill">
                            +{{ item.quantity }} uds.
                          </span>
                          <div class="text-muted extra-small mt-1">
                            Stock: {{ item.previousStock }} → <strong>{{ item.newStock }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- COLUMNA 2: SALIDAS DE MERCANCÍA (DESPACHO / BAJAS) -->
          <div class="col-12 col-lg-6">
            <div class="invent-card p-4 h-100 border-top border-danger border-4">
              <!-- Cabecera Columna Salidas -->
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
                <div class="d-flex align-items-center gap-2">
                  <div class="icon-circle bg-danger-subtle text-danger">
                    <ion-icon name="arrow-up-circle-outline" class="fs-4"></ion-icon>
                  </div>
                  <div>
                    <h5 class="fw-bold text-dark mb-0">Salidas de mercancía</h5>
                    <span class="text-muted extra-small">Despachos a clientes, asignaciones y bajas</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-danger text-white fw-semibold rounded-pill px-3"
                  (click)="openMovementModal('OUT')"
                >
                  Registrar salida
                </button>
              </div>

              <!-- Resumen rápido de salidas -->
              <div class="invent-kpi-coral p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div class="small opacity-75 fw-semibold">Total de unidades despachadas</div>
                  <div class="fs-4 fw-bold">-{{ totalUnitsOut() }} unidades</div>
                </div>
                <div class="text-end">
                  <span class="badge bg-white text-danger rounded-pill px-3 py-1 fw-bold">
                    {{ exitLogs().length }} operaciones
                  </span>
                </div>
              </div>

              <!-- Lista Visual de Salidas -->
              <div class="d-flex flex-column gap-3">
                @if (exitLogs().length === 0) {
                  <div class="text-center py-5 text-muted small">
                    No hay registros de salida que coincidan con la búsqueda.
                  </div>
                } @else {
                  @for (item of exitLogs(); track item.id) {
                    <div class="movement-item movement-out p-3 rounded-3">
                      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div class="d-flex align-items-center gap-3">
                          <img
                            [src]="getProductImage(item.sku)"
                            [alt]="item.productName"
                            class="rounded-3 border product-thumb"
                          />
                          <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                              <span class="badge bg-white text-secondary border extra-small">{{ item.sku }}</span>
                              <span class="text-muted extra-small">{{ item.timestamp | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>
                            <h6 class="fw-bold text-dark mb-1">{{ item.productName }}</h6>
                            <p class="text-muted extra-small mb-0">
                              <strong>Motivo:</strong> {{ item.reason }}
                            </p>
                          </div>
                        </div>

                        <div class="text-end flex-shrink-0">
                          <span class="badge bg-danger fs-6 px-3 py-1 rounded-pill">
                            -{{ item.quantity }} uds.
                          </span>
                          <div class="text-muted extra-small mt-1">
                            Stock: {{ item.previousStock }} → <strong>{{ item.newStock }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Registrar Nueva Entrada o Salida -->
      <ion-modal [isOpen]="isModalOpen()" (didDismiss)="closeModal()">
        <ng-template>
          <ion-header>
            <ion-toolbar [color]="movementType === 'IN' ? 'success' : 'danger'">
              <ion-title>
                {{ movementType === 'IN' ? 'Registrar entrada de mercancía' : 'Registrar salida de mercancía' }}
              </ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeModal()">
                  <ion-icon name="close-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding invent-shell">
            <div class="invent-card p-4">
              <form (ngSubmit)="submitMovement()">
                <!-- Selector rápido entrada vs salida -->
                <div class="mb-3">
                  <label class="form-label fw-semibold small text-secondary">Tipo de operación</label>
                  <div class="row g-2">
                    <div class="col-6">
                      <button
                        type="button"
                        class="btn w-100 fw-semibold"
                        [ngClass]="movementType === 'IN' ? 'btn-success text-white' : 'btn-outline-success'"
                        (click)="movementType = 'IN'"
                      >
                        Entrada (recepción)
                      </button>
                    </div>
                    <div class="col-6">
                      <button
                        type="button"
                        class="btn w-100 fw-semibold"
                        [ngClass]="movementType === 'OUT' ? 'btn-danger text-white' : 'btn-outline-danger'"
                        (click)="movementType = 'OUT'"
                      >
                        Salida (despacho)
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Selección de Producto -->
                <div class="mb-3">
                  <label class="form-label fw-semibold small text-secondary">Selecciona Producto *</label>
                  <select
                    class="form-select"
                    [(ngModel)]="selectedProductId"
                    name="selectedProductId"
                    required
                  >
                    <option value="">Elige un producto del catálogo...</option>
                    @for (p of products(); track p.id) {
                      <option [value]="p.id">
                        [{{ p.sku }}] {{ p.name }} (Stock actual: {{ p.stock }} uds.)
                      </option>
                    }
                  </select>
                </div>

                <!-- Cantidad -->
                <div class="mb-3">
                  <label class="form-label fw-semibold small text-secondary">Cantidad de Unidades *</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="quantity"
                    name="quantity"
                    min="1"
                    required
                  />
                </div>

                <!-- Motivo -->
                <div class="mb-4">
                  <label class="form-label fw-semibold small text-secondary">Motivo / Albarán de Referencia *</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="reason"
                    name="reason"
                    [placeholder]="movementType === 'IN' ? 'Ej. Recepción albarán proveedor #PO-2041' : 'Ej. Despacho pedido cliente #890'"
                    required
                  />
                </div>

                <div class="d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-outline-secondary px-4 fw-semibold" (click)="closeModal()">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="btn px-4 fw-bold text-white"
                    [ngClass]="movementType === 'IN' ? 'btn-success' : 'btn-danger'"
                    [disabled]="!selectedProductId || quantity < 1 || !reason || isSubmitting()"
                  >
                    {{ movementType === 'IN' ? 'Confirmar Entrada' : 'Confirmar Salida' }}
                  </button>
                </div>
              </form>
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>

      <ion-toast
        [isOpen]="toastMessage() !== null"
        [message]="toastMessage() || ''"
        [duration]="3000"
        (didDismiss)="toastMessage.set(null)"
      ></ion-toast>
    </ion-content>
  `,
  styles: [`
    .extra-small {
      font-size: 0.75rem;
    }
    .icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .product-thumb {
      width: 48px;
      height: 48px;
      object-fit: cover;
      background-color: #ffffff;
      flex-shrink: 0;
    }
    .movement-item {
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .movement-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .movement-in {
      background-color: #eef6fa;
      border: 1px solid #b8d9eb;
    }
    .movement-out {
      background-color: #fdf6ec;
      border: 1px solid #edd0a5;
    }
  `]
})
export class MovementHistoryPage implements OnInit {
  authService = inject(AuthService);
  inventoryService = inject(InventoryService);
  exportService = inject(ExportService);
  router = inject(Router);

  logs = signal<MovementLog[]>([]);
  products = signal<Product[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  selectedProductId: string = '';
  movementType: MovementType = 'IN';
  quantity: number = 1;
  reason: string = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      addCircleOutline,
      removeCircleOutline,
      downloadOutline,
      refreshOutline,
      closeOutline,
      arrowDownCircleOutline,
      arrowUpCircleOutline,
      barChartOutline,
      cubeOutline,
      timeOutline,
      logOutOutline,
      searchOutline
    });
  }

  // Filtrado reactivo separado en dos columnas: Entradas (IN) y Salidas (OUT / DAMAGE)
  readonly filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const all = this.logs();
    if (!term) return all;
    return all.filter(l =>
      l.productName.toLowerCase().includes(term) ||
      l.sku.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term)) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(term))
    );
  });

  readonly entryLogs = computed(() => {
    return this.filteredLogs().filter(l => l.movementType === 'IN' || l.movementType === 'ADJUSTMENT');
  });

  readonly exitLogs = computed(() => {
    return this.filteredLogs().filter(l => l.movementType === 'OUT' || l.movementType === 'DAMAGE');
  });

  readonly totalUnitsIn = computed(() => {
    return this.entryLogs().reduce((acc, l) => acc + l.quantity, 0);
  });

  readonly totalUnitsOut = computed(() => {
    return this.exitLogs().reduce((acc, l) => acc + l.quantity, 0);
  });

  readonly totalRealStock = computed(() => {
    return this.products().reduce((acc, p) => acc + p.stock, 0);
  });

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
    } catch {
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

  getProductImage(sku: string): string {
    const found = this.products().find(p => p.sku === sku);
    return found?.image_url || 'https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/products/dell-xps-15.jpg';
  }

  openMovementModal(type: MovementType): void {
    this.movementType = type;
    this.isModalOpen.set(true);
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

      this.toastMessage.set(
        this.movementType === 'IN'
          ? 'Entrada de mercancía registrada con éxito.'
          : 'Salida de mercancía registrada con éxito.'
      );
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

  async onLogout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
