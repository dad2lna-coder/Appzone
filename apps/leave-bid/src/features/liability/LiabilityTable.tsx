import { addLiabilityEmployee, removeLiabilityEmployee, setLiabilityPtEmp, setLiabilityViewMode } from "../../store/actions/liability";
import type { LiabilityTableRow } from "../../store/selectors";
import type { LiabilityViewMode } from "../../store/ui";
import { Select } from "../../shared/ui/Select";
import { TableWrap } from "../../shared/ui/Table";
import { EmployeeRow } from "./EmployeeRow";
import { PtDetail } from "./PtDetail";

const MODES = [
  { value: "summary", label: "Summary + Final PP Accrued Hours (PP 01 - PP 26)" },
  { value: "scd", label: "SCD Earn Category per PP" },
  { value: "pt", label: "Part-Time Carryover & Unconstrained Detail (Select Employee)" },
];

export function LiabilityTable({
  rows,
  mode,
  ptEmpId,
  twoStage,
  ppCount,
}: {
  rows: LiabilityTableRow[];
  mode: LiabilityViewMode;
  ptEmpId: number | null;
  twoStage: boolean;
  ppCount: number;
}) {
  const selected = rows.find((row) => row.emp.id === ptEmpId) ?? rows[0];
  const headers = mode === "scd" ? "SCD rate" : "Accrued";
  return (
    <>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <Select bare label="View Mode" value={mode} options={MODES} onChange={(value) => setLiabilityViewMode(value as LiabilityViewMode)} />
        {mode === "pt" ? (
          <Select
            bare
            value={String(selected?.emp.id ?? "")}
            options={rows.map((row) => ({ value: String(row.emp.id), label: row.emp.name }))}
            onChange={(value) => setLiabilityPtEmp(Number(value))}
          />
        ) : null}
        <button className="btn btn-primary btn-sm" type="button" onClick={addLiabilityEmployee}>
          + Add Employee
        </button>
        <button className="btn btn-outline btn-sm" type="button" disabled title="Roster import wizard is not ported yet">
          Import Roster
        </button>
      </div>
      {mode === "pt" && selected ? (
        <PtDetail row={selected} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Airport</th>
              <th>Role</th>
              <th>EOD</th>
              <th>SCD</th>
              <th>Hrs/PP</th>
              <th>Days/PP</th>
              {twoStage ? <th>Phase 1 Wks</th> : null}
              <th>Bid Lines</th>
              <th>DAT Slots</th>
              <th>Total Hrs</th>
              {Array.from({ length: ppCount }, (_, index) => (
                <th key={index}>
                  PP {String(index + 1).padStart(2, "0")}
                  <div style={{ fontWeight: 500, color: "#64748b" }}>{headers}</div>
                </th>
              ))}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EmployeeRow key={row.origIdx} row={row} mode={mode} twoStage={twoStage} onRemove={removeLiabilityEmployee} />
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
