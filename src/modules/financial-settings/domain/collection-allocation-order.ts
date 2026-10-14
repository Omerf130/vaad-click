export const CollectionAllocationOrder = {
  UNSPECIFIED: "unspecified",
  EXPENSES_THEN_PRINCIPAL: "expenses_then_principal",
} as const;

export type CollectionAllocationOrder =
  (typeof CollectionAllocationOrder)[keyof typeof CollectionAllocationOrder];

export const COLLECTION_ALLOCATION_ORDERS: readonly CollectionAllocationOrder[] =
  Object.values(CollectionAllocationOrder);
