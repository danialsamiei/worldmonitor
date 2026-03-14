import { Panel } from './Panel';
import { loadRealtimeFusionSnapshot, type FusionStream } from '@/services/realtime-fusion';

export class InfraTrafficCyberPanel extends Panel {
  constructor() {
    super({ id: 'infra-traffic-cyber', title: 'پایش ترافیک زمینی/هوایی/دریایی + سایبری + IXP', className: 'panel-wide' });
    void this.refresh();
    setInterval(() => { void this.refresh(); }, 45_000);
  }

  private badge(status: 'live' | 'degraded' | 'offline'): string {
    if (status === 'live') return '🟢 زنده';
    if (status === 'degraded') return '🟠 ناپایدار';
    return '🔴 قطع';
  }

  private freshnessLabel(freshness: FusionStream['freshness']): string {
    if (freshness === 'fresh') return 'تازه';
    if (freshness === 'aging') return 'در حال کهنگی';
    return 'کهنه';
  }

  private confidenceLabel(confidence: number): string {
    return `${Math.round(confidence * 100)}٪`;
  }

  private renderStream(stream: FusionStream): string {
    const flags = stream.contradictionFlags.length
      ? stream.contradictionFlags.map((flag) => `<code>${flag}</code>`).join(' ')
      : 'بدون تضاد ثبت‌شده';

    const entities = stream.entitySummary.length
      ? stream.entitySummary.join('، ')
      : 'بدون موجودیت شاخص';

    return `
      <li style="border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:10px;display:grid;gap:8px">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <strong>${stream.title}</strong>
          <span>${this.badge(stream.status)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:8px;font-size:.95em">
          <span>اعتماد منبع: <strong>${this.confidenceLabel(stream.sourceConfidence)}</strong></span>
          <span>تازگی: <strong>${this.freshnessLabel(stream.freshness)}</strong></span>
        </div>
        <div><strong>پرچم تضاد:</strong> ${flags}</div>
        <div><strong>خلاصه موجودیت:</strong> ${entities}</div>
        <div style="opacity:.82">${stream.note}</div>
      </li>
    `;
  }

  private async refresh(): Promise<void> {
    try {
      const snap = await loadRealtimeFusionSnapshot();
      const rows = snap.streams.map((stream) => this.renderStream(stream)).join('');
      this.setContent(`
        <div style="direction:rtl;text-align:right;display:grid;gap:12px;line-height:1.8">
          <p>آخرین بروزرسانی: <span translate="no">${new Date(snap.generatedAt).toLocaleString('fa-IR')}</span></p>
          <ul style="margin:0;padding-inline-start:0;list-style:none;display:grid;gap:10px">${rows}</ul>
          <p style="opacity:.85">خروجی همجوشی اکنون با schema تحلیلی شامل اعتماد منبع، تازگی، تضادها و موجودیت‌های غالب نمایش داده می‌شود.</p>
        </div>
      `);
      this.setDataBadge('live');
    } catch {
      this.setContent('<div style="direction:rtl;text-align:right">داده‌ها موقتاً در دسترس نیست.</div>');
      this.setDataBadge('unavailable');
    }
  }
}
