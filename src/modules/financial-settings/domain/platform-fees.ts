export type PlatformFees = {
  trustAccountProcessingFeeBasisPoints: number;
  committeeTransferFeeBasisPoints: number;
};

export function hasCompletePlatformFees(
  platformFees: Partial<PlatformFees> | null | undefined,
): platformFees is PlatformFees {
  return (
    platformFees != null &&
    typeof platformFees.trustAccountProcessingFeeBasisPoints === "number" &&
    typeof platformFees.committeeTransferFeeBasisPoints === "number"
  );
}
