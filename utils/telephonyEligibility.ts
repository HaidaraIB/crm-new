export type PolicyQueryStatus = 'pending' | 'error' | 'success';

/**
 * Avoid probing the protected telephony endpoint for companies the policy API
 * has explicitly rejected. If the policy lookup itself fails, preserve the
 * previous request path so an eligible pilot's real telephony error is visible.
 */
export function shouldQueryTelephonyMe(
  userId: number | undefined,
  policyStatus: PolicyQueryStatus,
  telephonyEnabled: boolean | undefined,
): boolean {
  if (!userId) return false;
  if (policyStatus === 'error') return true;
  return policyStatus === 'success' && telephonyEnabled === true;
}
