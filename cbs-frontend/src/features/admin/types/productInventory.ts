// Auto-generated from backend entities

export interface ProductInventoryItem {
  id: number;
  itemCode: string;
  itemType: string;
  itemName: string;
  sku: string;
  branchId: number;
  warehouseCode: string;
  totalStock: number;
  allocatedStock: number;
  availableStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  lastReplenishedAt: string;
  lastIssuedAt: string;
  status: string;
}

