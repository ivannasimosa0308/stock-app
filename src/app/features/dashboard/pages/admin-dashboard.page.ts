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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  documentTextOutline,
  refreshOutline,
  arrowBackOutline,
  logOutOutline,
  pieChartOutline,
  barChartOutline,
  timeOutline,
  serverOutline
} from 'ionicons/icons';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ExportService } from '../../../core/services/export.service';
import { Product, Category } from '../../../core/models/product.model';
import { MovementLog } from '../../../core/models/inventory-log.model';
import { StatWidgetComponent } from '../../../shared/components/stat-widget/stat-widget.component';

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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonBadge,
    StatWidgetComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button (click)="router.navigate(['/inventory'])" aria-label="Volver a Inventario">
            <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Cuadro de Mando Ejecutivo (Admin)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/movements'])">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          <ion-button (click)="onLogout()" aria-label="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding dashboard-content">
      <!-- Barra Superior con Botones de Exportación -->
      <div class="dashboard-header">
        <div>
          <h2>Analítica y Métricas de Inventario</h2>
          <p>Métricas consolidadas de catálogo y flujo de existencias en Supabase.</p>
        </div>
        <div class="export-actions">
          <ion-button fill="outline" color="medium" size="small" (click)="loadDashboardData()" [disabled]="isLoading()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Actualizar
          </ion-button>
          <ion-button color="success" size="small" (click)="exportPdf()">
            <ion-icon name="document-text-outline" slot="start"></ion-icon>
            Exportar PDF
          </ion-button>
          <ion-button color="primary" size="small" (click)="exportCsv()">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Exportar CSV
          </ion-button>
        </div>
      </div>

      <!-- Estado de carga -->
      @if (isLoading()) {
        <div class="loading-box">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Cargando métricas con Promise.all...</p>
        </div>
      } @else {
        <!-- Widgets de KPIs Principales -->
        <section class="kpi-grid">
          <app-stat-widget
            title="Valoración Financiera"
            [value]="(totalValue() | currency:'EUR':'symbol':'1.0-0') || '0 €'"
            icon="cash-outline"
            color="success"
            subtitle="Inventario total valorado"
          ></app-stat-widget>

          <app-stat-widget
            title="Unidades en Stock"
            [value]="totalUnits()"
            icon="cube-outline"
            color="primary"
            subtitle="Existencias físicas"
          ></app-stat-widget>

          <app-stat-widget
            title="Productos en Alerta"
            [value]="lowStockCount()"
            icon="alert-circle-outline"
            color="danger"
            subtitle="Por debajo del stock mínimo"
          ></app-stat-widget>

          <app-stat-widget
            title="Movimientos Registrados"
            [value]="movementsCount()"
            icon="server-outline"
            color="warning"
            subtitle="Operaciones auditadas"
          ></app-stat-widget>
        </section>

        <!-- Sección de Gráficos Estadísticos con Chart.js -->
        <div class="charts-grid">
          <!-- Gráfico 1: Categorías de Supabase -->
          <ion-card class="chart-card">
            <ion-card-header>
              <div class="chart-title-wrap">
                <ion-card-title>
                  <ion-icon name="pie-chart-outline" class="title-icon"></ion-icon>
                  Distribución por Categorías
                </ion-card-title>
                <ion-badge color="secondary">Catálogo</ion-badge>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="chart-container">
                <canvas #categoryChartCanvas></canvas>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Gráfico 2: Flujo de Entradas y Salidas -->
          <ion-card class="chart-card">
            <ion-card-header>
              <div class="chart-title-wrap">
                <ion-card-title>
                  <ion-icon name="bar-chart-outline" class="title-icon"></ion-icon>
                  Flujo de Entradas y Salidas
                </ion-card-title>
                <ion-badge color="tertiary">Operaciones</ion-badge>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="chart-container">
                <canvas #movementsChartCanvas></canvas>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Tabla Resumen de Últimos Movimientos Auditados -->
        <ion-card class="movements-summary-card">
          <ion-card-header>
            <div class="chart-title-wrap">
              <ion-card-title>Auditoría de Movimientos Recientes</ion-card-title>
              <ion-button fill="clear" size="small" (click)="router.navigate(['/movements'])">
                Ver todos los registros
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="table-responsive">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of recentMovements(); track m.id) {
                    <tr>
                      <td>{{ m.timestamp | date:'short' }}</td>
                      <td>
                        <ion-badge [color]="m.movementType === 'IN' ? 'success' : 'danger'">
                          {{ m.movementType === 'IN' ? 'ENTRADA' : 'SALIDA' }}
                        </ion-badge>
                      </td>
                      <td><code>{{ m.sku }}</code></td>
                      <td>{{ m.productName }}</td>
                      <td><strong>{{ m.quantity }} uds.</strong></td>
                      <td>{{ m.userEmail }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .dashboard-content {
      --background: #f8fafc;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
      gap: 12px;
    }

    .dashboard-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
    }

    .dashboard-header p {
      margin: 4px 0 0 0;
      font-size: 0.9rem;
      color: #64748b;
    }

    .export-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .chart-card {
      margin: 0;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      background: #ffffff;
    }

    .chart-title-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .chart-title-wrap ion-card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon {
      font-size: 20px;
      color: #3b82f6;
    }

    .chart-container {
      position: relative;
      height: 280px;
      width: 100%;
    }

    .movements-summary-card {
      margin: 0;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      background: #ffffff;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }

    .summary-table th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .loading-box {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
    }
  `]
})
export class AdminDashboardPage implements OnInit, AfterViewInit {
  authService = inject(AuthService);
  inventoryService = inject(InventoryService);
  exportService = inject(ExportService);
  router = inject(Router);

  @ViewChild('categoryChartCanvas') categoryCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('movementsChartCanvas') movementsCanvas?: ElementRef<HTMLCanvasElement>;

  private categoryChartInstance?: Chart;
  private movementsChartInstance?: Chart;

  isLoading = signal<boolean>(true);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  movements = signal<MovementLog[]>([]);

  totalValue = signal<number>(0);
  totalUnits = signal<number>(0);
  lowStockCount = signal<number>(0);
  movementsCount = signal<number>(0);
  recentMovements = signal<MovementLog[]>([]);

  constructor() {
    addIcons({
      downloadOutline,
      documentTextOutline,
      refreshOutline,
      arrowBackOutline,
      logOutOutline,
      pieChartOutline,
      barChartOutline,
      timeOutline,
      serverOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  ngAfterViewInit(): void {
  }

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
      this.recentMovements.set(fetchedLogs.slice(0, 5));

      this.totalValue.set(fetchedProducts.reduce((acc, p) => acc + (p.stock * p.unit_price), 0));
      this.totalUnits.set(fetchedProducts.reduce((acc, p) => acc + p.stock, 0));
      this.lowStockCount.set(fetchedProducts.filter(p => p.stock <= p.min_stock).length);
      this.movementsCount.set(fetchedLogs.length);

      this.isLoading.set(false);

      setTimeout(() => {
        this.renderCategoryChart(fetchedProducts, fetchedCategories);
        this.renderMovementsChart(fetchedLogs);
      }, 100);

    } catch (error) {
      console.error('Error en la carga de datos del Dashboard:', error);
      this.isLoading.set(false);
    }
  }

  private renderCategoryChart(products: Product[], categories: Category[]): void {
    if (!this.categoryCanvas) return;

    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
    }

    const categoryCounts: Record<string, number> = {};
    categories.forEach(c => categoryCounts[c.name] = 0);

    products.forEach(p => {
      const catName = p.category?.name || 'Otras';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + p.stock;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    this.categoryChartInstance = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  private renderMovementsChart(logs: MovementLog[]): void {
    if (!this.movementsCanvas) return;

    if (this.movementsChartInstance) {
      this.movementsChartInstance.destroy();
    }

    const inQuantity = logs
      .filter(l => l.movementType === 'IN')
      .reduce((acc, l) => acc + l.quantity, 0);

    const outQuantity = logs
      .filter(l => l.movementType === 'OUT')
      .reduce((acc, l) => acc + l.quantity, 0);

    this.movementsChartInstance = new Chart(this.movementsCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Entradas (Recepción)', 'Salidas (Despacho / Venta)'],
        datasets: [{
          label: 'Unidades Transferidas',
          data: [inQuantity, outQuantity],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
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
    this.router.navigate(['/auth/login']);
  }
}
