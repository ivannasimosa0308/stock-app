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
  personCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-employee-profile-card',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
  template: `
    <div class="invent-card p-3 p-xl-4">
      <!-- Cabecera de tarjeta Profile -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <span class="fw-bold text-dark fs-6">Perfil de empleado</span>
        <span
          class="badge rounded-pill px-3 py-1"
          [ngClass]="authService.isAdmin() ? 'bg-primary text-white' : 'bg-info text-dark'"
        >
          {{ authService.isAdmin() ? 'Admin' : 'Operador' }}
        </span>
      </div>

      <!-- Avatar circular del empleado -->
      <div class="text-center my-3 position-relative px-1">
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
            title="Cambiar foto de perfil"
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

        <h5 class="fw-bold text-dark mt-3 mb-1 text-break">
          {{ authService.currentProfile()?.full_name || 'Empleado Activo' }}
        </h5>
        <p class="text-muted small mb-2 text-break">
          {{ '@' + (authService.currentProfile()?.email?.split('@')?.[0] || 'stockflow') }}
        </p>
        <div class="px-2">
          <span class="badge bg-light text-secondary border px-2 py-1 d-inline-block text-wrap mw-100">
            {{ authService.currentProfile()?.position || 'Personal Logístico' }}
          </span>
        </div>
      </div>

      <!-- Métricas rápidas -->
      <div class="row text-center border-top border-bottom py-3 my-3 g-0">
        <div class="col-6 border-end px-1">
          <div class="fw-bold fs-5 text-dark">{{ totalProducts }}</div>
          <div class="text-muted extra-small text-truncate">Productos</div>
        </div>
        <div class="col-6 px-1">
          <div class="fw-bold fs-5 text-primary">{{ totalMovements }}</div>
          <div class="text-muted extra-small text-truncate">Operaciones</div>
        </div>
      </div>

      <!-- Cronómetro de Sesión y Control de Turno (Clock-In / Clock-Out) -->
      <div class="clock-box p-3 rounded-4 text-center">
        <div class="d-flex flex-wrap justify-content-center justify-content-sm-between align-items-center gap-1 mb-2">
          <span class="extra-small fw-semibold text-secondary">
            <ion-icon name="time-outline" class="me-1 align-middle"></ion-icon>
            Tiempo de sesión
          </span>
          <span
            class="badge rounded-pill"
            [ngClass]="authService.isClockedIn() ? 'bg-success' : 'bg-warning text-dark'"
          >
            {{ authService.isClockedIn() ? 'En turno' : 'En pausa' }}
          </span>
        </div>

        <div class="timer-display fw-bold my-2">
          {{ elapsedFormatted() }}
        </div>

        <div class="text-muted extra-small mb-3">
          Inicio: {{ startTimeFormatted() }}
        </div>

        <button
          type="button"
          class="btn btn-sm w-100 fw-semibold rounded-3 d-flex flex-wrap align-items-center justify-content-center gap-1 py-2 px-2"
          [ngClass]="authService.isClockedIn() ? 'btn-warning text-white' : 'btn-success text-white'"
          (click)="onToggleClock()"
        >
          <ion-icon [name]="authService.isClockedIn() ? 'stop-circle-outline' : 'play-circle-outline'" class="text-white"></ion-icon>
          <span>{{ authService.isClockedIn() ? 'Finalizar turno' : 'Iniciar turno' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .avatar-wrapper {
      width: 92px;
      height: 92px;
    }
    .avatar-img {
      width: 92px;
      height: 92px;
      object-fit: cover;
      border: 3px solid #2889b8;
    }
    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 30px;
      height: 30px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
    }
    .clock-box {
      background: #444444;
      color: #ffffff;
      border: 1px solid #383838;
    }
    .clock-box .text-secondary,
    .clock-box .text-muted {
      color: #cfe8f3 !important;
    }
    .clock-box ion-icon {
      color: #4bb4e6;
    }
    .timer-display {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: clamp(1.25rem, 2vw, 1.65rem);
      color: #ffffff;
      letter-spacing: 1px;
    }
    .extra-small {
      font-size: 0.75rem;
    }
  `]
})
export class EmployeeProfileCardComponent implements OnInit, OnDestroy {
  @Input() totalProducts = 0;
  @Input() totalMovements = 0;
  @Output() clockStatusChanged = new EventEmitter<boolean>();

  authService = inject(AuthService);
  storageService = inject(StorageService);

  defaultAvatar = 'https://rxhsemwcylhhbgfnogle.supabase.co/storage/v1/object/public/stockflow-media/employees/admin-ivanna.jpg';
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
      personCircleOutline
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
