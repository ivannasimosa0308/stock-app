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
  private localProductsKey = 'stockflow_products_catalog_v2';
  private localImagesKey = 'stockflow_product_images_map';

  private get supabase() {
    return this.authService.client;
  }

  private readonly defaultCategories: Category[] = [
    { id: 'cat-1', name: 'Portátiles & Workstations', description: 'Equipos informáticos portátiles de alto rendimiento' },
    { id: 'cat-2', name: 'Monitores & Pantallas', description: 'Monitores 4K UHD y paneles profesionales' },
    { id: 'cat-3', name: 'Periféricos & Accesorios', description: 'Teclados mecánicos, ratones y docks USB-C' },
    { id: 'cat-4', name: 'Redes & Servidores', description: 'Switches gestionables, routers y almacenamiento NAS' }
  ];

  private readonly seedProducts: Product[] = [
    {
      id: 'prod-1',
      sku: 'LAP-DELL-XPS15',
      name: 'Portátil Dell XPS 15 OLED',
      description: 'Intel Core i7 13700H, 32GB RAM, 1TB NVMe SSD',
      category_id: 'cat-1',
      category: { id: 'cat-1', name: 'Portátiles & Workstations' },
      stock: 14,
      min_stock: 5,
      unit_price: 1890,
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-01-15T10:00:00Z'
    },
    {
      id: 'prod-2',
      sku: 'LAP-MAC-PRO14',
      name: 'MacBook Pro 14" M3 Pro',
      description: 'Chip Apple M3 Pro, 18GB memoria unificada, 512GB SSD',
      category_id: 'cat-1',
      category: { id: 'cat-1', name: 'Portátiles & Workstations' },
      stock: 4,
      min_stock: 6,
      unit_price: 2249,
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-02-10T11:30:00Z'
    },
    {
      id: 'prod-3',
      sku: 'MON-LG-32UN880',
      name: 'Monitor LG UltraFine 32" 4K Ergo',
      description: 'Panel IPS 4K UHD, USB-C 60W PD, brazo ergonómico',
      category_id: 'cat-2',
      category: { id: 'cat-2', name: 'Monitores & Pantallas' },
      stock: 19,
      min_stock: 8,
      unit_price: 589,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-03-04T09:15:00Z'
    },
    {
      id: 'prod-4',
      sku: 'PER-LOG-MXM3S',
      name: 'Kit Logitech MX Keys & Master 3S',
      description: 'Combo inalámbrico avanzado para desarrollo y diseño',
      category_id: 'cat-3',
      category: { id: 'cat-3', name: 'Periféricos & Accesorios' },
      stock: 32,
      min_stock: 10,
      unit_price: 215,
      image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-04-12T14:20:00Z'
    },
    {
      id: 'prod-5',
      sku: 'NET-SYN-DS923',
      name: 'Servidor NAS Synology DiskStation DS923+',
      description: '4 bahías RAID empresarial, 2x 1GbE LAN, caché NVMe',
      category_id: 'cat-4',
      category: { id: 'cat-4', name: 'Redes & Servidores' },
      stock: 3,
      min_stock: 5,
      unit_price: 645,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-05-20T16:40:00Z'
    },
    {
      id: 'prod-6',
      sku: 'MON-DELL-U2723QE',
      name: 'Monitor Dell UltraSharp 27" 4K Hub',
      description: 'IPS Black 2000:1, Hub RJ45 y USB-C 90W integrado',
      category_id: 'cat-2',
      category: { id: 'cat-2', name: 'Monitores & Pantallas' },
      stock: 11,
      min_stock: 5,
      unit_price: 679,
      image_url: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=300&q=80',
      created_at: '2026-06-08T12:10:00Z'
    }
  ];

  private getImageMap(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(this.localImagesKey) || '{}');
    } catch {
      return {};
    }
  }

  private saveImageForSku(sku: string, imageUrl: string): void {
    const map = this.getImageMap();
    map[sku] = imageUrl;
    localStorage.setItem(this.localImagesKey, JSON.stringify(map));
  }

  private getLocalProducts(): Product[] {
    const raw = localStorage.getItem(this.localProductsKey);
    if (!raw) {
      localStorage.setItem(this.localProductsKey, JSON.stringify(this.seedProducts));
      return [...this.seedProducts];
    }
    try {
      const parsed = JSON.parse(raw) as Product[];
      return parsed.length > 0 ? parsed : [...this.seedProducts];
    } catch {
      return [...this.seedProducts];
    }
  }

  private saveLocalProducts(products: Product[]): void {
    localStorage.setItem(this.localProductsKey, JSON.stringify(products));
  }

  /**
   * Obtiene todos los productos con los datos de su categoría e imagen asociada
   */
  async getProducts(): Promise<Product[]> {
    const imgMap = this.getImageMap();
    const fallbackImages = [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80'
    ];

    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*, category:categories(id, name, description)')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as Product[]).map((p, idx) => ({
          ...p,
          image_url: p.image_url || imgMap[p.sku] || fallbackImages[idx % fallbackImages.length]
        }));
      }
    } catch (err) {
      console.warn('Usando catálogo local de respaldo:', err);
    }

    return this.getLocalProducts().map((p, idx) => ({
      ...p,
      image_url: p.image_url || imgMap[p.sku] || fallbackImages[idx % fallbackImages.length]
    }));
  }

  /**
   * Obtiene todas las categorías disponibles en el catálogo
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Category[];
      }
    } catch {
      // Fallback a categorías por defecto
    }
    return this.defaultCategories;
  }

  /**
   * Validador de SKU único contra la base de datos de Supabase y catálogo local
   */
  async checkSkuExists(sku: string, excludeProductId?: string): Promise<boolean> {
    if (!sku || sku.trim().length === 0) return false;
    const cleanSku = sku.trim().toUpperCase();

    try {
      let query = this.supabase
        .from('products')
        .select('id')
        .ilike('sku', cleanSku);

      if (excludeProductId) {
        query = query.neq('id', excludeProductId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return true;
      }
    } catch {
      // Continuar con validación local
    }

    const localMatch = this.getLocalProducts().some(
      p => p.sku.toUpperCase() === cleanSku && p.id !== excludeProductId
    );
    return localMatch;
  }

  /**
   * Inserta un nuevo producto en Supabase y en el catálogo local sincronizado
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
    if (product.image_url) {
      this.saveImageForSku(product.sku, product.image_url);
    }

    const categories = await this.getCategories();
    const matchedCat = categories.find(c => c.id === product.category_id) || categories[0];

    try {
      const { image_url, ...dbPayload } = product as any;
      const { data, error } = await this.supabase
        .from('products')
        .insert([dbPayload])
        .select('*, category:categories(id, name, description)')
        .single();

      if (!error && data) {
        return { ...(data as Product), image_url: product.image_url };
      }
    } catch {
      // Si la sesión es Demo, persistimos en catálogo local
    }

    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now(),
      category: matchedCat,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const current = this.getLocalProducts();
    current.unshift(newProduct);
    this.saveLocalProducts(current);
    return newProduct;
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    if (updates.sku && updates.image_url) {
      this.saveImageForSku(updates.sku, updates.image_url);
    }

    const current = this.getLocalProducts();
    const idx = current.findIndex(p => p.id === id);
    if (idx !== -1) {
      const categories = await this.getCategories();
      const matchedCat = updates.category_id
        ? categories.find(c => c.id === updates.category_id) || current[idx].category
        : current[idx].category;

      current[idx] = {
        ...current[idx],
        ...updates,
        category: matchedCat,
        updated_at: new Date().toISOString()
      };
      this.saveLocalProducts(current);
    }

    try {
      const { image_url, category, ...dbUpdates } = updates as any;
      const { data, error } = await this.supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', id)
        .select('*, category:categories(id, name, description)')
        .single();

      if (!error && data) {
        return { ...(data as Product), image_url: updates.image_url };
      }
    } catch {
      // Continuar con copia local actualizada
    }

    return current[idx !== -1 ? idx : 0];
  }

  /**
   * Elimina un producto por su ID
   */
  async deleteProduct(id: string): Promise<void> {
    const current = this.getLocalProducts().filter(p => p.id !== id);
    this.saveLocalProducts(current);

    try {
      await this.supabase
        .from('products')
        .delete()
        .eq('id', id);
    } catch {
      // Eliminado en modo Demo local
    }
  }

  /**
   * Obtiene el historial de movimientos de inventario
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
    } catch {
      // Usar caché local enriquecida
    }

    const local = this.getLocalMovements();
    return limit ? local.slice(0, limit) : local;
  }

  /**
   * Registra un movimiento de stock
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
    const userEmail = user?.email || 'operador@stockflow.local';

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
    } catch {
      // Guardado local garantizado
    }

    this.saveLocalMovement(newLog);
    return newLog;
  }

  private getLocalMovements(): MovementLog[] {
    const raw = localStorage.getItem(this.localMovementsKey);
    if (!raw) {
      const initial: MovementLog[] = [
        {
          id: 'seed_mov_1',
          productId: 'prod-1',
          sku: 'LAP-DELL-XPS15',
          productName: 'Portátil Dell XPS 15 OLED',
          movementType: 'IN',
          quantity: 10,
          previousStock: 4,
          newStock: 14,
          reason: 'Recepción albarán proveedor #PO-9912',
          userEmail: 'admin@stockflow.local',
          timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
        },
        {
          id: 'seed_mov_2',
          productId: 'prod-2',
          sku: 'LAP-MAC-PRO14',
          productName: 'MacBook Pro 14" M3 Pro',
          movementType: 'OUT',
          quantity: 3,
          previousStock: 7,
          newStock: 4,
          reason: 'Asignación departamento diseño UI/UX',
          userEmail: 'operador@stockflow.local',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
          id: 'seed_mov_3',
          productId: 'prod-3',
          sku: 'MON-LG-32UN880',
          productName: 'Monitor LG UltraFine 32" 4K Ergo',
          movementType: 'IN',
          quantity: 8,
          previousStock: 11,
          newStock: 19,
          reason: 'Reposición trimestral de pantallas 4K',
          userEmail: 'admin@stockflow.local',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'seed_mov_4',
          productId: 'prod-4',
          sku: 'PER-LOG-MXM3S',
          productName: 'Kit Logitech MX Keys & Master 3S',
          movementType: 'OUT',
          quantity: 5,
          previousStock: 37,
          newStock: 32,
          reason: 'Entrega a nuevos ingresos IT',
          userEmail: 'operador@stockflow.local',
          timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
        },
        {
          id: 'seed_mov_5',
          productId: 'prod-5',
          sku: 'NET-SYN-DS923',
          productName: 'Servidor NAS Synology DiskStation DS923+',
          movementType: 'OUT',
          quantity: 2,
          previousStock: 5,
          newStock: 3,
          reason: 'Instalación en rack principal planta 2',
          userEmail: 'admin@stockflow.local',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
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
