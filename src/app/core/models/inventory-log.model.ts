// Tipos de operaciones de almacén permitidas
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'DAMAGE';
// IN: Entrada de proveedor
// OUT: Salida por venta/despacho
// ADJUSTMENT: Corrección tras inventario físico
// DAMAGE: Baja por rotura o producto defectuoso

export interface MovementLog {
    id?: string;             // Identificador generado por MongoDB (_id)
    productId: string;       // UUID del producto (referencia a Supabase)
    sku: string;             // Copia del SKU para consultas rápidas sin hacer JOINs
    productName: string;     // Copia del nombre del producto
    movementType: MovementType;
    quantity: number;        // Unidades movidas en la operación
    previousStock: number;   // Cuánto había antes del movimiento
    newStock: number;        // Cuánto quedó después del movimiento
    reason: string;          // Motivo (ej. "Recepción de pedido #1024", "Venta a cliente")
    userId: string;          // Empleado que realizó la acción
    userEmail: string;       // Email del empleado para auditoría inmediata
    metadata?: Record<string, any>; // Flexibilidad NoSQL: transportista, lote, observaciones
    timestamp: string | Date;       // Momento exacto del movimiento
}