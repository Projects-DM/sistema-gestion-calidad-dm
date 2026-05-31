import type { ProviderRoutingContext } from "./ProviderRoutingContext";
import type { RuntimeProviderRoutingEngine } from "./RuntimeProviderRoutingEngine";

type ProviderLike = { id: string } | { providerId: string };

function toProviderId(p: ProviderLike): string {
  return "id" in p ? (p.id as string) : (p.providerId as string);
}

export class RuntimeProviderRoutingDecisionEngine {
  constructor(
    private readonly routingEngine: RuntimeProviderRoutingEngine
  ) {}

  public selectBestProvider(providers: ProviderLike[], context: ProviderRoutingContext): { providerId: string; score: number } | null {
    if (!providers.length) return null;

    const scored = providers.map((p) => {
      const providerId = toProviderId(p);
      const score = this.routingEngine.computeRoutingScore(providerId, context);
      return { providerId, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0] ?? null;
  }
}

