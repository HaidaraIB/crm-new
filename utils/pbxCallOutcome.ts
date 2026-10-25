/**
 * How the softphone names the end of a Loop Cloud PBX call.
 *
 * Declining sends SIP 486, which the PBX records as `busy` ("Busy or declined" in history),
 * and the missed-call push skips it. So the ended card says "Declined", never "Missed":
 * `missed` stays reserved for a caller who hung up before anyone answered.
 */
export const SOFTPHONE_DECLINED = 'declined';

/** Translation key for the ended card's outcome, or null when there is nothing to add. */
export function softphoneEndLabelKey(endStatus: string | null): string | null {
  if (!endStatus) return null;
  return endStatus === SOFTPHONE_DECLINED ? 'softphoneEndDeclined' : `pbxStatus_${endStatus}`;
}
