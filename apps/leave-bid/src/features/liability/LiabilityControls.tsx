import { useMemo } from "react";
import { STANDARD_ROLES } from "../../data/index";
import { setActiveAirport } from "../../store/actions/airports";
import { setLiabilityParams, setLiabilityRoleFilter, syncLiabilityToBidTool } from "../../store/actions/liability";
import { useAppStore } from "../../store/store";
import { DateInput } from "../../shared/ui/DateInput";
import { Select } from "../../shared/ui/Select";

const CATS = [
  { value: "X", label: "CAT X (80% Line / 20% DAT)" },
  { value: "I", label: "CAT I (80% Line / 20% DAT)" },
  { value: "II", label: "CAT II (80% Line / 20% DAT)" },
  { value: "III", label: "CAT III (100% Line Phase 1 / Phase 2 DAT)" },
  { value: "IV", label: "CAT IV (100% Line Phase 1 / Phase 2 DAT)" },
];

const PHASES = [
  { value: "Phase 1", label: "Phase 1" },
  { value: "Phase 2", label: "Phase 2" },
];

const ROLE_LABEL: Record<string, string> = {
  BUE: "BUE",
  TSO: "TSO",
  LTSO: "LTSO",
  ESTI: "ESTI (BUE)",
  MSTI: "MSTI (BUE)",
  STSO: "STSO",
};

export function LiabilityControls({ airports, activeAirport }: { airports: string[]; activeAirport: string }) {
  const params = useAppStore((state) => state.liabilityParams);
  const roleFilter = useAppStore((state) => state.ui.liabilityRoleFilter);
  const employees = useAppStore((state) => state.liabilityEmployees);
  const roles = useMemo(() => {
    const groups = employees.map((emp) => emp.group).filter(Boolean);
    return [...new Set([...STANDARD_ROLES, ...groups])];
  }, [employees]);
  return (
    <div className="form-row">
      <Select
        label="Airport Code"
        value={activeAirport}
        options={airports.map((code) => ({ value: code, label: code }))}
        onChange={setActiveAirport}
      />
      <DateInput label="Start Date of Leave Bid Year" value={params.startDate} onChange={(startDate) => setLiabilityParams({ startDate })} />
      <Select
        label="Pay Periods (PPs) This Year"
        value={String(params.ppCount)}
        options={[
          { value: "26", label: "26 Pay Periods" },
          { value: "27", label: "27 Pay Periods" },
        ]}
        onChange={(value) => setLiabilityParams({ ppCount: parseInt(value, 10) || 26 })}
      />
      <Select label="Airport Category" value={params.airportCat} options={CATS} onChange={(airportCat) => setLiabilityParams({ airportCat })} />
      <Select label="Bid Phase (CAT III/IV)" value={params.phase} options={PHASES} onChange={(phase) => setLiabilityParams({ phase })} />
      <Select
        label="Filter by Role / Pool"
        value={roleFilter}
        options={[{ value: "ALL", label: "All Roles (Combined Summary)" }, ...roles.map((role) => ({ value: role, label: ROLE_LABEL[role] || role }))]}
        onChange={setLiabilityRoleFilter}
      />
      <button className="btn btn-primary btn-sm" type="button" onClick={syncLiabilityToBidTool}>
        Sync Roster to Bid Tool →
      </button>
    </div>
  );
}
