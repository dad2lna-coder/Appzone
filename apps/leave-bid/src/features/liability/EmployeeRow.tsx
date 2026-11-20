import { setPhase1Weeks, updateLiabilityEmployee } from "../../store/actions/liability";
import type { LiabilityTableRow } from "../../store/selectors";
import type { LiabilityViewMode } from "../../store/ui";
import { DateInput } from "../../shared/ui/DateInput";
import { NumberInput } from "../../shared/ui/NumberInput";
import { TextInput } from "../../shared/ui/TextInput";

export function EmployeeRow({
  row,
  mode,
  twoStage,
  onRemove,
}: {
  row: LiabilityTableRow;
  mode: LiabilityViewMode;
  twoStage: boolean;
  onRemove: (index: number) => void;
}) {
  const { emp, comp, origIdx } = row;
  const pp = mode === "scd" ? comp.scdRates : comp.finalAccrued;
  return (
    <tr>
      <td>
        <TextInput value={emp.name} width={120} onChange={(value) => updateLiabilityEmployee(origIdx, "name", value)} />
      </td>
      <td>
        <TextInput
          value={emp.airport}
          width={58}
          onChange={(value) => updateLiabilityEmployee(origIdx, "airport", value.toUpperCase())}
        />
      </td>
      <td>
        <TextInput value={emp.group} width={68} onChange={(value) => updateLiabilityEmployee(origIdx, "group", value)} />
      </td>
      <td>
        <DateInput edit value={emp.eod} onChange={(value) => updateLiabilityEmployee(origIdx, "eod", value)} />
      </td>
      <td>
        <DateInput edit value={emp.scd} onChange={(value) => updateLiabilityEmployee(origIdx, "scd", value)} />
      </td>
      <td>
        <NumberInput edit width={58} value={emp.hoursPerPP} onChange={(value) => updateLiabilityEmployee(origIdx, "hoursPerPP", value || 80)} />
      </td>
      <td>
        <NumberInput edit width={52} value={emp.daysPerPP} onChange={(value) => updateLiabilityEmployee(origIdx, "daysPerPP", value || 10)} />
      </td>
      {twoStage ? (
        <td>
          <NumberInput edit width={52} value={emp.phase1Weeks || 0} onChange={(value) => setPhase1Weeks(origIdx, value)} />
        </td>
      ) : null}
      <td>
        <strong>{comp.cbaBidLines}</strong>
      </td>
      <td>
        <strong>{comp.cbaDatSlots}</strong>
      </td>
      <td>
        <span className="pill pill-info">{comp.totalHoursEarned}</span>
      </td>
      {pp.map((value, index) => (
        <td key={index}>{value}</td>
      ))}
      <td>
        <button className="btn btn-danger btn-sm" type="button" onClick={() => onRemove(origIdx)}>
          ×
        </button>
      </td>
    </tr>
  );
}
