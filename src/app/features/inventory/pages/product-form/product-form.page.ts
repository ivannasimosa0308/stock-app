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
  IonSpinner,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  arrowBackOutline,
  cloudUploadOutline,
  imageOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { Observable, from, of } from 'rxjs';
import { map, catchError, debounceTime, switchMap, first } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { StorageService } from '../../../../core/services/storage.service';
import { Category } from '../../../../core/models/product.model';

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
    IonSpinner,
    IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
            Volver
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Actualizar producto' : 'Nuevo producto en catálogo' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="invent-shell">
      <div class="container py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-8">
            <div class="invent-card p-4 p-md-5">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 border-bottom pb-3">
                <div>
                  <h4 class="fw-bold text-dark mb-1">
                    @if (isEditMode()) {
                      {{ authService.isAdmin() ? 'Modificar información maestra del producto' : 'Actualización operativa de existencias y ficha de almacén' }}
                    } @else {
                      Alta de producto en almacén
                    }
                  </h4>
                  <p class="text-muted small mb-0">
                    @if (isEditMode() && !authService.isAdmin()) {
                      Como operador puedes actualizar stock físico, categoría, descripción e imagen. El precio unitario y el SKU están protegidos.
                    } @else {
                      Formulario reactivo con validador asíncrono de SKU único y almacenamiento multimedia
                    }
                  </p>
                </div>
                <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                  {{ isEditMode() ? (authService.isAdmin() ? 'Edición completa (Admin)' : 'Edición operativa (Operador)') : 'Nuevo registro' }}
                </span>
              </div>

              <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
                <!-- Bloque de imagen del producto (Supabase Storage) -->
                <div class="storage-upload-box p-3 rounded-4 mb-4">
                  <div class="row align-items-center g-3">
                    <div class="col-12 col-sm-auto text-center">
                      <img
                        [src]="productForm.get('image_url')?.value || defaultProductImage"
                        alt="Vista previa del producto"
                        class="rounded-3 border shadow-sm"
                        style="width: 96px; height: 96px; object-fit: cover; background: #fff;"
                      />
                    </div>
                    <div class="col">
                      <label class="form-label fw-bold text-dark small mb-1">
                        <ion-icon name="cloud-upload-outline" class="text-primary me-1 align-middle"></ion-icon>
                        Imagen visual del producto (Supabase Storage)
                      </label>
                      <p class="text-muted extra-small mb-2">
                        Sube una fotografía desde tu equipo al bucket <code>stockflow-media/products</code> o introduce una URL directa.
                      </p>
                      <div class="d-flex flex-wrap gap-2 align-items-center">
                        <button
                          type="button"
                          class="btn btn-sm btn-primary fw-semibold rounded-3 d-flex align-items-center gap-1"
                          (click)="productImgInput.click()"
                          [disabled]="isUploadingImage()"
                        >
                          @if (isUploadingImage()) {
                            <ion-spinner name="crescent" style="width: 14px; height: 14px;"></ion-spinner>
                            <span>Subiendo a Storage...</span>
                          } @else {
                            <ion-icon name="image-outline"></ion-icon>
                            <span>Subir imagen desde equipo</span>
                          }
                        </button>
                        <input
                          #productImgInput
                          type="file"
                          accept="image/*"
                          class="d-none"
                          (change)="onProductImageSelected($event)"
                        />
                        <input
                          type="text"
                          class="form-control form-control-sm flex-grow-1"
                          formControlName="image_url"
                          placeholder="https://... (URL de imagen en Supabase Storage)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SKU y Nombre -->
                <div class="row g-3 mb-3">
                  <div class="col-12 col-md-5">
                    <label class="form-label fw-semibold small text-secondary">
                      Código SKU * (validador asíncrono)
                    </label>
                    <div class="input-group">
                      <input
                        type="text"
                        class="form-control"
                        [class.bg-light]="isEditMode() && !authService.isAdmin()"
                        formControlName="sku"
                        placeholder="Ej. LAP-DELL-001"
                        [readonly]="isEditMode() && !authService.isAdmin()"
                        (input)="onSkuInput()"
                      />
                      <span class="input-group-text bg-white">
                        @if (productForm.get('sku')?.pending) {
                          <ion-spinner name="dots" color="primary" style="width: 18px; height: 18px;"></ion-spinner>
                        } @else if (productForm.get('sku')?.valid && productForm.get('sku')?.value) {
                          <ion-icon name="checkmark-circle-outline" color="success" class="fs-5"></ion-icon>
                        } @else if (productForm.get('sku')?.invalid && productForm.get('sku')?.touched) {
                          <ion-icon name="close-circle-outline" color="danger" class="fs-5"></ion-icon>
                        }
                      </span>
                    </div>
                    @if (productForm.get('sku')?.hasError('required') && productForm.get('sku')?.touched) {
                      <div class="text-danger extra-small mt-1 fw-semibold">El código SKU es obligatorio.</div>
                    }
                    @if (productForm.get('sku')?.hasError('skuTaken')) {
                      <div class="text-danger extra-small mt-1 fw-semibold">
                        Este código SKU ya existe en el catálogo.
                      </div>
                    }
                  </div>

                  <div class="col-12 col-md-7">
                    <label class="form-label fw-semibold small text-secondary">
                      Nombre comercial del producto *
                    </label>
                    <input
                      type="text"
                      class="form-control"
                      formControlName="name"
                      placeholder="Ej. Monitor LG UltraFine 32 4K"
                    />
                    @if (productForm.get('name')?.invalid && productForm.get('name')?.touched) {
                      <div class="text-danger extra-small mt-1 fw-semibold">
                        El nombre es obligatorio (mínimo 3 caracteres).
                      </div>
                    }
                  </div>
                </div>

                <!-- Categoría y Descripción -->
                <div class="row g-3 mb-3">
                  <div class="col-12 col-md-5">
                    <label class="form-label fw-semibold small text-secondary">Categoría</label>
                    <select class="form-select" formControlName="category_id">
                      <option [ngValue]="null">Selecciona una categoría...</option>
                      @for (cat of categories(); track cat.id) {
                        <option [value]="cat.id">{{ cat.name }}</option>
                      }
                    </select>
                  </div>

                  <div class="col-12 col-md-7">
                    <label class="form-label fw-semibold small text-secondary">Descripción técnica / ubicación en pasillo</label>
                    <input
                      type="text"
                      class="form-control"
                      formControlName="description"
                      placeholder="Especificaciones, pasillo, estantería o proveedor..."
                    />
                  </div>
                </div>

                <!-- Stock, Stock Mínimo y Precio -->
                <div class="row g-3 mb-4">
                  <div class="col-12 col-sm-4">
                    <label class="form-label fw-semibold small text-secondary">Stock actual *</label>
                    <input type="number" class="form-control" formControlName="stock" min="0" />
                  </div>

                  <div class="col-12 col-sm-4">
                    <label class="form-label fw-semibold small text-secondary">Stock mínimo (alerta) *</label>
                    <input type="number" class="form-control" formControlName="min_stock" min="0" />
                  </div>

                  <div class="col-12 col-sm-4">
                    <label class="form-label fw-semibold small text-secondary d-flex align-items-center justify-content-between">
                      <span>Precio unitario (€) *</span>
                      @if (isEditMode() && !authService.isAdmin()) {
                        <span class="badge bg-secondary-subtle text-secondary extra-small">Solo Admin</span>
                      }
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="form-control"
                      [class.bg-light]="isEditMode() && !authService.isAdmin()"
                      formControlName="unit_price"
                      [readonly]="isEditMode() && !authService.isAdmin()"
                      min="0"
                    />
                  </div>
                </div>

                @if (errorMessage()) {
                  <div class="alert alert-danger py-2 small rounded-3 mb-3">
                    {{ errorMessage() }}
                  </div>
                }

                <div class="d-flex flex-wrap justify-content-end gap-2 pt-3 border-top">
                  <button type="button" class="btn btn-outline-secondary px-4 fw-semibold rounded-3" (click)="goBack()">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary px-4 fw-bold rounded-3"
                    [disabled]="productForm.invalid || isSaving() || productForm.pending"
                  >
                    @if (isSaving()) {
                      <ion-spinner name="crescent" color="light" style="width: 16px; height: 16px;"></ion-spinner>
                    } @else {
                      {{ isEditMode() ? 'Guardar cambios' : 'Registrar producto' }}
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .storage-upload-box {
      background-color: #f5efe4;
      border: 1px dashed #c8b99e;
    }
    .extra-small {
      font-size: 0.75rem;
    }
  `]
})
export class ProductFormPage implements OnInit {
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  private inventoryService = inject(InventoryService);
  private storageService = inject(StorageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  defaultProductImage = 'https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/products/monitor-lg-32.jpg';
  categories = signal<Category[]>([]);
  isEditMode = signal<boolean>(false);
  productId: string | null = null;
  isSaving = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  productForm: FormGroup = this.fb.group({
    sku: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    image_url: ['https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/products/dell-xps-15.jpg'],
    category_id: ['cat-1'],
    stock: [10, [Validators.required, Validators.min(0)]],
    min_stock: [5, [Validators.required, Validators.min(0)]],
    unit_price: [299, [Validators.required, Validators.min(0.01)]]
  });

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      arrowBackOutline,
      cloudUploadOutline,
      imageOutline,
      lockClosedOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCategories();

    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode.set(true);
      await this.loadProductData(this.productId);
    }

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
          image_url: product.image_url || this.defaultProductImage,
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

  async onProductImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingImage.set(true);
    try {
      const publicUrl = await this.storageService.uploadImage(file, 'products');
      this.productForm.patchValue({ image_url: publicUrl });
    } finally {
      this.isUploadingImage.set(false);
    }
  }

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
      this.goBack();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error guardando producto.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    if (this.authService.isAdmin() && this.isEditMode()) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/inventory']);
    }
  }
}
