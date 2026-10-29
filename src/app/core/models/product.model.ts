// Categoría a la que pertenece el producto (ej. Electrónica, Mobiliario, etc.)
export interface Category {
  id: string;
  name: string;
  description?: string;
}

// Producto del inventario
export interface Product {
  id: string;              // Identificador único (UUID)
  sku: string;             // Código de referencia único (ej. "LAP-DELL-001")
  name: string;            // Nombre comercial del producto
  description?: string;    // Descripción detallada
  image_url?: string;      // URL de imagen almacenada en Supabase Storage
  category_id?: string;    // Llave foránea que apunta a la categoría
  category?: Category;     // Objeto categoría anidado (para mostrar su nombre en tablas)
  stock: number;           // Cantidad física disponible actualmente
  min_stock: number;       // Umbral mínimo de alerta para reposición
  unit_price: number;      // Precio unitario
  created_at?: string;
  updated_at?: string;
}
