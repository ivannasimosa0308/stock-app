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
    lockClosedOutline,
    warningOutline
} from 'ionicons/icons';

import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ExportService } from '../../../../core/services/export.service';
import { Product } from '../../../../core/models/product.model';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { EmployeeProfileCardComponent } from '../../../../shared/components/employee-profile-card/employee-profile-card.component';

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
        <ion-title>INVENT — Gestión de Inventario y Turnos</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/movements'])" aria-label="Ir a Movimientos">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          @if (authService.isAdmin()) {
            <ion-button (click)="router.navigate(['/admin'])" color="primary" aria-label="Ir al Dashboard de Administrador">
              <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
              Dashboard Admin
            </ion-button>
          } @else {
            <ion-button (click)="testForbiddenAdminAccess()" color="warning" title="Simular intento de intrusión a /admin">
              <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
              Zona Admin (403)
            </ion-button>
          }
          <ion-button (click)="onLogout()" color="danger" aria-label="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="start"></ion-icon>
            Salir
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container-fluid py-4 px-3 px-lg-4">
        <!-- ALERTA DE INTRUSIÓN / ACCESO PROHIBIDO (403) -->
        @if (forbiddenAlert()) {
          <div class="alert alert-danger border-danger shadow-sm rounded-4 d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 p-3">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 42px; height: 42px;">
                <ion-icon name="warning-outline" class="fs-4"></ion-icon>
              </div>
              <div>
                <h6 class="fw-bold mb-1 text-danger">
                  ⛔ Acceso Prohibido (Error 403) — Intrusión de Rol Interceptada por <code>roleGuard('admin')</code>
                </h6>
                <p class="small mb-0 text-dark">
                  El usuario <strong>{{ forbiddenAlert()?.user }}</strong> (rol: <code>{{ forbiddenAlert()?.role }}</code>)
                  intentó acceder a la ruta protegida <code>{{ forbiddenAlert()?.attemptedUrl }}</code> a las {{ forbiddenAlert()?.timestamp }}.
                  Acceso denegado y redirigido automáticamente a <code>/user-dashboard</code>.
                </p>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-danger fw-semibold rounded-3"
                (click)="router.navigate(['/unauthorized'])"
              >
                Ver Detalle 403
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger fw-semibold rounded-3"
                (click)="dismissForbiddenAlert()"
              >
                Entendido
              </button>
            </div>
          </div>
        }

        <!-- Layout Principal con Bootstrap 5 Grid -->
        <div class="row g-4">
          <!-- COLUMNA IZQUIERDA: Perfil de Empleado + Foto + Cronómetro Clock-In/Out -->
          <div class="col-12 col-lg-3">
            <app-employee-profile-card
              [totalProducts]="totalProductsCount()"
              [totalMovements]="movementsCount()"
            ></app-employee-profile-card>
          </div>

          <!-- COLUMNA DERECHA: KPIs + Exportación PDF/CSV + Catálogo con Fotos -->
          <div class="col-12 col-lg-9">
            <!-- Barra Superior con Botones de Descarga CSV/PDF y Alta -->
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <h4 class="fw-bold text-dark mb-0">Catálogo General de Existencias</h4>
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
                @if (authService.isAdmin()) {
                  <button
                    type="button"
                    class="btn btn-dark btn-sm fw-semibold rounded-3 d-flex align-items-center gap-1 px-3 py-2"
                    (click)="onNewProduct()"
                  >
                    <ion-icon name="add-outline"></ion-icon>
                    <span>Nuevo Producto</span>
                  </button>
                }
              </div>
            </div>

            <!-- 3 Tarjetas KPI estilo Store Inventory Dashboard -->
            <div class="row g-3 mb-4">
              <div class="col-12 col-md-4">
                <div class="invent-kpi-indigo p-3 h-100 d-flex flex-column justify-content-between">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="small opacity-75 fw-semibold">Total Productos</span>
                    <span class="badge bg-white text-primary rounded-pill">Catálogo</span>
                  </div>
                  <div class="fs-3 fw-bold my-1">{{ totalProductsCount() }} refs.</div>
                  <div class="extra-small opacity-75">Con imágenes en Supabase Storage</div>
                </div>
              </div>

              <div class="col-12 col-md-4">
                <div
                  class="invent-kpi-coral p-3 h-100 d-flex flex-column justify-content-between"
                  style="cursor: pointer;"
                  (click)="filterLowStock()"
                >
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="small opacity-75 fw-semibold">Alerta Bajo Stock</span>
                    <span class="badge bg-white text-danger rounded-pill">Filtrar</span>
                  </div>
                  <div class="fs-3 fw-bold my-1">{{ lowStockCount() }} alertas</div>
                  <div class="extra-small opacity-75">Pulsa para filtrar reposición urgente</div>
                </div>
              </div>

              <div class="col-12 col-md-4">
                <div class="invent-kpi-emerald p-3 h-100 d-flex flex-column justify-content-between">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="small opacity-75 fw-semibold">Valoración Almacén</span>
                    <span class="badge bg-white text-success rounded-pill">+12%</span>
                  </div>
                  <div class="fs-3 fw-bold my-1">
                    {{ (totalStockValue() | currency:'EUR':'symbol':'1.0-0') || '0 €' }}
                  </div>
                  <div class="extra-small opacity-75">Valoración financiera total</div>
                </div>
              </div>
            </div>

            @if (isFilteredByLowStock()) {
              <div class="mb-3">
                <span class="badge bg-warning text-dark px-3 py-2 rounded-pill">
                  Mostrando solo productos en alerta de bajo stock ({{ lowStockCount() }})
                  <button type="button" class="btn btn-sm btn-link text-dark fw-bold p-0 ms-2" (click)="clearFilter()">
                    Ver todos
                  </button>
                </span>
              </div>
            }

            <!-- Tabla / Grid Reutilizable DataTable con Miniaturas Visuales -->
            <div class="invent-card p-3 p-md-4">
              <app-data-table
                title="Productos en Almacén"
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
    isFilteredByLowStock = signal<boolean>(false);
    toastMessage = signal<string | null>(null);
    forbiddenAlert = signal<{ attemptedUrl: string; user: string; role: string; timestamp: string } | null>(null);

    readonly tableColumns: ColumnDef[] = [
        { key: 'sku', label: 'SKU / Código', sortable: true },
        { key: 'name', label: 'Nombre Producto', sortable: true },
        { key: 'category.name', label: 'Categoría', sortable: true },
        { key: 'stock', label: 'Stock', sortable: true, type: 'stock' },
        { key: 'unit_price', label: 'Precio Unitario', sortable: true, type: 'currency' }
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
            lockClosedOutline,
            warningOutline
        });
    }

    async ngOnInit(): Promise<void> {
        this.checkForbiddenIntrusion();
        this.route.queryParams.subscribe(() => {
            this.checkForbiddenIntrusion();
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

    testForbiddenAdminAccess(): void {
        // Intenta navegar a /admin siendo Operador; roleGuard('admin') interceptará o llevará a /unauthorized
        this.router.navigate(['/admin']);
        setTimeout(() => this.checkForbiddenIntrusion(), 80);
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
            this.toastMessage.set('Error al cargar inventario.');
        } finally {
            this.isLoading.set(false);
        }
    }

    readonly totalProductsCount = computed(() => this.products().length);

    readonly lowStockCount = computed(() => {
        return this.products().filter(p => p.stock <= p.min_stock).length;
    });

    readonly totalStockValue = computed(() => {
        return this.products().reduce((acc, p) => acc + (p.stock * p.unit_price), 0);
    });

    readonly displayedProducts = computed(() => {
        if (this.isFilteredByLowStock()) {
            return this.products().filter(p => p.stock <= p.min_stock);
        }
        return this.products();
    });

    filterLowStock(): void {
        this.isFilteredByLowStock.set(!this.isFilteredByLowStock());
    }

    clearFilter(): void {
        this.isFilteredByLowStock.set(false);
    }

    exportPdf(): void {
        this.exportService.exportInventoryToPdf(this.products());
        this.toastMessage.set('Informe PDF del inventario descargado.');
    }

    exportCsv(): void {
        this.exportService.exportProductsToCsv(this.products());
        this.toastMessage.set('Archivo CSV del inventario descargado.');
    }

    onNewProduct(): void {
        this.router.navigate(['/inventory/new']);
    }

    onEditProduct(product: Product): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/unauthorized']);
            return;
        }
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
