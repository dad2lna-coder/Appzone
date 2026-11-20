import { Card } from "../../shared/ui/Card";
import { useAppStore } from "../../store/store";
import { selectLiabilityView } from "../../store/selectors";
import { GroupRollup } from "./GroupRollup";
import { LiabilityControls } from "./LiabilityControls";
import { LiabilityKpis } from "./LiabilityKpis";
import { LiabilityTable } from "./LiabilityTable";
import { ScdRules } from "./ScdRules";

export function LiabilityTab() {
  const view = useAppStore((state) =>
    selectLiabilityView({
      liabilityEmployees: state.liabilityEmployees,
      liabilityParams: state.liabilityParams,
      allocConfig: state.allocConfig,
      forecastsByAirport: state.forecastsByAirport,
      bidEmployees: state.bidEmployees,
      knownAirportSlots: state.knownAirportSlots,
      roleFilter: state.ui.liabilityRoleFilter,
    }),
  );
  const mode = useAppStore((state) => state.ui.liabilityViewMode);
  const ptEmpId = useAppStore((state) => state.ui.liabilityPtEmpId);
  return (
    <>
      <div className="grid-2">
        <Card
          title="Airport Category & Bid Year Parameters"
          subtitle="From CBA Leave Liability 2027.xlsx (Leave_Liability_Code)"
        >
          <LiabilityControls airports={view.airports} activeAirport={view.activeAirport} />
          <div style={{ height: 8 }} />
          <LiabilityKpis kpis={view.kpis} />
        </Card>
        <Card
          title="CBA SCD Rules & MD 1100.63-1 Reference"
          subtitle="Automatic pay-period step-ups and part-time divisors for BUEs and STSOs"
        >
          <ScdRules />
        </Card>
      </div>
      <Card
        title="Leave Liability Rollup by Group / Role"
        subtitle="Officers, accrued hours, CBA bid lines, and DAT slots by job title"
      >
        <GroupRollup rollup={view.rollup} twoStage={view.kpis.twoStage} activeAirport={view.activeAirport} />
      </Card>
      <Card
        title="Employee Leave Liability Roster & Pay Period Accrual Breakdown"
        subtitle="Edit role, EOD, SCD, hours/PP, or days/PP to recalculate every pay period"
      >
        <LiabilityTable rows={view.rows} mode={mode} ptEmpId={ptEmpId} twoStage={view.kpis.twoStage} ppCount={view.ppCount} />
      </Card>
    </>
  );
}
