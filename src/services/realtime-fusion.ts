import { fetchOpsHealth } from '@/services/ops-health';

export interface FusionSnapshot {
  generatedAt: string;
  streams: Array<{ key: string; title: string; status: 'live' | 'degraded' | 'offline'; note: string; freshness?: string; lastUpdated?: string | null }>;
}

function mapStatus(health: string): 'live' | 'degraded' | 'offline' {
  if (health === 'healthy') return 'live';
  if (health === 'warning' || health === 'stale' || health === 'degraded') return 'degraded';
  return 'offline';
}

export async function loadRealtimeFusionSnapshot(): Promise<FusionSnapshot> {
  const health = await fetchOpsHealth();

  return {
    generatedAt: health.checkedAt,
    streams: [
      {
        key: 'gdelt',
        title: 'GDELT',
        status: mapStatus(health.components.gdelt.health),
        note: health.components.gdelt.note,
        freshness: health.components.gdelt.freshness,
        lastUpdated: health.components.gdelt.lastSuccessfulAt,
      },
      {
        key: 'ipx',
        title: 'IPX',
        status: mapStatus(health.components.ipx.health),
        note: health.components.ipx.note,
        freshness: health.components.ipx.freshness,
        lastUpdated: health.components.ipx.lastSuccessfulAt,
      },
    ],
  };
}
