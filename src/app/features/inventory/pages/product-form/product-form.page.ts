import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, arrowBackOutline } from 'ionicons/icons';
import { Observable, from, of } from 'rxjs';
import { map, catchError, debounceTime, switchMap, first } from 'rxjs/operators';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Category, Product } from '../../../../core/models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Editar Producto' : 'Nuevo Producto' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-wrapper">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ isEditMode() ? 'Modificar Información del Producto' : 'Registro de Inventario' }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
              <!-- Campo SKU con Validación Asíncrona -->
              <ion-item lines="full" class="form-item">
                <ion-label position="stacked">
                  Código SKU * (Identificador Único)
                </ion-label>
                <div class="input-with-status">
                  <ion-input
                    formControlName="sku"
                    placeholder="Ej. LAP-DELL-001"
                    (ionInput)="onSkuInput()"
                  ></ion-input>
                  @if (productForm.get('sku')?.pending) {
                    <ion-spinner name="dots" color="primary"></ion-spinner>
                  } @else if (productForm.get('sku')?.valid && productForm.get('sku')?.value) {
                    <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                  } @else if (productForm.get('sku')?.invalid && productForm.get('sku')?.touched) {
                    <ion-icon name="close-circle-outline" color="danger"></ion-icon>
                  }
                </div>
              </ion-item>
              @if (productForm.get('sku')?.hasError('required') && productForm.get('sku')?.touched) {
                <ion-text color="danger" class="error-msg"><small>El código SKU es obligatorio.</small></ion-text>
              }
              @if (productForm.get('sku')?.hasError('skuTaken')) {
                <ion-text color="danger" class="error-msg">
                  <small>⚠️ Este SKU ya está registrado por otro producto en la base de datos.</small>
                </ion-text>
              }

              <!-- Nombre del Producto -->
              <ion-item lines="full" class="form-item ion-margin-top">
                <ion-label position="stacked">Nombre del Producto *</ion-label>
                <ion-input formControlName="name" placeholder="Ej. MacBook Pro 14 pulgadas"></ion-input>
              </ion-item>
              @if (productForm.get('name')?.invalid && productForm.get('name')?.touched) {
                <ion-text color="danger" class="error-msg"><small>El nombre es obligatorio (mínimo 3 caracteres).</small></ion-text>
              }

              <!-- Categoría -->
              <ion-item lines="full" class="form-item ion-margin-top">
                <ion-label position="stacked">Categoría</ion-label>
                <ion-select formControlName="category_id" placeholder="Selecciona una categoría">
                  @for (cat of categories(); track cat.id) {
                    <ion-select-option [value]="cat.id">{{ cat.name }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Descripción -->
              <ion-item lines="full" class="form-item ion-margin-top">
                <ion-label position="stacked">Descripción Detallada</ion-label>
                <ion-textarea formControlName="description" rows="3" placeholder="Especificaciones técnicas..."></ion-textarea>
              </ion-item>

              <!-- Grid de Stock y Precio -->
              <div class="row-fields ion-margin-top">
                <ion-item lines="full" class="form-item">
                  <ion-label position="stacked">Stock Inicial *</ion-label>
                  <ion-input type="number" formControlName="stock" min="0"></ion-input>
                </ion-item>

                <ion-item lines="full" class="form-item">
                  <ion-label position="stacked">Stock Mínimo (Alerta) *</ion-label>
                  <ion-input type="number" formControlName="min_stock" min="0"></ion-input>
                </ion-item>

                <ion-item lines="full" class="form-item">
                  <ion-label position="stacked">Precio Unitario (€) *</ion-label>
                  <ion-input type="number" step="0.01" formControlName="unit_price" min="0"></ion-input>
                </ion-item>
              </div>

              <!-- Mensaje de error general -->
              @if (errorMessage()) {
                <ion-text color="danger" class="ion-padding-top"><p>{{ errorMessage() }}</p></ion-text>
              }

              <!-- Botones de Acción -->
              <div class="action-bar ion-margin-top">
                <ion-button fill="outline" color="medium" (click)="goBack()">Cancelar</ion-button>
                <ion-button type="submit" [disabled]="productForm.invalid || isSaving() || productForm.pending">
                  @if (isSaving()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    {{ isEditMode() ? 'Actualizar Producto' : 'Guardar Producto' }}
                  }
                </ion-button>
              </div>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .form-wrapper {
      max-width: 720px;
      margin: 10px auto;
    }
    .form-item {
      --background: #f8fafc;
      border-radius: 8px;
    }
    .input-with-status {
      display: flex;
      align-items: center;
      width: 100%;
    }
    .input-with-status ion-icon {
      font-size: 22px;
      margin-left: 8px;
    }
    .error-msg {
      display: block;
      margin-top: 4px;
      margin-left: 16px;
      font-weight: 500;
    }
    .row-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .action-bar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
  `]
})
export class ProductFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  categories = signal<Category[]>([]);
  isEditMode = signal<boolean>(false);
  productId: string | null = null;
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  productForm: FormGroup = this.fb.group({
    sku: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category_id: [null],
    stock: [0, [Validators.required, Validators.min(0)]],
    min_stock: [5, [Validators.required, Validators.min(0)]],
    unit_price: [0, [Validators.required, Validators.min(0.01)]]
  });

  constructor() {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, arrowBackOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCategories();

    // Comprobar si estamos editando o creando
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode.set(true);
      await this.loadProductData(this.productId);
    }

    // Aplicar el validador asíncrono para el SKU único
    this.productForm.get('sku')?.setAsyncValidators([this.skuAsyncValidator()]);
    this.productForm.get('sku')?.updateValueAndValidity();
  }

  async loadCategories(): Promise<void> {
    try {
      const cats = await this.inventoryService.getCategories();
      this.categories.set(cats);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  }

  async loadProductData(id: string): Promise<void> {
    try {
      const products = await this.inventoryService.getProducts();
      const product = products.find(p => p.id === id);
      if (product) {
        this.productForm.patchValue({
          sku: product.sku,
          name: product.name,
          description: product.description,
          category_id: product.category_id,
          stock: product.stock,
          min_stock: product.min_stock,
          unit_price: product.unit_price
        });
      }
    } catch (err) {
      console.error('Error cargando producto para editar:', err);
    }
  }

  /**
   * Validador Asíncrono: Consulta a Supabase si el SKU ya existe en la base de datos
   */
  skuAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      if (!value || String(value).trim() === '') {
        return of(null);
      }

      return of(value).pipe(
        debounceTime(400),
        switchMap(sku => from(this.inventoryService.checkSkuExists(sku, this.productId || undefined))),
        map(exists => (exists ? { skuTaken: true } : null)),
        catchError(() => of(null)),
        first()
      );
    };
  }

  onSkuInput(): void {
    // Si cambia el SKU se limpia mensaje de error previo
    this.errorMessage.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const formValues = this.productForm.value;

    try {
      if (this.isEditMode() && this.productId) {
        await this.inventoryService.updateProduct(this.productId, formValues);
      } else {
        await this.inventoryService.createProduct(formValues);
      }
      this.router.navigate(['/inventory']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error guardando producto en Supabase.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }
}
