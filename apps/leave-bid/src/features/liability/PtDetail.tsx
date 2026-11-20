import type { LiabilityTableRow } from "../../store/selectors";
import { TableWrap } from "../../shared/ui/Table";

export function PtDetail({ row }: { row: LiabilityTableRow }) {
  const partTime = row.comp.avgWeekLength < 40;
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Employee</th>
          <th>PP</th>
          <th>Work Hours (incl. carry-in)</th>
          <th>Divisor</th>
          <th>Unconstrained</th>
          <th>PT Accrued</th>
          <th>Carry Over</th>
        </tr>
      </thead>
      <tbody>
        {row.comp.ptDetails.map((detail) => (
          <tr key={detail.pp}>
            <td>{detail.pp === 1 ? row.emp.name : ""}</td>
            <td>PP {String(detail.pp).padStart(2, "0")}</td>
            <td>{detail.workHrs}</td>
            <td>{detail.divisor}</td>
            <td>{detail.unconstrained}</td>
            <td>{detail.ptAccrued}</td>
            <td>{detail.carryOver}</td>
          </tr>
        ))}
        {!partTime ? (
          <tr>
            <td colSpan={7}>Full-time officers still show the divisor math. Accrued hours in Summary view use the FT rate, not the floored PT hours.</td>
          </tr>
        ) : null}
      </tbody>
    </TableWrap>
  );
}
