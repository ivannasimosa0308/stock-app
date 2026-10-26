import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Product, Category } from '../models/product.model';
import { MovementLog, MovementType } from '../models/inventory-log.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private authService = inject(AuthService);
  private localMovementsKey = 'stockflow_supabase_movements_cache';

  private get supabase() {
    return this.authService.client;
  }

  /**
   * Obtiene todos los productos con los datos de su categoría asociada
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name, description)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }

    return (data || []) as Product[];
  }

  /**
   * Obtiene todas las categorías disponibles en el catálogo
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }

    return (data || []) as Category[];
  }

  /**
   * Validador de SKU único contra la base de datos de Supabase
   */
  async checkSkuExists(sku: string, excludeProductId?: string): Promise<boolean> {
    if (!sku || sku.trim().length === 0) return false;

    let query = this.supabase
      .from('products')
      .select('id')
      .ilike('sku', sku.trim());

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error verificando SKU único:', error);
      return false;
    }

    return (data && data.length > 0);
  }

  /**
   * Inserta un nuevo producto en Supabase (solo administradores)
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .insert([product])
      .select('*, category:categories(id, name, description)')
      .single();

    if (error) {
      console.error('Error creando producto:', error);
      throw error;
    }

    return data as Product;
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, category:categories(id, name, description)')
      .single();

    if (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }

    return data as Product;
  }

  /**
   * Elimina un producto por su ID
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de movimientos de inventario desde Supabase (tabla stock_movements)
   */
  async getMovements(limit?: number): Promise<MovementLog[]> {
    try {
      let query = this.supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          productId: row.product_id,
          sku: row.sku,
          productName: row.product_name,
          movementType: row.movement_type as MovementType,
          quantity: row.quantity,
          previousStock: row.previous_stock,
          newStock: row.new_stock,
          reason: row.reason,
          userId: row.user_id,
          userEmail: row.user_email,
          timestamp: row.created_at
        }));
      }
    } catch (err) {
      console.warn('Tabla stock_movements en Supabase no disponible todavía, usando caché local.');
    }

    return this.getLocalMovements();
  }

  /**
   * Registra un movimiento de stock:
   * 1. Actualiza el stock del producto en la tabla 'products' de Supabase
   * 2. Guarda el log de auditoría en la tabla 'stock_movements' de Supabase
   */
  async registerMovement(movementData: {
    productId: string;
    sku: string;
    productName: string;
    movementType: MovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
  }): Promise<MovementLog> {
    const user = this.authService.currentUser();
    const userEmail = user?.email || 'usuario@stockflow.com';

    // 1. Actualizar el stock del producto en Supabase
    await this.updateProduct(movementData.productId, {
      stock: movementData.newStock
    });

    const newLog: MovementLog = {
      id: 'mov_' + Date.now(),
      productId: movementData.productId,
      sku: movementData.sku,
      productName: movementData.productName,
      movementType: movementData.movementType,
      quantity: movementData.quantity,
      previousStock: movementData.previousStock,
      newStock: movementData.newStock,
      reason: movementData.reason,
      userId: user?.id,
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    };

    // 2. Insertar en tabla stock_movements de Supabase
    try {
      await this.supabase.from('stock_movements').insert([{
        product_id: movementData.productId,
        sku: movementData.sku,
        product_name: movementData.productName,
        movement_type: movementData.movementType,
        quantity: movementData.quantity,
        previous_stock: movementData.previousStock,
        new_stock: movementData.newStock,
        reason: movementData.reason,
        user_id: user?.id,
        user_email: userEmail
      }]);
    } catch (err) {
      console.warn('No se pudo insertar en Supabase stock_movements, guardando localmente:', err);
    }

    // Persistir localmente para redundancia
    this.saveLocalMovement(newLog);
    return newLog;
  }

  private getLocalMovements(): MovementLog[] {
    const raw = localStorage.getItem(this.localMovementsKey);
    if (!raw) {
      const initial: MovementLog[] = [
        {
          id: 'seed_mov_1',
          productId: 'p1',
          sku: 'LAP-DELL-XPS13',
          productName: 'Portátil Dell XPS 13',
          movementType: 'IN',
          quantity: 10,
          previousStock: 2,
          newStock: 12,
          reason: 'Recepción albarán proveedor #PO-9912',
          userEmail: 'admin@stockflow.com',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
          id: 'seed_mov_2',
          productId: 'p2',
          sku: 'LAP-MAC-AIRM2',
          productName: 'MacBook Air M2 13"',
          movementType: 'OUT',
          quantity: 2,
          previousStock: 5,
          newStock: 3,
          reason: 'Despacho cliente corporativo #441',
          userEmail: 'admin@stockflow.com',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'seed_mov_3',
          productId: 'p3',
          sku: 'MON-LG-27UL',
          productName: 'Monitor LG 27" 4K UHD',
          movementType: 'IN',
          quantity: 5,
          previousStock: 3,
          newStock: 8,
          reason: 'Reposición de existencias',
          userEmail: 'admin@stockflow.com',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ];
      localStorage.setItem(this.localMovementsKey, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveLocalMovement(log: MovementLog): void {
    const current = this.getLocalMovements();
    current.unshift(log);
    localStorage.setItem(this.localMovementsKey, JSON.stringify(current));
  }
}
