import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  timeOutline,
  playCircleOutline,
  stopCircleOutline,
  shieldCheckmarkOutline,
  personCircleOutline,
  cloudUploadOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-employee-profile-card',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
  template: `
    <div class="invent-card p-4 h-100 d-flex flex-column justify-content-between">
      <div>
        <!-- Cabecera de tarjeta Profile -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="fw-bold text-dark fs-6">Perfil de Empleado</span>
          <span
            class="badge rounded-pill px-3 py-1"
            [ngClass]="authService.isAdmin() ? 'bg-primary' : 'bg-info text-dark'"
          >
            {{ authService.isAdmin() ? 'ADMIN' : 'OPERADOR' }}
          </span>
        </div>

        <!-- Avatar circular con subida a Supabase Storage -->
        <div class="text-center my-3 position-relative">
          <div class="avatar-wrapper mx-auto position-relative">
            <img
              [src]="authService.currentProfile()?.avatar_url || defaultAvatar"
              alt="Foto del empleado"
              class="rounded-circle shadow-sm avatar-img"
            />
            <button
              type="button"
              class="btn btn-sm btn-primary rounded-circle avatar-upload-btn shadow"
              (click)="fileInput.click()"
              title="Subir foto de empleado a Supabase Storage"
              [disabled]="isUploading()"
            >
              @if (isUploading()) {
                <ion-spinner name="crescent" style="width: 14px; height: 14px;"></ion-spinner>
              } @else {
                <ion-icon name="camera-outline"></ion-icon>
              }
            </button>
            <input
              #fileInput
              type="file"
              accept="image/*"
              class="d-none"
              (change)="onAvatarSelected($event)"
            />
          </div>

          <h5 class="fw-bold text-dark mt-3 mb-1">
            {{ authService.currentProfile()?.full_name || 'Empleado Activo' }}
          </h5>
          <p class="text-muted small mb-1">
            {{ '@' + (authService.currentProfile()?.email?.split('@')?.[0] || 'stockflow') }}
          </p>
          <span class="badge bg-light text-secondary border px-2 py-1">
            {{ authService.currentProfile()?.position || 'Personal Logístico' }}
          </span>
        </div>

        <!-- Métricas rápidas estilo Store Inventory Dashboard -->
        <div class="row text-center border-top border-bottom py-3 my-3 g-0">
          <div class="col-6 border-end">
            <div class="fw-bold fs-5 text-dark">{{ totalProducts }}</div>
            <div class="text-muted small">Productos</div>
          </div>
          <div class="col-6">
            <div class="fw-bold fs-5 text-primary">{{ totalMovements }}</div>
            <div class="text-muted small">Operaciones</div>
          </div>
        </div>

        <!-- Cronómetro de Sesión y Control de Turno (Clock-In / Clock-Out) -->
        <div class="clock-box p-3 rounded-4 mb-3 text-center">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small fw-semibold text-uppercase tracking-wide text-secondary">
              <ion-icon name="time-outline" class="me-1 align-middle"></ion-icon>
              Tiempo de Sesión
            </span>
            <span
              class="badge rounded-pill"
              [ngClass]="authService.isClockedIn() ? 'bg-success' : 'bg-warning text-dark'"
            >
              {{ authService.isClockedIn() ? '● En Turno' : '❚❚ En Pausa' }}
            </span>
          </div>

          <div class="timer-display fw-bold my-2">
            {{ elapsedFormatted() }}
          </div>

          <div class="text-muted extra-small mb-3">
            Inicio de jornada: {{ startTimeFormatted() }}
          </div>

          <button
            type="button"
            class="btn w-100 fw-semibold rounded-3 d-flex align-items-center justify-content-center gap-2 py-2"
            [ngClass]="authService.isClockedIn() ? 'btn-outline-danger' : 'btn-success text-white'"
            (click)="onToggleClock()"
          >
            <ion-icon [name]="authService.isClockedIn() ? 'stop-circle-outline' : 'play-circle-outline'"></ion-icon>
            {{ authService.isClockedIn() ? 'Finalizar Turno (Clock-Out)' : 'Iniciar Turno (Clock-In)' }}
          </button>
        </div>

        <!-- Etiquetas tecnológicas del entorno -->
        <div class="mb-2">
          <div class="text-uppercase text-muted extra-small fw-bold mb-2 text-center">
            Tecnologías Activas
          </div>
          <div class="d-flex flex-wrap justify-content-center gap-1">
            <span class="tag-pill">Bootstrap 5 SCSS</span>
            <span class="tag-pill">Supabase Storage</span>
            <span class="tag-pill">Angular Signals</span>
            <span class="tag-pill">RBAC Guards</span>
          </div>
        </div>
      </div>

      <!-- Pie de tarjeta con subida rápida de foto -->
      <div class="update-banner p-3 rounded-3 text-center mt-3">
        <div class="small fw-semibold text-primary mb-1">
          <ion-icon name="cloud-upload-outline" class="me-1 align-middle"></ion-icon>
          Supabase Storage Activo
        </div>
        <div class="extra-small text-muted">
          Pulsa el icono de cámara sobre tu foto para actualizar tu avatar en la nube.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar-wrapper {
      width: 96px;
      height: 96px;
    }
    .avatar-img {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border: 3px solid #5b47fb;
    }
    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
    }
    .clock-box {
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      border: 1px solid #e0e7ff;
    }
    .timer-display {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 1.75rem;
      color: #1e1b4b;
      letter-spacing: 1.5px;
    }
    .extra-small {
      font-size: 0.75rem;
    }
    .tag-pill {
      font-size: 0.7rem;
      padding: 4px 10px;
      border-radius: 999px;
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .update-banner {
      background-color: #f5f3ff;
      border: 1px dashed #c4b5fd;
    }
  `]
})
export class EmployeeProfileCardComponent implements OnInit, OnDestroy {
  @Input() totalProducts = 0;
  @Input() totalMovements = 0;
  @Output() clockStatusChanged = new EventEmitter<boolean>();

  authService = inject(AuthService);
  storageService = inject(StorageService);

  defaultAvatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';
  isUploading = signal<boolean>(false);
  elapsedFormatted = signal<string>('00:00:00');
  startTimeFormatted = signal<string>('--:--');

  private timerInterval: any;

  constructor() {
    addIcons({
      cameraOutline,
      timeOutline,
      playCircleOutline,
      stopCircleOutline,
      shieldCheckmarkOutline,
      personCircleOutline,
      cloudUploadOutline
    });
  }

  ngOnInit(): void {
    this.updateClockDisplay();
    this.timerInterval = setInterval(() => {
      this.updateClockDisplay();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateClockDisplay(): void {
    const startMs = this.authService.sessionStartTime();
    if (!startMs) {
      this.elapsedFormatted.set('00:00:00');
      this.startTimeFormatted.set('--:--');
      return;
    }

    const startDate = new Date(startMs);
    this.startTimeFormatted.set(
      startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    if (!this.authService.isClockedIn()) {
      return;
    }

    const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');

    this.elapsedFormatted.set(`${hrs}:${mins}:${secs}`);
  }

  onToggleClock(): void {
    this.authService.toggleClockInOut();
    this.updateClockDisplay();
    this.clockStatusChanged.emit(this.authService.isClockedIn());
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    try {
      const uploadedUrl = await this.storageService.uploadImage(file, 'employees');
      this.authService.updateAvatarUrl(uploadedUrl);
    } finally {
      this.isUploading.set(false);
    }
  }
}
