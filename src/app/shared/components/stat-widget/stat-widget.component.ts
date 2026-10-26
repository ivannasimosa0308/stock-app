import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  alertCircleOutline,
  cashOutline,
  trendingUpOutline,
  layersOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-stat-widget',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon],
  template: `
    <ion-card
      class="stat-card"
      [class.clickable]="isClickable"
      [style.--widget-accent]="accentColor"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick()"
      tabindex="0"
      role="region"
      [attr.aria-label]="title + ': ' + value + (subtitle ? '. ' + subtitle : '')"
    >
      <ion-card-content class="stat-content">
        <div class="stat-info">
          <span class="stat-title">{{ title }}</span>
          <span class="stat-value">{{ value }}</span>
          @if (subtitle) {
            <span class="stat-subtitle">{{ subtitle }}</span>
          }
        </div>
        <div class="stat-icon-wrapper" [style.background-color]="iconBgColor">
          <ion-icon [name]="icon" [style.color]="accentColor" aria-hidden="true"></ion-icon>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .stat-card {
      margin: 8px 0;
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
      border-left: 5px solid var(--widget-accent, #3880ff);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }

    .stat-card:focus-visible {
      outline: 3px solid var(--widget-accent, #3880ff);
      outline-offset: 2px;
    }

    .stat-card.clickable {
      cursor: pointer;
    }

    .stat-card.clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .stat-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-title {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }

    .stat-subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .stat-icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrapper ion-icon {
      font-size: 28px;
    }
  `]
})
export class StatWidgetComponent {
  // Entradas (Props/Inputs)
  @Input({ required: true }) title!: string;
  @Input() value: string | number | null = '0';
  @Input() icon: string = 'cube-outline';
  @Input() color: 'primary' | 'warning' | 'danger' | 'success' = 'primary';
  @Input() subtitle?: string;
  @Input() isClickable: boolean = false;

  // Salidas (Outputs/Eventos personalizados hacia el componente padre)
  @Output() widgetClick = new EventEmitter<void>();

  constructor() {
    addIcons({
      cubeOutline,
      alertCircleOutline,
      cashOutline,
      trendingUpOutline,
      layersOutline
    });
  }

  get accentColor(): string {
    switch (this.color) {
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      case 'success': return '#10b981';
      case 'primary':
      default: return '#3b82f6';
    }
  }

  get iconBgColor(): string {
    switch (this.color) {
      case 'warning': return 'rgba(245, 158, 11, 0.12)';
      case 'danger': return 'rgba(239, 68, 68, 0.12)';
      case 'success': return 'rgba(16, 185, 129, 0.12)';
      case 'primary':
      default: return 'rgba(59, 130, 246, 0.12)';
    }
  }

  onClick(): void {
    if (this.isClickable) {
      this.widgetClick.emit();
    }
  }
}
