import type { LeaveListRow } from "../../domain/leaveList";
import { Num, TableWrap } from "../../shared/ui/Table";
import tableStyles from "../../shared/ui/Table.module.css";

export function LeaveListTable({ rows }: { rows: LeaveListRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Pay Period</th>
          <th>Week</th>
          <th>Date</th>
          <th>DoW</th>
          <th>Holiday / Note</th>
          <th className={tableStyles.num}>Daily Volume</th>
          <th className={tableStyles.center}>Total on Leave</th>
          <th>Officers on Weekly Line</th>
          <th>Officers on Daily DAT</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td>{row.ppLabel}</td>
            <td>{row.wkLabel}</td>
            <td>
              <strong>{row.date}</strong>
            </td>
            <td>{row.dow}</td>
            <td>{row.holiday}</td>
            <Num>{row.volumeLabel}</Num>
            <td className={tableStyles.center}>
              <span className={row.total > 0 ? "pill pill-success" : "pill pill-info"}>{row.total}</span>
            </td>
            <td>{row.weekOfficers}</td>
            <td>{row.dayOfficers}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
