import type { LiabilityKpis as Kpis } from "../../store/selectors";

export function LiabilityKpis({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid-3">
      <div className="kpi">
        <div className="kpi-label">100% Leave Hours</div>
        <div className="kpi-value">{kpis.hoursLabel}</div>
        <div className="kpi-sub">Total accrued across all PPs</div>
      </div>
      <div className="kpi accent">
        <div className="kpi-label">CBA Bid Lines to Offer</div>
        <div className="kpi-value">{kpis.bidLines.toLocaleString()}</div>
        <div className="kpi-sub">{kpis.linesSub}</div>
      </div>
      <div className="kpi warn">
        <div className="kpi-label">CBA DAT Slots to Offer</div>
        <div className="kpi-value">{kpis.datSlots.toLocaleString()}</div>
        <div className="kpi-sub">{kpis.datSub}</div>
      </div>
    </div>
  );
}
