import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  documentTextOutline,
  refreshOutline,
  arrowBackOutline,
  logOutOutline,
  analyticsOutline,
  timeOutline,
  serverOutline,
  addCircleOutline,
  cubeOutline,
  trendingUpOutline,
  alertCircleOutline,
  barChartOutline
} from 'ionicons/icons';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ExportService } from '../../../core/services/export.service';
import { Product, Category } from '../../../core/models/product.model';
import { MovementLog } from '../../../core/models/inventory-log.model';
import { EmployeeProfileCardComponent } from '../../../shared/components/employee-profile-card/employee-profile-card.component';

export type DashboardFilterMode = 'units' | 'valuation' | 'low-stock';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonSpinner,
    EmployeeProfileCardComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Panel de administración</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/admin'])" color="primary">
            <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
            Dashboard
          </ion-button>
          <ion-button (click)="router.navigate(['/movements'])">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          <ion-button (click)="router.navigate(['/inventory'])">
            <ion-icon name="cube-outline" slot="start"></ion-icon>
            Catálogo
          </ion-button>
          <ion-button (click)="onLogout()" aria-label="Cerrar sesión" color="danger">
            <ion-icon name="log-out-outline" slot="start"></ion-icon>
            Salir
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container-fluid py-4 px-3 px-lg-4">
        <!-- Barra superior de acciones y exportación -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h4 class="fw-bold text-dark mb-0">Cuadro de mando ejecutivo</h4>
            <p class="text-muted small mb-0">
              Control de flujo de stock, comportamiento mensual y métricas de inventario
            </p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 bg-white"
              (click)="loadDashboardData()"
            >
              <ion-icon name="refresh-outline"></ion-icon>
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              class="btn btn-success btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 text-white shadow-sm"
              (click)="exportPdf()"
            >
              <ion-icon name="document-text-outline"></ion-icon>
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 shadow-sm"
              (click)="exportCsv()"
            >
              <ion-icon name="download-outline"></ion-icon>
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              class="btn btn-dark btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2"
              (click)="router.navigate(['/inventory/new'])"
            >
              <ion-icon name="add-circle-outline"></ion-icon>
              <span>Nuevo producto</span>
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="invent-card p-5 text-center my-4">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p class="text-muted mt-2 mb-0">Cargando métricas del inventario...</p>
          </div>
        } @else {
          <!-- FILA SUPERIOR: Perfil de empleado (izquierda) + Overview de lado a ancho completo (derecha) -->
          <div class="row g-4 align-items-stretch mb-4">
            <!-- Columna izquierda: Perfil de empleado + cronómetro -->
            <div class="col-12 col-lg-3">
              <app-employee-profile-card
                [totalProducts]="products().length"
                [totalMovements]="movementsCount()"
              ></app-employee-profile-card>
            </div>

            <!-- Columna derecha superior: Overview — Flujo y comportamiento de stock -->
            <div class="col-12 col-lg-9">
              <div class="invent-card p-4 h-100 d-flex flex-column justify-content-between">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                  <div>
                    <h5 class="fw-bold text-dark mb-1">
                      <ion-icon name="analytics-outline" class="text-primary me-1 align-middle"></ion-icon>
                      Overview — Flujo y comportamiento de stock
                    </h5>
                    <p class="text-muted extra-small mb-0">
                      {{ chartMode() === 'months'
                        ? 'Evolución mensual de entradas, salidas y nivel de inventario (enero - junio)'
                        : 'Comparativa de comportamiento de stock actual frente a umbral mínimo por producto' }}
                    </p>
                  </div>

                  <!-- Selector interactivo: Por meses / Por productos -->
                  <div class="btn-group btn-group-sm" role="group" aria-label="Selector de modo de gráfico">
                    <button
                      type="button"
                      class="btn fw-semibold"
                      [ngClass]="chartMode() === 'months' ? 'btn-primary' : 'btn-outline-primary'"
                      (click)="switchFlowMode('months')"
                    >
                      Por meses
                    </button>
                    <button
                      type="button"
                      class="btn fw-semibold"
                      [ngClass]="chartMode() === 'products' ? 'btn-primary' : 'btn-outline-primary'"
                      (click)="switchFlowMode('products')"
                    >
                      Por productos
                    </button>
                  </div>
                </div>

                <div class="chart-flow-box flex-grow-1">
                  <canvas #flowChartCanvas></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN INFERIOR: 3 Tarjetas de filtro directo + Lista desplegada justo debajo -->
          <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
              <div
                class="invent-kpi-coral p-3 h-100 d-flex flex-column justify-content-between kpi-clickable"
                [class.kpi-selected]="activeFilter() === 'valuation'"
                style="cursor: pointer;"
                (click)="setDashboardFilter('valuation')"
              >
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                  <span class="small opacity-75 fw-semibold">Valoración de stock</span>
                  <span class="badge bg-white text-danger rounded-pill">
                    {{ activeFilter() === 'valuation' ? 'Filtro activo' : 'Filtrar por valor' }}
                  </span>
                </div>
                <div class="fs-4 fw-bold my-2 text-break">
                  {{ (totalValue() | currency:'EUR':'symbol':'1.0-0') || '0 €' }}
                </div>
                <div class="extra-small opacity-75">Pulsa para ordenar por valoración económica</div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div
                class="invent-kpi-amber p-3 h-100 d-flex flex-column justify-content-between kpi-clickable"
                [class.kpi-selected]="activeFilter() === 'units'"
                style="cursor: pointer;"
                (click)="setDashboardFilter('units')"
              >
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                  <span class="small opacity-75 fw-semibold">Unidades físicas</span>
                  <span class="badge bg-white text-warning rounded-pill">
                    {{ activeFilter() === 'units' ? 'Filtro activo' : 'Ver unidades' }}
                  </span>
                </div>
                <div class="fs-4 fw-bold my-2 text-break">
                  {{ totalUnits() }} uds.
                </div>
                <div class="extra-small opacity-75">{{ products().length }} referencias activas en almacén</div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div
                class="invent-kpi-indigo p-3 h-100 d-flex flex-column justify-content-between kpi-clickable"
                [class.kpi-selected]="activeFilter() === 'low-stock'"
                style="cursor: pointer;"
                (click)="setDashboardFilter('low-stock')"
              >
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                  <span class="small opacity-75 fw-semibold">Alertas de stock bajo</span>
                  <span class="badge bg-white text-primary rounded-pill">
                    {{ activeFilter() === 'low-stock' ? 'Filtro activo' : 'Ver faltantes' }}
                  </span>
                </div>
                <div class="fs-4 fw-bold my-2 text-break">
                  {{ lowStockCount() }} ítems
                </div>
                <div class="extra-small opacity-75">Pulsa para ver productos con stock bajo</div>
              </div>
            </div>
          </div>

          <!-- LISTA DINÁMICA DE PRODUCTOS (Justo debajo de los filtros) -->
          <div class="invent-card p-4" id="dashboard-products-section">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                @if (activeFilter() === 'low-stock') {
                  <h5 class="fw-bold text-danger mb-0">
                    Productos en alerta de stock bajo ({{ filteredDashboardProducts().length }})
                  </h5>
                  <p class="text-muted extra-small mb-0">
                    Artículos con existencias iguales o inferiores al stock mínimo requerido
                  </p>
                } @else if (activeFilter() === 'valuation') {
                  <h5 class="fw-bold text-dark mb-0">
                    Productos por valoración de stock ({{ filteredDashboardProducts().length }})
                  </h5>
                  <p class="text-muted extra-small mb-0">
                    Artículos ordenados de mayor a menor capital inmovilizado en almacén
                  </p>
                } @else {
                  <h5 class="fw-bold text-dark mb-0">
                    Productos por unidades físicas ({{ filteredDashboardProducts().length }})
                  </h5>
                  <p class="text-muted extra-small mb-0">
                    Listado general de existencias físicas y valoración unitaria
                  </p>
                }
              </div>
              <div class="d-flex flex-wrap gap-2">
                @if (activeFilter() !== 'units') {
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold"
                    (click)="setDashboardFilter('units')"
                  >
                    Ver todos ({{ products().length }})
                  </button>
                }
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                  (click)="router.navigate(['/inventory'])"
                >
                  Ir al catálogo completo
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead class="table-light">
                  <tr class="text-muted extra-small">
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th class="text-center">Stock / Mínimo</th>
                    <th class="text-end">Precio unitario</th>
                    <th class="text-end">Valoración total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (prod of filteredDashboardProducts(); track prod.id) {
                    <tr
                      class="product-row"
                      style="cursor: pointer;"
                      (click)="router.navigate(['/inventory/edit', prod.id])"
                    >
                      <td>
                        <div class="d-flex align-items-center gap-3">
                          <img
                            [src]="prod.image_url"
                            [alt]="prod.name"
                            class="rounded-3 border product-thumb"
                          />
                          <div>
                            <div class="fw-semibold text-dark small">{{ prod.name }}</div>
                            <div class="text-muted extra-small">{{ prod.sku }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge bg-light text-secondary border">
                          {{ prod.category?.name || 'General' }}
                        </span>
                      </td>
                      <td class="text-center">
                        <span
                          class="badge rounded-pill px-2 py-1"
                          [ngClass]="prod.stock <= prod.min_stock ? 'bg-danger text-white' : 'bg-success-subtle text-success'"
                        >
                          {{ prod.stock }} / mín. {{ prod.min_stock }}
                        </span>
                      </td>
                      <td class="text-end text-secondary small">
                        {{ prod.unit_price | currency:'EUR':'symbol':'1.0-0' }}
                      </td>
                      <td class="text-end fw-bold text-dark small">
                        {{ (prod.stock * prod.unit_price) | currency:'EUR':'symbol':'1.0-0' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .extra-small {
      font-size: 0.75rem;
    }
    .chart-flow-box {
      position: relative;
      min-height: 270px;
      width: 100%;
    }
    .product-thumb {
      width: 42px;
      height: 42px;
      object-fit: cover;
      background-color: #f2f4f6;
    }
    .product-row:hover {
      background-color: #f2f6f9;
    }
    .kpi-clickable {
      transition: transform 0.18s ease, outline 0.18s ease;
    }
    .kpi-clickable:hover {
      transform: translateY(-2px);
    }
    .kpi-selected {
      outline: 3px solid #2889b8;
      outline-offset: 2px;
    }
  `]
})
export class AdminDashboardPage implements OnInit, AfterViewInit {
  authService = inject(AuthService);
  inventoryService = inject(InventoryService);
  exportService = inject(ExportService);
  router = inject(Router);

  @ViewChild('flowChartCanvas') flowCanvas?: ElementRef<HTMLCanvasElement>;

  private flowChartInstance?: Chart;

  isLoading = signal<boolean>(true);
  chartMode = signal<'months' | 'products'>('months');
  activeFilter = signal<DashboardFilterMode>('units');

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  movements = signal<MovementLog[]>([]);

  totalValue = signal<number>(0);
  totalUnits = signal<number>(0);
  lowStockCount = signal<number>(0);
  movementsCount = signal<number>(0);

  readonly filteredDashboardProducts = computed(() => {
    const all = [...this.products()];
    const mode = this.activeFilter();
    if (mode === 'low-stock') {
      return all.filter(p => p.stock <= p.min_stock);
    }
    if (mode === 'valuation') {
      return all.sort((a, b) => (b.stock * b.unit_price) - (a.stock * a.unit_price));
    }
    return all.sort((a, b) => b.stock - a.stock);
  });

  constructor() {
    addIcons({
      downloadOutline,
      documentTextOutline,
      refreshOutline,
      arrowBackOutline,
      logOutOutline,
      analyticsOutline,
      timeOutline,
      serverOutline,
      addCircleOutline,
      cubeOutline,
      trendingUpOutline,
      alertCircleOutline,
      barChartOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  ngAfterViewInit(): void {}

  async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);

    try {
      const [fetchedProducts, fetchedCategories, fetchedLogs] = await Promise.all([
        this.inventoryService.getProducts(),
        this.inventoryService.getCategories(),
        this.inventoryService.getMovements(50)
      ]);

      this.products.set(fetchedProducts);
      this.categories.set(fetchedCategories);
      this.movements.set(fetchedLogs);

      this.totalValue.set(fetchedProducts.reduce((acc, p) => acc + (p.stock * p.unit_price), 0));
      this.totalUnits.set(fetchedProducts.reduce((acc, p) => acc + p.stock, 0));
      this.lowStockCount.set(fetchedProducts.filter(p => p.stock <= p.min_stock).length);
      this.movementsCount.set(fetchedLogs.length);

      this.isLoading.set(false);

      setTimeout(() => {
        this.renderFlowChart();
      }, 80);

    } catch (error) {
      console.error('Error en la carga de datos del Dashboard:', error);
      this.isLoading.set(false);
    }
  }

  setDashboardFilter(mode: DashboardFilterMode): void {
    this.activeFilter.set(mode);
  }

  switchFlowMode(mode: 'months' | 'products'): void {
    this.chartMode.set(mode);
    setTimeout(() => this.renderFlowChart(), 30);
  }

  private renderFlowChart(): void {
    if (!this.flowCanvas) return;

    if (this.flowChartInstance) {
      this.flowChartInstance.destroy();
    }

    const canvas = this.flowCanvas.nativeElement;
    const ctx = canvas.getContext('2d');

    let petrolGradient: string | CanvasGradient = 'rgba(24, 90, 122, 0.25)';
    let ochreGradient: string | CanvasGradient = 'rgba(212, 144, 53, 0.16)';
    if (ctx) {
      petrolGradient = ctx.createLinearGradient(0, 0, 0, 260);
      petrolGradient.addColorStop(0, 'rgba(24, 90, 122, 0.40)');
      petrolGradient.addColorStop(0.75, 'rgba(40, 137, 184, 0.12)');
      petrolGradient.addColorStop(1, 'rgba(40, 137, 184, 0.0)');

      ochreGradient = ctx.createLinearGradient(0, 0, 0, 260);
      ochreGradient.addColorStop(0, 'rgba(212, 144, 53, 0.30)');
      ochreGradient.addColorStop(1, 'rgba(212, 144, 53, 0.0)');
    }

    const isMonthly = this.chartMode() === 'months';
    const currentTotal = this.totalUnits() || 83;

    const labels = isMonthly
      ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio']
      : this.products().map(p => p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name);

    const primarySeries = isMonthly
      ? [45, 58, 52, 74, 68, currentTotal]
      : this.products().map(p => p.stock);

    const secondarySeries = isMonthly
      ? [22, 31, 38, 29, 44, 36]
      : this.products().map(p => p.min_stock);

    this.flowChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: isMonthly ? 'Flujo de existencias (stock activo)' : 'Stock actual (unidades)',
            data: primarySeries,
            borderColor: '#185a7a',
            backgroundColor: petrolGradient,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#185a7a',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true
          },
          {
            label: isMonthly ? 'Salidas / demanda mensual' : 'Umbral mínimo de seguridad',
            data: secondarySeries,
            borderColor: '#d49035',
            backgroundColor: ochreGradient,
            borderWidth: 2,
            borderDash: isMonthly ? [] : [5, 5],
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#d49035',
            pointRadius: 3,
            tension: 0.42,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(226, 232, 240, 0.7)'
            },
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  exportPdf(): void {
    this.exportService.exportInventoryToPdf(this.filteredDashboardProducts());
  }

  exportCsv(): void {
    this.exportService.exportProductsToCsv(this.filteredDashboardProducts());
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
