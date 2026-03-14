import { Panel } from './Panel';
import { loadRealtimeFusionSnapshot } from '@/services/realtime-fusion';
import { t } from '@/services/i18n';

export class InfraTrafficCyberPanel extends Panel {
  constructor() {
    super({ id: 'infra-traffic-cyber', title: t('components.infraTraffic.title'), className: 'panel-wide' });
    void this.refresh();
    setInterval(() => { void this.refresh(); }, 45_000);
  }

  private badge(status: 'live' | 'degraded' | 'offline'): string {
    if (status === 'live') return `🟢 ${t('components.infraTraffic.status.healthy')}`;
    if (status === 'degraded') return `🟠 ${t('components.infraTraffic.status.degraded')}`;
    return `🔴 ${t('components.infraTraffic.status.unavailable')}`;
  }

  private freshnessLabel(freshness?: string): string {
    if (freshness === 'fresh') return t('components.infraTraffic.freshness.fresh');
    if (freshness === 'stale') return t('components.infraTraffic.freshness.stale');
    return t('components.infraTraffic.freshness.unknown');
  }

  private async refresh(): Promise<void> {
    try {
      const snap = await loadRealtimeFusionSnapshot();
      const rows = snap.streams.map((s) => {
        const last = s.lastUpdated
          ? new Date(s.lastUpdated).toLocaleString('fa-IR')
          : t('components.infraTraffic.noData');
        return `<li><strong>${s.title}</strong> — ${this.badge(s.status)}<div>${s.note}</div><div class="text-muted">${t('components.infraTraffic.freshnessLabel')}: ${this.freshnessLabel(s.freshness)} | ${t('components.infraTraffic.lastUpdate')}: <span translate="no">${last}</span></div></li>`;
      }).join('');

      this.setContent(`
        <div style="direction:rtl;text-align:right;display:grid;gap:10px;line-height:1.8">
          <p>${t('components.infraTraffic.snapshotAt')}: <span translate="no">${new Date(snap.generatedAt).toLocaleString('fa-IR')}</span></p>
          <ul style="margin:0;padding-inline-start:18px;display:grid;gap:8px">${rows}</ul>
          <p style="opacity:.85">${t('components.infraTraffic.description')}</p>
          <div><button class="retry-button" type="button" id="infra-traffic-retry">${t('components.infraTraffic.retry')}</button></div>
        </div>
      `);
      this.content.querySelector('#infra-traffic-retry')?.addEventListener('click', () => { void this.refresh(); });
      this.setDataBadge('live');
      this.setErrorState(false);
    } catch {
      this.setContent(`<div style="direction:rtl;text-align:right">${t('components.infraTraffic.unavailable')}</div><div><button class="retry-button" type="button" id="infra-traffic-retry">${t('components.infraTraffic.retry')}</button></div>`);
      this.content.querySelector('#infra-traffic-retry')?.addEventListener('click', () => { void this.refresh(); });
      this.setDataBadge('unavailable');
      this.setErrorState(true);
    } finally {
    }
  }
}
