export type BuildingAddressInput = {
  city: string;
  street: string;
  houseNumber: string;
  postalCode?: string;
};

export function normalizeBuildingAddressKey(input: BuildingAddressInput): string {
  const parts = [
    input.city.trim().toLowerCase(),
    input.street.trim().toLowerCase(),
    input.houseNumber.trim().toLowerCase(),
  ];
  return parts.join("|");
}
