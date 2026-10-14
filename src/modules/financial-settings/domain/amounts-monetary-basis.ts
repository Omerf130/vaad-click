export const AmountsMonetaryBasis = {
  /** CP5–CP6D early: treatment fee minor units in *ExVat fields are net, excluding VAT. */
  LEGACY_NET_EXCLUSIVE_VAT: "legacy_net_exclusive_vat",
  /** Lawyer-entered treatment fees are VAT-inclusive gross; net/VAT derived at publish. */
  GROSS_INCLUSIVE_VAT: "gross_inclusive_vat",
} as const;

export type AmountsMonetaryBasis =
  (typeof AmountsMonetaryBasis)[keyof typeof AmountsMonetaryBasis];

export const AMOUNTS_MONETARY_BASES: readonly AmountsMonetaryBasis[] =
  Object.values(AmountsMonetaryBasis);

export function normalizeAmountsMonetaryBasis(
  value: string | null | undefined,
): AmountsMonetaryBasis {
  if (value === AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT) {
    return AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT;
  }
  return AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT;
}

export function isGrossInclusiveVatBasis(
  basis: AmountsMonetaryBasis,
): basis is typeof AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT {
  return basis === AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT;
}
