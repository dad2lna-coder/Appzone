import type { ResultsFcfsRow } from "../../domain/results";
import { Num, TableWrap } from "../../shared/ui/Table";
import tableStyles from "../../shared/ui/Table.module.css";

export function FcfsSummaryTable({ rows }: { rows: ResultsFcfsRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>FCFS Group</th>
          <th className={tableStyles.num}>Officers</th>
          <th className={tableStyles.num}>Remaining Hrs</th>
          <th className={tableStyles.num}>FCFS Slots to Offer</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.group}>
            <td>
              <strong>{row.group}</strong>
            </td>
            <Num>{row.count}</Num>
            <Num>{row.rem}</Num>
            <Num>
              <span className="pill pill-info">{row.fcfs}</span>
            </Num>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
