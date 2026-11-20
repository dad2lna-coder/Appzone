import type { ResultsParticipantRow } from "../../domain/results";
import { Num, TableWrap } from "../../shared/ui/Table";
import tableStyles from "../../shared/ui/Table.module.css";

export function ParticipantTable({ rows }: { rows: ResultsParticipantRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Role</th>
          <th>Pool</th>
          <th>FCFS Group</th>
          <th>Weeks Chosen</th>
          <th>Days Chosen</th>
          <th className={tableStyles.num}>Total Hrs Earned</th>
          <th className={tableStyles.num}>Hours Used</th>
          <th className={tableStyles.num}>Remaining Hrs</th>
          <th className={tableStyles.num}>FCFS Slots Obligated</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.name}-${index}`}>
            <td>#{row.rank}</td>
            <td>
              <strong>{row.name}</strong>
            </td>
            <td>{row.leaveGroup}</td>
            <td>
              <span className="pill pill-warn">{row.effPool}</span>
            </td>
            <td>{row.fcfsGroup}</td>
            <td>{row.weeksLabel}</td>
            <td>{row.daysLabel}</td>
            <Num>{row.earned}</Num>
            <Num>{row.hrsUsed}</Num>
            <Num>
              <strong>{row.remHrs}</strong>
            </Num>
            <Num>
              <span className="pill pill-warn">{row.fcfs}</span>
            </Num>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
