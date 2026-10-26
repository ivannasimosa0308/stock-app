import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Product, Category } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private authService = inject(AuthService);

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
   * Devuelve true si el SKU ya existe (y no pertenece al producto que se está editando)
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
}
