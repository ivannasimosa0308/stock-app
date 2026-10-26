import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MovementLog, MovementType } from '../models/inventory-log.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MongoLogsService {
  private authService = inject(AuthService);
  private storageKey = 'stockflow_mongo_logs';

  constructor() {
    this.seedInitialLogsIfEmpty();
  }

  /**
   * Registra un nuevo movimiento de almacén en MongoDB
   * Si la API REST no está disponible localmente, persiste en caché local segura para desarrollo continuo
   */
  async logMovement(logData: {
    productId: string;
    sku: string;
    productName: string;
    movementType: MovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    metadata?: Record<string, any>;
  }): Promise<MovementLog> {
    const user = this.authService.currentUser();
    const newLog: MovementLog = {
      id: 'mongo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      productId: logData.productId,
      sku: logData.sku,
      productName: logData.productName,
      movementType: logData.movementType,
      quantity: logData.quantity,
      previousStock: logData.previousStock,
      newStock: logData.newStock,
      reason: logData.reason,
      userId: user?.id || 'sys_user',
      userEmail: user?.email || 'sistema@stockflow.com',
      metadata: logData.metadata || {
        device: 'PWA Web Client',
        platform: navigator.platform
      },
      timestamp: new Date().toISOString()
    };

    try {
      // Intento de envío a la API REST de MongoDB configurada en environment
      const response = await fetch(`${environment.mongoApiUrl}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });

      if (response.ok) {
        const saved = await response.json();
        return saved;
      }
    } catch (error) {
      // Fallback transparente: si no hay servidor backend corriendo todavía,
      // se persiste en el almacenamiento local simulado de MongoDB
      console.warn('API de MongoDB no conectada. Guardando en persistencia local NoSQL simulada:', error);
    }

    this.saveLocalLog(newLog);
    return newLog;
  }

  /**
   * Obtiene todos los registros de movimientos históricos (ordenados de más reciente a más antiguo)
   */
  async getLogs(): Promise<MovementLog[]> {
    try {
      const response = await fetch(`${environment.mongoApiUrl}/movements`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Fallback a almacenamiento local
    }

    return this.getLocalLogs();
  }

  /**
   * Obtiene los últimos N movimientos para métricas del Dashboard
   */
  async getRecentLogs(limit: number = 20): Promise<MovementLog[]> {
    const logs = await this.getLogs();
    return logs.slice(0, limit);
  }

  private getLocalLogs(): MovementLog[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveLocalLog(log: MovementLog): void {
    const current = this.getLocalLogs();
    current.unshift(log); // Añadir al inicio (más reciente primero)
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  /**
   * Si no hay registros previos, inserta datos de auditoría iniciales para poder probar los gráficos
   */
  private seedInitialLogsIfEmpty(): void {
    const current = this.getLocalLogs();
    if (current.length === 0) {
      const seeds: MovementLog[] = [
        {
          id: 'mongo_seed_1',
          productId: 'p1',
          sku: 'LAP-DELL-XPS13',
          productName: 'Portátil Dell XPS 13',
          movementType: 'IN',
          quantity: 10,
          previousStock: 2,
          newStock: 12,
          reason: 'Recepción pedido proveedor Dell #PO-9912',
          userId: 'user_admin',
          userEmail: 'admin@stockflow.com',
          metadata: { carrier: 'DHL Express', batch: 'LOTE-2026-A' },
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
          id: 'mongo_seed_2',
          productId: 'p2',
          sku: 'LAP-MAC-AIRM2',
          productName: 'MacBook Air M2 13"',
          movementType: 'OUT',
          quantity: 2,
          previousStock: 5,
          newStock: 3,
          reason: 'Entrega departamento Comercial',
          userId: 'user_admin',
          userEmail: 'admin@stockflow.com',
          metadata: { department: 'Ventas', ticket: 'TK-441' },
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'mongo_seed_3',
          productId: 'p3',
          sku: 'MON-LG-27UL',
          productName: 'Monitor LG 27" 4K UHD',
          movementType: 'IN',
          quantity: 5,
          previousStock: 3,
          newStock: 8,
          reason: 'Reposición stock crítico',
          userId: 'user_admin',
          userEmail: 'admin@stockflow.com',
          metadata: { supplier: 'LG Electronics' },
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: 'mongo_seed_4',
          productId: 'p4',
          sku: 'TEC-LOGI-MX',
          productName: 'Teclado Logitech MX Keys',
          movementType: 'OUT',
          quantity: 4,
          previousStock: 24,
          newStock: 20,
          reason: 'Venta corporativa #5580',
          userId: 'user_admin',
          userEmail: 'admin@stockflow.com',
          metadata: { customer: 'Tech Solutions SL' },
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ];
      localStorage.setItem(this.storageKey, JSON.stringify(seeds));
    }
  }
}
