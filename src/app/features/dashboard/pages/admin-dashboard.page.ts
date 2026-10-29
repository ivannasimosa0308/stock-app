import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
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
  pieChartOutline,
  analyticsOutline,
  timeOutline,
  serverOutline,
  addCircleOutline,
  cubeOutline,
  trendingUpOutline,
  alertCircleOutline
} from 'ionicons/icons';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ExportService } from '../../../core/services/export.service';
import { Product, Category } from '../../../core/models/product.model';
import { MovementLog } from '../../../core/models/inventory-log.model';
import { EmployeeProfileCardComponent } from '../../../shared/components/employee-profile-card/employee-profile-card.component';

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
        <ion-buttons slot="start">
          <ion-button (click)="router.navigate(['/inventory'])" title="Ir al Catálogo de Inventario">
            <ion-icon name="cube-outline" slot="start"></ion-icon>
            Catálogo
          </ion-button>
        </ion-buttons>
        <ion-title>INVENT — Store Inventory Dashboard (Admin)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/movements'])">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
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
        <!-- Barra Superior de Acciones y Exportación -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h4 class="fw-bold text-dark mb-0">Cuadro de Mando Ejecutivo</h4>
            <p class="text-muted small mb-0">
              Control de flujo de stock, comportamiento mensual y almacenamiento multimedia en Supabase
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
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="invent-card p-5 text-center my-4">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p class="text-muted mt-2 mb-0">Sincronizando métricas e imágenes desde Supabase...</p>
          </div>
        } @else {
          <!-- Layout en 3 Columnas con Bootstrap 5 Grid (Inspirado en Store Inventory Dashboard) -->
          <div class="row g-4">
            <!-- COLUMNA IZQUIERDA: Perfil de Empleado + Foto + Cronómetro Clock-In/Out -->
            <div class="col-12 col-lg-3">
              <app-employee-profile-card
                [totalProducts]="products().length"
                [totalMovements]="movementsCount()"
              ></app-employee-profile-card>
            </div>

            <!-- COLUMNA CENTRAL: Tarjetas KPI + Gráfico de Flujo (Overview) + Featured Products -->
            <div class="col-12 col-lg-6">
              <!-- 3 Tarjetas KPI con Degradado -->
              <div class="row g-3 mb-4">
                <div class="col-12 col-sm-4">
                  <div class="invent-kpi-coral p-3 h-100 d-flex flex-column justify-content-between">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="small opacity-75 fw-semibold">Valoración Stock</span>
                      <span class="badge bg-white text-danger rounded-pill">+12%</span>
                    </div>
                    <div class="fs-4 fw-bold my-2">
                      {{ (totalValue() | currency:'EUR':'symbol':'1.0-0') || '0 €' }}
                    </div>
                    <div class="extra-small opacity-75">Capital activo en almacén</div>
                  </div>
                </div>

                <div class="col-12 col-sm-4">
                  <div class="invent-kpi-amber p-3 h-100 d-flex flex-column justify-content-between">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="small opacity-75 fw-semibold">Unidades Físicas</span>
                      <span class="badge bg-white text-warning rounded-pill">+5%</span>
                    </div>
                    <div class="fs-4 fw-bold my-2">
                      {{ totalUnits() }} uds.
                    </div>
                    <div class="extra-small opacity-75">{{ products().length }} referencias activas</div>
                  </div>
                </div>

                <div class="col-12 col-sm-4">
                  <div class="invent-kpi-indigo p-3 h-100 d-flex flex-column justify-content-between">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="small opacity-75 fw-semibold">Alertas Críticas</span>
                      <span class="badge bg-white text-primary rounded-pill">
                        {{ lowStockCount() > 0 ? 'Atención' : 'Óptimo' }}
                      </span>
                    </div>
                    <div class="fs-4 fw-bold my-2">
                      {{ lowStockCount() }} ítems
                    </div>
                    <div class="extra-small opacity-75">Por debajo de stock mínimo</div>
                  </div>
                </div>
              </div>

              <!-- GRÁFICO DE FLUJO (OVERVIEW) — Sin barras/torres, curva suave con degradado -->
              <div class="invent-card p-4 mb-4">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h5 class="fw-bold text-dark mb-0">
                      <ion-icon name="analytics-outline" class="text-primary me-1 align-middle"></ion-icon>
                      Overview — Flujo y Comportamiento de Stock
                    </h5>
                    <p class="text-muted extra-small mb-0">
                      {{ chartMode() === 'months'
                        ? 'Evolución mensual de entradas, salidas y nivel de inventario (Ene - Jun)'
                        : 'Comparativa de comportamiento de stock actual vs umbral mínimo por producto' }}
                    </p>
                  </div>

                  <!-- Selector interactivo: Por Meses vs Por Productos -->
                  <div class="btn-group btn-group-sm" role="group" aria-label="Selector de modo de gráfico">
                    <button
                      type="button"
                      class="btn fw-semibold"
                      [ngClass]="chartMode() === 'months' ? 'btn-primary' : 'btn-outline-primary'"
                      (click)="switchFlowMode('months')"
                    >
                      Por Meses
                    </button>
                    <button
                      type="button"
                      class="btn fw-semibold"
                      [ngClass]="chartMode() === 'products' ? 'btn-primary' : 'btn-outline-primary'"
                      (click)="switchFlowMode('products')"
                    >
                      Por Productos
                    </button>
                  </div>
                </div>

                <div class="chart-flow-box">
                  <canvas #flowChartCanvas></canvas>
                </div>
              </div>

              <!-- FEATURED PRODUCTS — Lista visual con miniaturas de Supabase Storage -->
              <div class="invent-card p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 class="fw-bold text-dark mb-0">Productos Destacados (Catálogo Visual)</h5>
                    <p class="text-muted extra-small mb-0">Imágenes sincronizadas con Supabase Storage</p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                    (click)="router.navigate(['/inventory'])"
                  >
                    Ver Catálogo Completo
                  </button>
                </div>

                <div class="table-responsive">
                  <table class="table align-middle mb-0">
                    <thead class="table-light">
                      <tr class="text-muted extra-small text-uppercase">
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th class="text-center">Stock</th>
                        <th class="text-end">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (prod of products().slice(0, 5); track prod.id) {
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
                              [ngClass]="prod.stock <= prod.min_stock ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'"
                            >
                              {{ prod.stock }} uds.
                            </span>
                          </td>
                          <td class="text-end fw-bold text-dark small">
                            {{ prod.unit_price | currency:'EUR':'symbol':'1.0-0' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: Distribución Categorías + Personal en Turno & Últimos Movimientos -->
            <div class="col-12 col-lg-3">
              <!-- Tarjeta de Distribución por Categorías -->
              <div class="invent-card p-4 mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-bold text-dark">Cuota por Categoría</span>
                  <span class="badge bg-primary-subtle text-primary rounded-pill">Catálogo</span>
                </div>
                <div class="chart-doughnut-box">
                  <canvas #categoryChartCanvas></canvas>
                </div>
              </div>

              <!-- Tarjeta de Personal / Operadores Recientes (Estilo "Valuable Customer" de la referencia) -->
              <div class="invent-card p-4 mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="fw-bold text-dark">Equipo y Actividad</span>
                  <span class="badge bg-success-subtle text-success rounded-pill">En vivo</span>
                </div>

                <!-- Empleados con foto -->
                <div class="d-flex flex-column gap-3 mb-3">
                  @for (emp of teamMembers; track emp.name) {
                    <div class="d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center gap-2">
                        <img
                          [src]="emp.avatar"
                          [alt]="emp.name"
                          class="rounded-circle border"
                          style="width: 38px; height: 38px; object-fit: cover;"
                        />
                        <div>
                          <div class="fw-semibold text-dark small leading-tight">{{ emp.name }}</div>
                          <div class="text-muted extra-small">{{ emp.role }}</div>
                        </div>
                      </div>
                      <span class="badge rounded-pill" [ngClass]="emp.badgeClass">
                        {{ emp.status }}
                      </span>
                    </div>
                  }
                </div>

                <hr class="my-3 text-muted" />

                <div class="fw-bold text-dark small mb-2">Últimos Movimientos</div>
                <div class="d-flex flex-column gap-2">
                  @for (mov of recentMovements(); track mov.id) {
                    <div class="p-2 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                      <div class="text-truncate pe-2">
                        <div class="fw-semibold text-dark extra-small text-truncate">{{ mov.productName }}</div>
                        <div class="text-muted" style="font-size: 0.68rem;">{{ mov.reason }}</div>
                      </div>
                      <span
                        class="badge rounded-pill"
                        [ngClass]="mov.movementType === 'IN' ? 'bg-success' : 'bg-danger'"
                      >
                        {{ mov.movementType === 'IN' ? '+' : '-' }}{{ mov.quantity }}
                      </span>
                    </div>
                  }
                </div>
              </div>
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
      height: 265px;
      width: 100%;
    }
    .chart-doughnut-box {
      position: relative;
      height: 210px;
      width: 100%;
    }
    .product-thumb {
      width: 42px;
      height: 42px;
      object-fit: cover;
      background-color: #f8fafc;
    }
    .product-row:hover {
      background-color: #f8fafc;
    }
  `]
})
export class AdminDashboardPage implements OnInit, AfterViewInit {
  authService = inject(AuthService);
  inventoryService = inject(InventoryService);
  exportService = inject(ExportService);
  router = inject(Router);

  @ViewChild('flowChartCanvas') flowCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChartCanvas') categoryCanvas?: ElementRef<HTMLCanvasElement>;

  private flowChartInstance?: Chart;
  private categoryChartInstance?: Chart;

  isLoading = signal<boolean>(true);
  chartMode = signal<'months' | 'products'>('months');

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  movements = signal<MovementLog[]>([]);

  totalValue = signal<number>(0);
  totalUnits = signal<number>(0);
  lowStockCount = signal<number>(0);
  movementsCount = signal<number>(0);
  recentMovements = signal<MovementLog[]>([]);

  teamMembers = [
    {
      name: 'Ivanna Simosa',
      role: 'Directora Logística (Admin)',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      status: 'En turno',
      badgeClass: 'bg-success-subtle text-success'
    },
    {
      name: 'Carlos Méndez',
      role: 'Operador Planta 1',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      status: 'Activo',
      badgeClass: 'bg-primary-subtle text-primary'
    },
    {
      name: 'Laura Gómez',
      role: 'Auditora de Recepción',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      status: 'Almacén B',
      badgeClass: 'bg-secondary-subtle text-secondary'
    }
  ];

  constructor() {
    addIcons({
      downloadOutline,
      documentTextOutline,
      refreshOutline,
      arrowBackOutline,
      logOutOutline,
      pieChartOutline,
      analyticsOutline,
      timeOutline,
      serverOutline,
      addCircleOutline,
      cubeOutline,
      trendingUpOutline,
      alertCircleOutline
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
      this.recentMovements.set(fetchedLogs.slice(0, 4));

      this.totalValue.set(fetchedProducts.reduce((acc, p) => acc + (p.stock * p.unit_price), 0));
      this.totalUnits.set(fetchedProducts.reduce((acc, p) => acc + p.stock, 0));
      this.lowStockCount.set(fetchedProducts.filter(p => p.stock <= p.min_stock).length);
      this.movementsCount.set(fetchedLogs.length);

      this.isLoading.set(false);

      setTimeout(() => {
        this.renderFlowChart();
        this.renderCategoryChart(fetchedProducts, fetchedCategories);
      }, 80);

    } catch (error) {
      console.error('Error en la carga de datos del Dashboard:', error);
      this.isLoading.set(false);
    }
  }

  switchFlowMode(mode: 'months' | 'products'): void {
    this.chartMode.set(mode);
    setTimeout(() => this.renderFlowChart(), 30);
  }

  /**
   * Renderiza el gráfico de flujo tipo onda suavizada (Spline Area Chart)
   * inspirado en el bloque "Overview" de la imagen de referencia.
   */
  private renderFlowChart(): void {
    if (!this.flowCanvas) return;

    if (this.flowChartInstance) {
      this.flowChartInstance.destroy();
    }

    const canvas = this.flowCanvas.nativeElement;
    const ctx = canvas.getContext('2d');

    // Crear degradado vertical morado/índigo como en la imagen de referencia
    let purpleGradient: string | CanvasGradient = 'rgba(91, 71, 251, 0.25)';
    let coralGradient: string | CanvasGradient = 'rgba(255, 107, 74, 0.12)';
    if (ctx) {
      purpleGradient = ctx.createLinearGradient(0, 0, 0, 250);
      purpleGradient.addColorStop(0, 'rgba(91, 71, 251, 0.42)');
      purpleGradient.addColorStop(0.75, 'rgba(91, 71, 251, 0.08)');
      purpleGradient.addColorStop(1, 'rgba(91, 71, 251, 0.0)');

      coralGradient = ctx.createLinearGradient(0, 0, 0, 250);
      coralGradient.addColorStop(0, 'rgba(255, 107, 74, 0.28)');
      coralGradient.addColorStop(1, 'rgba(255, 107, 74, 0.0)');
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
            label: isMonthly ? 'Flujo de Existencias (Stock Activo)' : 'Stock Actual (Unidades)',
            data: primarySeries,
            borderColor: '#5b47fb',
            backgroundColor: purpleGradient,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#5b47fb',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true
          },
          {
            label: isMonthly ? 'Salidas / Demanda Mensual' : 'Umbral Mínimo de Seguridad',
            data: secondarySeries,
            borderColor: '#ff6b4a',
            backgroundColor: coralGradient,
            borderWidth: 2,
            borderDash: isMonthly ? [] : [5, 5],
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#ff6b4a',
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

  private renderCategoryChart(products: Product[], categories: Category[]): void {
    if (!this.categoryCanvas) return;

    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
    }

    const categoryCounts: Record<string, number> = {};
    categories.forEach(c => categoryCounts[c.name] = 0);

    products.forEach(p => {
      const catName = p.category?.name || 'General';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + p.stock;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    this.categoryChartInstance = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#5b47fb',
            '#ff6b4a',
            '#ffaa2c',
            '#10b981',
            '#0ea5e9'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  exportPdf(): void {
    this.exportService.exportInventoryToPdf(this.products());
  }

  exportCsv(): void {
    this.exportService.exportProductsToCsv(this.products());
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
