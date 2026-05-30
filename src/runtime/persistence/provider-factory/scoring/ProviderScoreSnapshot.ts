import type { ProviderScore } from "./ProviderScore";

export type ProviderScoreSnapshot = ProviderScore & {
  /** Optional breakdown for debugging/audit of the scoring computation. */
  breakdown?: ProviderScoreBreakdown;
};

import type { ProviderScoreBreakdown } from "./ProviderScoreBreakdown";

