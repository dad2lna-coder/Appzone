import type { ResultsGroupRow } from "../../domain/results";
import { Num, TableWrap } from "../../shared/ui/Table";
import tableStyles from "../../shared/ui/Table.module.css";

export function GroupSummaryTable({ rows }: { rows: ResultsGroupRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Effective Pool</th>
          <th className={tableStyles.num}>Officers</th>
          <th className={tableStyles.num}>Earned Hrs</th>
          <th className={tableStyles.num}>Bid Hrs Used</th>
          <th className={tableStyles.num}>Remaining Hrs</th>
          <th className={tableStyles.num}>FCFS Slots Obligated</th>
          <th className={tableStyles.num}>Unselected Slots (Calendar Level)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.pool}>
            <td>
              <strong>{row.pool}</strong>
            </td>
            <Num>{row.count}</Num>
            <Num>{row.earned}</Num>
            <Num>{row.used}</Num>
            <Num>
              <strong>{row.rem}</strong>
            </Num>
            <Num>
              <span className="pill pill-warn">{row.fcfs}</span>
            </Num>
            <Num>{row.totalCalSlots}</Num>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
