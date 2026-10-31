import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonSelect,
  IonSelectOption
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  arrowDownOutline,
  createOutline,
  trashOutline,
  chevronBackOutline,
  chevronForwardOutline,
  swapVerticalOutline,
  pricetagOutline,
  cubeOutline,
  calendarOutline
} from 'ionicons/icons';

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'currency' | 'badge' | 'stock' | 'date';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonSelect,
    IonSelectOption
  ],
  template: `
    <section class="grid-section" role="region" [attr.aria-label]="title || 'Listado de inventario'">
      <!-- Barra Superior: Buscador y Ordenación Mobile-First -->
      <div class="control-panel">
        <div class="search-wrapper">
          <ion-searchbar
            [placeholder]="searchPlaceholder"
            [value]="searchTerm()"
            (ionInput)="onSearchChange($event)"
            [debounce]="250"
            role="searchbox"
            aria-label="Buscador en tiempo real"
          ></ion-searchbar>
        </div>

        <!-- Selector de Ordenación (Ideal para móvil) -->
        <div class="sort-wrapper">
          <ion-icon name="swap-vertical-outline" class="sort-icon" aria-hidden="true"></ion-icon>
          <ion-select
            interface="popover"
            [value]="sortColumn()"
            (ionChange)="onSortSelect($event)"
            placeholder="Ordenar por..."
            aria-label="Ordenar registros por campo"
          >
            @for (col of sortableColumns; track col.key) {
              <ion-select-option [value]="col.key">{{ col.label }}</ion-select-option>
            }
          </ion-select>
          <ion-button
            fill="clear"
            size="small"
            (click)="toggleSortDirection()"
            [attr.aria-label]="'Dirección de orden: ' + (sortDirection() === 'asc' ? 'ascendente' : 'descendente')"
          >
            <ion-icon
              [name]="sortDirection() === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline'"
              slot="icon-only"
            ></ion-icon>
          </ion-button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (isLoading) {
        <div class="feedback-box">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Sincronizando existencias...</p>
        </div>
      } @else if (filteredData().length === 0) {
        <div class="feedback-box">
          <p>No se encontraron registros que coincidan con la búsqueda.</p>
        </div>
      } @else {
        <!-- CUADRÍCULA RESPONSIVA MOBILE-FIRST (CSS GRID) -->
        <div class="cards-grid" role="list">
          @for (item of paginatedData(); track item.id || item.sku || $index) {
            <article
              class="inventory-card"
              role="listitem"
              (click)="onRowClick(item)"
              tabindex="0"
              (keydown.enter)="onRowClick(item)"
            >
              <!-- Cabecera de la Tarjeta: SKU y Estado de Stock -->
              <div class="card-top">
                <span class="sku-pill">
                  <ion-icon name="pricetag-outline" aria-hidden="true"></ion-icon>
                  <code>{{ item.sku || 'REF-' + $index }}</code>
                </span>

                @if (item.stock !== undefined) {
                  <ion-badge [color]="getStockBadgeColor(item.stock, item.min_stock)">
                    {{ getStockStatusLabel(item.stock, item.min_stock) }} ({{ item.stock }})
                  </ion-badge>
                } @else if (item.movementType) {
                  <ion-badge [color]="item.movementType === 'IN' ? 'success' : 'danger'">
                    {{ item.movementType === 'IN' ? 'ENTRADA' : 'SALIDA' }}
                  </ion-badge>
                }
              </div>

              <!-- Cuerpo Principal: Nombre y Categoría -->
              <div class="card-body">
                @if (item.image_url) {
                  <div class="d-flex align-items-center gap-3 mb-2">
                    <img
                      [src]="item.image_url"
                      [alt]="item.name || 'Producto'"
                      class="rounded-3 border"
                      style="width: 52px; height: 52px; object-fit: cover; flex-shrink: 0;"
                    />
                    <h4 class="card-title mb-0">{{ item.name || item.productName || 'Sin título' }}</h4>
                  </div>
                } @else {
                  <h4 class="card-title">{{ item.name || item.productName || 'Sin título' }}</h4>
                }
                @if (item.category?.name) {
                  <span class="category-tag">{{ item.category.name }}</span>
                } @else if (item.reason) {
                  <span class="reason-tag">Motivo: {{ item.reason }}</span>
                }
              </div>

              <!-- Fila de Detalles y Precio -->
              <div class="card-meta">
                @if (item.unit_price !== undefined) {
                  <div class="meta-item">
                    <span class="meta-label">Precio Unitario</span>
                    <span class="meta-value price-text">
                      {{ (item.unit_price | currency:'EUR':'symbol':'1.2-2') || '0,00 €' }}
                    </span>
                  </div>
                }

                @if (item.quantity !== undefined) {
                  <div class="meta-item">
                    <span class="meta-label">Cantidad</span>
                    <span class="meta-value">{{ item.quantity }} uds.</span>
                  </div>
                }

                @if (item.timestamp) {
                  <div class="meta-item">
                    <span class="meta-label">Fecha</span>
                    <span class="meta-value date-text">{{ item.timestamp | date:'shortDate' }}</span>
                  </div>
                }
              </div>

              <!-- Botonera Táctil Accesible para Móvil (Android Friendly) -->
              @if (showActions) {
                <div class="card-actions" (click)="$event.stopPropagation()">
                  <ion-button
                    fill="outline"
                    size="small"
                    color="primary"
                    class="action-btn"
                    (click)="onEdit(item)"
                    [attr.aria-label]="'Editar producto ' + (item.name || item.sku)"
                  >
                    <ion-icon name="create-outline" slot="start"></ion-icon>
                    Editar
                  </ion-button>

                  @if (isAdmin) {
                    <ion-button
                      fill="clear"
                      size="small"
                      color="danger"
                      class="action-btn delete-btn"
                      (click)="onDelete(item)"
                      [attr.aria-label]="'Eliminar producto ' + (item.name || item.sku)"
                    >
                      <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                  }
                </div>
              }
            </article>
          }
        </div>
      }

      <!-- Paginación Accesible -->
      @if (totalPages() > 1) {
        <nav class="pagination-footer" aria-label="Controles de navegación de página">
          <span class="pagination-text">
            Mostrando página {{ currentPage() }} de {{ totalPages() }} ({{ filteredData().length }} resultados)
          </span>
          <div class="pagination-buttons">
            <ion-button
              fill="outline"
              size="small"
              [disabled]="currentPage() === 1"
              (click)="prevPage()"
              aria-label="Ir a la página anterior"
            >
              <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button
              fill="outline"
              size="small"
              [disabled]="currentPage() === totalPages()"
              (click)="nextPage()"
              aria-label="Ir a la página siguiente"
            >
              <ion-icon name="chevron-forward-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </nav>
      }
    </section>
  `,
  styles: [`
    .grid-section {
      width: 100%;
      margin-bottom: 24px;
    }

    /* Panel de controles superior: Buscador y Ordenación */
    .control-panel {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 6px;
      gap: 12px;
      margin-bottom: 18px;
    }

    .search-wrapper {
      flex: 1;
      min-width: 240px;
    }

    ion-searchbar {
      padding: 0;
      --box-shadow: 0 2px 8px rgba(28, 25, 23, 0.05);
      --background: #fcfaf5;
      --border-radius: 12px;
      border: 1px solid #e4dccb;
    }

    .sort-wrapper {
      display: flex;
      align-items: center;
      background: #fcfaf5;
      border-radius: 12px;
      border: 1px solid #e4dccb;
      padding: 2px 8px;
      box-shadow: 0 2px 8px rgba(28, 25, 23, 0.05);
    }

    .sort-icon {
      font-size: 18px;
      color: #6b4f3a;
      margin-right: 4px;
    }

    ion-select {
      font-size: 0.85rem;
      font-weight: 500;
      --padding-start: 4px;
      --padding-end: 4px;
    }

    /* CUADRÍCULA RESPONSIVA (CSS GRID MOBILE-FIRST) */
    .cards-grid {
      display: grid;
      /* En móvil < 600px: 1 columna de 100% de ancho */
      /* En tablets 600-900px: 2 columnas */
      /* En escritorio > 1000px: 3 o 4 columnas automáticas */
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 16px;
    }

    /* Tarjeta individual de Inventario (Mobile-Friendly) */
    .inventory-card {
      background: #fcfaf5;
      border-radius: 14px;
      border: 1px solid #e4dccb;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between; flex-wrap: wrap; gap: 6px;
      box-shadow: 0 2px 8px rgba(28, 25, 23, 0.05);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      cursor: pointer;
      outline: none; overflow: hidden;
    }

    .inventory-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(28, 25, 23, 0.09);
      border-color: #c8b99e;
    }

    .inventory-card:focus-visible {
      outline: 3px solid #6b4f3a;
      outline-offset: 2px;
    }

    .card-top {
      display: flex;
      justify-content: space-between; flex-wrap: wrap; gap: 6px;
      align-items: center;
      margin-bottom: 12px;
    }

    .sku-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #EFE9DC;
      color: #4a3525;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .sku-pill code {
      font-weight: 600;
    }

    .card-body {
      margin-bottom: 14px;
    }

    .card-title {
      margin: 0 0 6px 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #1c1917;
      line-height: 1.3;
    }

    .category-tag {
      font-size: 0.78rem;
      color: #5c4d3c;
      background: #f5efe4;
      border: 1px solid #e4dccb;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .reason-tag {
      font-size: 0.8rem;
      color: #78716c;
    }

    /* Detalles y Métricas de la Tarjeta */
    .card-meta {
      display: flex;
      justify-content: space-between; flex-wrap: wrap; gap: 6px;
      align-items: baseline;
      background: #f5efe4;
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 14px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #78716c;
    }

    .meta-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1c1917;
    }

    .price-text {
      font-size: 1.1rem;
      font-weight: 700;
      color: #563e2d;
    }

    .date-text {
      font-size: 0.85rem;
    }

    /* Botonera táctil adaptada a móvil */
    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      border-top: 1px solid #ede6d6; flex-wrap: wrap;
      padding-top: 10px;
    }

    .action-btn {
      flex: 1;
      height: 36px;
      font-weight: 600;
      margin: 0;
    }

    .delete-btn {
      flex: 0 0 44px;
    }

    /* Pie de Paginación */
    .pagination-footer {
      display: flex;
      justify-content: space-between; flex-wrap: wrap; gap: 6px;
      align-items: center;
      margin-top: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .pagination-text {
      font-size: 0.85rem;
      color: #64748b;
    }

    .pagination-buttons {
      display: flex;
      gap: 8px;
    }

    .feedback-box {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }
  `]
})
export class DataTableComponent {
  // Inputs (Props recibidas del componente padre)
  private dataSignal = signal<any[]>([]);

  @Input({ required: true })
  set data(value: any[]) {
    this.dataSignal.set(value || []);
    this.currentPage.set(1);
  }
  get data(): any[] {
    return this.dataSignal();
  }
  @Input({ required: true }) columns: ColumnDef[] = [];
  @Input() title?: string;
  @Input() searchPlaceholder: string = 'Buscar por SKU o nombre...';
  @Input() pageSize: number = 6;
  @Input() showActions: boolean = true;
  @Input() isAdmin: boolean = false;
  @Input() isLoading: boolean = false;

  // Outputs (Eventos emitidos al padre)
  @Output() rowClick = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();

  // Estado reactivo con Signals
  searchTerm = signal<string>('');
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal<number>(1);

  constructor() {
    addIcons({
      arrowUpOutline,
      arrowDownOutline,
      createOutline,
      trashOutline,
      chevronBackOutline,
      chevronForwardOutline,
      swapVerticalOutline,
      pricetagOutline,
      cubeOutline,
      calendarOutline
    });
  }

  get sortableColumns(): ColumnDef[] {
    return this.columns.filter(c => c.sortable !== false);
  }

  // Filtrado y ordenación reactiva de la cuadrícula
  readonly filteredData = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let result = [...this.dataSignal()];

    if (term) {
      result = result.filter(item => {
        return this.columns.some(col => {
          const val = this.resolveNestedKey(item, col.key);
          return val != null && String(val).toLowerCase().includes(term);
        });
      });
    }

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      result.sort((a, b) => {
        const valA = this.resolveNestedKey(a, sortCol);
        const valB = this.resolveNestedKey(b, sortCol);
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredData().length / this.pageSize));
  });

  readonly paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredData().slice(start, start + this.pageSize);
  });

  onSearchChange(event: any): void {
    this.searchTerm.set(event.detail.value || '');
    this.currentPage.set(1);
  }

  onSortSelect(event: any): void {
    const selectedKey = event.detail.value;
    if (selectedKey) {
      this.sortColumn.set(selectedKey);
    }
  }

  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  getStockBadgeColor(stock: number, minStock: number = 5): string {
    if (stock === 0) return 'danger';
    if (stock <= minStock) return 'warning';
    return 'success';
  }

  getStockStatusLabel(stock: number, minStock: number = 5): string {
    if (stock === 0) return 'Agotado';
    if (stock <= minStock) return 'Bajo Stock';
    return 'En Stock';
  }

  resolveNestedKey(obj: any, key: string): any {
    if (!obj) return '';
    return key.split('.').reduce((acc, part) => acc && acc[part], obj) ?? '';
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onRowClick(item: any): void {
    this.rowClick.emit(item);
  }

  onEdit(item: any): void {
    this.edit.emit(item);
  }

  onDelete(item: any): void {
    this.delete.emit(item);
  }
}
