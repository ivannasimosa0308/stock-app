import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonBadge,
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
    timeOutline
} from 'ionicons/icons';

import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Product } from '../../../../core/models/product.model';
import { StatWidgetComponent } from '../../../../shared/components/stat-widget/stat-widget.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';

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
        IonBadge,
        IonIcon,
        IonToast,
        StatWidgetComponent,
        DataTableComponent
    ],
    template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>StockFlow - Gestión de Inventario</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="router.navigate(['/movements'])" aria-label="Ir a Movimientos">
            <ion-icon name="time-outline" slot="start"></ion-icon>
            Movimientos
          </ion-button>
          @if (authService.isAdmin()) {
            <ion-button (click)="router.navigate(['/dashboard'])" aria-label="Ir al Dashboard de Administrador">
              <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
              Dashboard Admin
            </ion-button>
          }
          <ion-button (click)="onLogout()" aria-label="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Barra superior de usuario y bienvenida -->
      <div class="user-banner">
        <div class="user-greeting">
          <h2>Catálogo General de Existencias</h2>
          <p>Conectado como: <strong>{{ authService.currentUser()?.email }}</strong></p>
        </div>
        <div class="user-role-tag">
          <ion-badge [color]="authService.isAdmin() ? 'danger' : 'secondary'">
            ROL: {{ authService.userRole() | uppercase }}
          </ion-badge>
        </div>
      </div>

      <!-- Fase 2: Widgets Estadísticos Instanciados (Uso de @Input y @Output) -->
      <section class="widgets-grid" aria-label="Indicadores clave de inventario">
        <app-stat-widget
          title="Total Productos"
          [value]="totalProductsCount()"
          icon="cube-outline"
          color="primary"
          subtitle="Modelos activos en catálogo"
        ></app-stat-widget>

        <app-stat-widget
          title="Alerta Bajo Stock"
          [value]="lowStockCount()"
          icon="alert-circle-outline"
          color="warning"
          subtitle="Requieren reposición inmediata"
          [isClickable]="true"
          (widgetClick)="filterLowStock()"
        ></app-stat-widget>

        <app-stat-widget
          title="Valoración Almacén"
          [value]="(totalStockValue() | currency:'EUR':'symbol':'1.0-0') || '0 €'"
          icon="cash-outline"
          color="success"
          subtitle="Valoración financiera total"
        ></app-stat-widget>
      </section>

      <!-- Barra de Acciones del Inventario -->
      <div class="actions-header">
        <div>
          @if (isFilteredByLowStock()) {
            <ion-badge color="warning" class="filter-pill">
              Filtrando: Solo Bajo Stock
              <ion-button fill="clear" size="small" (click)="clearFilter()">Quitar filtro</ion-button>
            </ion-badge>
          }
        </div>
        <div class="right-buttons">
          <ion-button fill="outline" size="small" (click)="loadProducts()" [disabled]="isLoading()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Actualizar
          </ion-button>
          @if (authService.isAdmin()) {
            <ion-button size="small" color="success" (click)="onNewProduct()">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              Nuevo Producto
            </ion-button>
          }
        </div>
      </div>

      <!-- Fase 2: Componente Reutilizable DataTable (Comunicación Props/Inputs y Eventos/Outputs) -->
      <app-data-table
        title="Productos en Almacén"
        [data]="displayedProducts()"
        [columns]="tableColumns"
        [isAdmin]="authService.isAdmin()"
        [isLoading]="isLoading()"
        searchPlaceholder="Buscar por SKU, nombre o categoría..."
        [pageSize]="5"
        (edit)="onEditProduct($event)"
        (delete)="onDeleteProduct($event)"
      ></app-data-table>

      <!-- Toast informativo de operaciones -->
      <ion-toast
        [isOpen]="toastMessage() !== null"
        [message]="toastMessage() || ''"
        [duration]="3000"
        (didDismiss)="toastMessage.set(null)"
      ></ion-toast>
    </ion-content>
  `,
    styles: [`
    .user-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
      gap: 8px;
    }

    .user-greeting h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
    }

    .user-greeting p {
      margin: 4px 0 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }

    .widgets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .actions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .right-buttons {
      display: flex;
      gap: 10px;
    }

    .filter-pill {
      font-size: 0.85rem;
      padding: 4px 10px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .filter-pill ion-button {
      --color: #ffffff;
      height: 20px;
      margin: 0;
      font-size: 0.75rem;
    }
  `]
})
export class InventoryListPage implements OnInit {
    authService = inject(AuthService);
    inventoryService = inject(InventoryService);
    router = inject(Router);

    products = signal<Product[]>([]);
    isLoading = signal<boolean>(false);
    isFilteredByLowStock = signal<boolean>(false);
    toastMessage = signal<string | null>(null);

    // Definición de columnas enviadas al componente hijo DataTable
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
            timeOutline
        });
    }

    async ngOnInit(): Promise<void> {
        await this.loadProducts();
    }

    async loadProducts(): Promise<void> {
        this.isLoading.set(true);
        try {
            const data = await this.inventoryService.getProducts();
            this.products.set(data);
        } catch (err: any) {
            this.toastMessage.set('Error al cargar inventario desde Supabase.');
        } finally {
            this.isLoading.set(false);
        }
    }

    // Cálculos reactivos con Signals para los widgets
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

    onNewProduct(): void {
        this.router.navigate(['/inventory/new']);
    }

    // Evento recibido desde el componente hijo DataTable (@Output edit)
    onEditProduct(product: Product): void {
        if (!this.authService.isAdmin()) {
            this.toastMessage.set('Solo administradores pueden editar productos.');
            return;
        }
        this.router.navigate(['/inventory/edit', product.id]);
    }

    // Evento recibido desde el componente hijo DataTable (@Output delete)
    async onDeleteProduct(product: Product): Promise<void> {
        if (!this.authService.isAdmin()) {
            this.toastMessage.set('Solo administradores pueden eliminar productos.');
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
        this.router.navigate(['/auth/login']);
    }
}