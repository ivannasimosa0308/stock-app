import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
    addOutline,
    cubeOutline,
    alertCircleOutline,
    cashOutline,
    barChartOutline,
    logOutOutline,
    refreshOutline,
    timeOutline,
    downloadOutline,
    documentTextOutline,
    warningOutline
} from 'ionicons/icons';

import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ExportService } from '../../../../core/services/export.service';
import { Product } from '../../../../core/models/product.model';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { EmployeeProfileCardComponent } from '../../../../shared/components/employee-profile-card/employee-profile-card.component';

export type CatalogFilterMode = 'all' | 'low-stock' | 'valuation';

@Component({
    selector: 'app-inventory-list',
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
        IonToast,
        DataTableComponent,
        EmployeeProfileCardComponent
    ],
    template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>INVENT — Catálogo de inventario</ion-title>
        <ion-buttons slot="end">
          @if (authService.isAdmin()) {
            <ion-button (click)="router.navigate(['/admin'])" aria-label="Ir al panel de administración">
              <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
              Dashboard
            </ion-button>
          }
          <ion-button (click)="router.navigate(['/movements'])" aria-label="Ir a movimientos">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          <ion-button (click)="onLogout()" color="danger" aria-label="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="start"></ion-icon>
            Salir
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container-fluid py-4 px-3 px-lg-4">
        <!-- Alerta de acceso prohibido (403) — Solo aparece si el usuario intenta cambiar la ruta en la URL -->
        @if (forbiddenAlert()) {
          <div class="alert alert-danger border-danger shadow-sm rounded-4 d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 p-3">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 42px; height: 42px;">
                <ion-icon name="warning-outline" class="fs-4"></ion-icon>
              </div>
              <div>
                <h6 class="fw-bold mb-1 text-danger">
                  Acceso prohibido (error 403) — Ruta restringida interceptada
                </h6>
                <p class="small mb-0 text-dark">
                  Has intentado acceder manualmente a la ruta restringida <code>{{ forbiddenAlert()?.attemptedUrl }}</code>
                  con una cuenta de rol <code>{{ forbiddenAlert()?.role }}</code>.
                  El sistema de seguridad te ha redirigido a tu panel autorizado.
                </p>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-danger fw-semibold rounded-3"
                (click)="router.navigate(['/unauthorized'])"
              >
                Ver aviso 403
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger fw-semibold rounded-3"
                (click)="dismissForbiddenAlert()"
              >
                Cerrar
              </button>
            </div>
          </div>
        }

        <!-- Layout principal con Bootstrap 5 Grid -->
        <div class="row g-4">
          <!-- Columna izquierda: Perfil de empleado + foto + cronómetro -->
          <div class="col-12 col-lg-3">
            <app-employee-profile-card
              [totalProducts]="totalProductsCount()"
              [totalMovements]="movementsCount()"
            ></app-employee-profile-card>
          </div>

          <!-- Columna derecha: Filtros KPI + exportación PDF/CSV + catálogo -->
          <div class="col-12 col-lg-9">
            <!-- Barra superior con botones de descarga CSV/PDF y alta -->
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <h4 class="fw-bold text-dark mb-0">Catálogo general de existencias</h4>
                <p class="text-muted small mb-0">
                  Conectado como <strong>{{ authService.currentProfile()?.full_name }}</strong>
                  ({{ authService.currentUser()?.email }})
                </p>
              </div>

              <div class="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2 bg-white"
                  (click)="loadProducts()"
                  [disabled]="isLoading()"
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
                  (click)="onNewProduct()"
                >
                  <ion-icon name="add-outline"></ion-icon>
                  <span>Nuevo producto</span>
                </button>
              </div>
            </div>

            <!-- 3 Tarjetas KPI interactivas como filtros directos -->
            <div class="row g-3 mb-4">
              <div class="col-12 col-md-4">
                <div
                  class="invent-kpi-indigo p-3 h-100 d-flex flex-column justify-content-between kpi-selectable"
                  [class.kpi-active]="catalogFilter() === 'all'"
                  style="cursor: pointer;"
                  (click)="setCatalogFilter('all')"
                >
                  <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                    <span class="small opacity-75 fw-semibold">Unidades físicas</span>
                    <span class="badge bg-white text-primary rounded-pill">
                      {{ catalogFilter() === 'all' ? 'Filtro activo' : 'Ver todos' }}
                    </span>
                  </div>
                  <div class="fs-3 fw-bold my-1 text-break">{{ totalUnitsCount() }} uds.</div>
                  <div class="extra-small opacity-75">{{ totalProductsCount() }} referencias activas en catálogo</div>
                </div>
              </div>

              <div class="col-12 col-md-4">
                <div
                  class="invent-kpi-coral p-3 h-100 d-flex flex-column justify-content-between kpi-selectable"
                  [class.kpi-active]="catalogFilter() === 'low-stock'"
                  style="cursor: pointer;"
                  (click)="setCatalogFilter('low-stock')"
                >
                  <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                    <span class="small opacity-75 fw-semibold">Alerta de stock bajo</span>
                    <span class="badge bg-white text-danger rounded-pill">
                      {{ catalogFilter() === 'low-stock' ? 'Filtro activo' : 'Ver faltantes' }}
                    </span>
                  </div>
                  <div class="fs-3 fw-bold my-1 text-break">{{ lowStockCount() }} alertas</div>
                  <div class="extra-small opacity-75">Pulsa para desplegar productos con stock bajo</div>
                </div>
              </div>

              <div class="col-12 col-md-4">
                <div
                  class="invent-kpi-emerald p-3 h-100 d-flex flex-column justify-content-between kpi-selectable"
                  [class.kpi-active]="catalogFilter() === 'valuation'"
                  style="cursor: pointer;"
                  (click)="setCatalogFilter('valuation')"
                >
                  <div class="d-flex flex-wrap justify-content-between align-items-start gap-1">
                    <span class="small opacity-75 fw-semibold">Valoración de stock</span>
                    <span class="badge bg-white text-success rounded-pill">
                      {{ catalogFilter() === 'valuation' ? 'Filtro activo' : 'Ordenar por valor' }}
                    </span>
                  </div>
                  <div class="fs-3 fw-bold my-1 text-break">
                    {{ (totalStockValue() | currency:'EUR':'symbol':'1.0-0') || '0 €' }}
                  </div>
                  <div class="extra-small opacity-75">Pulsa para ordenar por valoración financiera</div>
                </div>
              </div>
            </div>

            <!-- Cabecera dinámica del listado filtrado -->
            <div class="invent-card p-3 p-md-4">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
                <div>
                  <h5 class="fw-bold text-dark mb-0">
                    @if (catalogFilter() === 'low-stock') {
                      <span class="text-danger">Productos en alerta de stock bajo ({{ displayedProducts().length }})</span>
                    } @else if (catalogFilter() === 'valuation') {
                      <span>Productos ordenados por valoración de stock ({{ displayedProducts().length }})</span>
                    } @else {
                      <span>Listado completo de productos ({{ displayedProducts().length }})</span>
                    }
                  </h5>
                  <p class="text-muted extra-small mb-0">
                    @if (catalogFilter() === 'low-stock') {
                      Mostrando únicamente los artículos cuyas existencias están en o por debajo del mínimo de seguridad
                    } @else if (catalogFilter() === 'valuation') {
                      Artículos ordenados de mayor a menor valor total en almacén
                    } @else {
                      Todos los artículos disponibles actualmente en el inventario
                    }
                  </p>
                </div>

                @if (catalogFilter() !== 'all') {
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold"
                    (click)="setCatalogFilter('all')"
                  >
                    Mostrar todos los productos ({{ totalProductsCount() }})
                  </button>
                }
              </div>

              <app-data-table
                title="Productos en almacén"
                [data]="displayedProducts()"
                [columns]="tableColumns"
                [isAdmin]="authService.isAdmin()"
                [isLoading]="isLoading()"
                searchPlaceholder="Buscar por SKU, nombre o categoría..."
                [pageSize]="6"
                (edit)="onEditProduct($event)"
                (delete)="onDeleteProduct($event)"
              ></app-data-table>
            </div>
          </div>
        </div>
      </div>

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
      .kpi-selectable {
        transition: transform 0.18s ease, box-shadow 0.18s ease, outline 0.18s ease;
      }
      .kpi-selectable:hover {
        transform: translateY(-2px);
      }
      .kpi-active {
        outline: 3px solid #1c1917;
        outline-offset: 2px;
      }
    `]
})
export class InventoryListPage implements OnInit {
    authService = inject(AuthService);
    inventoryService = inject(InventoryService);
    exportService = inject(ExportService);
    router = inject(Router);
    route = inject(ActivatedRoute);

    products = signal<Product[]>([]);
    movementsCount = signal<number>(5);
    isLoading = signal<boolean>(false);
    catalogFilter = signal<CatalogFilterMode>('all');
    toastMessage = signal<string | null>(null);
    forbiddenAlert = signal<{ attemptedUrl: string; user: string; role: string; timestamp: string } | null>(null);

    readonly tableColumns: ColumnDef[] = [
        { key: 'sku', label: 'SKU / Código', sortable: true },
        { key: 'name', label: 'Nombre del producto', sortable: true },
        { key: 'category.name', label: 'Categoría', sortable: true },
        { key: 'stock', label: 'Stock', sortable: true, type: 'stock' },
        { key: 'unit_price', label: 'Precio unitario', sortable: true, type: 'currency' }
    ];

    constructor() {
        addIcons({
            addOutline,
            cubeOutline,
            alertCircleOutline,
            cashOutline,
            barChartOutline,
            logOutOutline,
            refreshOutline,
            timeOutline,
            downloadOutline,
            documentTextOutline,
            warningOutline
        });
    }

    async ngOnInit(): Promise<void> {
        this.checkForbiddenIntrusion();
        this.route.queryParams.subscribe(params => {
            this.checkForbiddenIntrusion();
            if (params['filter'] === 'low-stock') {
                this.catalogFilter.set('low-stock');
            }
        });
        await this.loadProducts();
    }

    private checkForbiddenIntrusion(): void {
        const raw = sessionStorage.getItem('STOCKFLOW_FORBIDDEN_ATTEMPT');
        if (raw) {
            try {
                this.forbiddenAlert.set(JSON.parse(raw));
            } catch {
                this.forbiddenAlert.set(null);
            }
        }
    }

    dismissForbiddenAlert(): void {
        sessionStorage.removeItem('STOCKFLOW_FORBIDDEN_ATTEMPT');
        this.forbiddenAlert.set(null);
    }

    async loadProducts(): Promise<void> {
        this.isLoading.set(true);
        try {
            const [data, movs] = await Promise.all([
                this.inventoryService.getProducts(),
                this.inventoryService.getMovements(50)
            ]);
            this.products.set(data);
            this.movementsCount.set(movs.length);
        } catch {
            this.toastMessage.set('Error al cargar el inventario.');
        } finally {
            this.isLoading.set(false);
        }
    }

    readonly totalProductsCount = computed(() => this.products().length);

    readonly totalUnitsCount = computed(() => {
        return this.products().reduce((acc, p) => acc + p.stock, 0);
    });

    readonly lowStockCount = computed(() => {
        return this.products().filter(p => p.stock <= p.min_stock).length;
    });

    readonly totalStockValue = computed(() => {
        return this.products().reduce((acc, p) => acc + (p.stock * p.unit_price), 0);
    });

    readonly displayedProducts = computed(() => {
        const all = [...this.products()];
        const mode = this.catalogFilter();
        if (mode === 'low-stock') {
            return all.filter(p => p.stock <= p.min_stock);
        }
        if (mode === 'valuation') {
            return all.sort((a, b) => (b.stock * b.unit_price) - (a.stock * a.unit_price));
        }
        return all;
    });

    setCatalogFilter(mode: CatalogFilterMode): void {
        this.catalogFilter.set(mode);
    }

    exportPdf(): void {
        this.exportService.exportInventoryToPdf(this.displayedProducts());
        this.toastMessage.set('Informe PDF del inventario descargado.');
    }

    exportCsv(): void {
        this.exportService.exportProductsToCsv(this.displayedProducts());
        this.toastMessage.set('Archivo CSV del inventario descargado.');
    }

    onNewProduct(): void {
        this.router.navigate(['/inventory/new']);
    }

    onEditProduct(product: Product): void {
        this.router.navigate(['/inventory/edit', product.id]);
    }

    async onDeleteProduct(product: Product): Promise<void> {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/unauthorized']);
            return;
        }

        const confirmed = confirm(`¿Estás seguro de que deseas eliminar permanentemente "${product.name}"?`);
        if (!confirmed) return;

        try {
            await this.inventoryService.deleteProduct(product.id);
            this.toastMessage.set(`Producto "${product.name}" eliminado correctamente.`);
            await this.loadProducts();
        } catch (err: any) {
            this.toastMessage.set(err.message || 'Error eliminando producto.');
        }
    }

    async onLogout(): Promise<void> {
        await this.authService.logout();
        this.router.navigate(['/login']);
    }
}
