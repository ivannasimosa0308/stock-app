export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'DAMAGE';

export interface MovementLog {
  id?: string;
  productId: string;
  sku: string;
  productName: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId?: string;
  userEmail: string;
  timestamp: string | Date;
}
