import { TableWrap } from "../../shared/ui/Table";

const ROWS = [
  ["SCD Category 1", "< 3 Years", "4 hrs", "1 hr per 20 hrs", "2 Weeks", "3 Days"],
  ["SCD Category 2", "3 – 14 Years", "6 hrs (10h PP25)", "1 hr per 13 hrs", "3 Weeks", "5 Days"],
  ["SCD Category 3", "≥ 15 Years", "8 hrs", "1 hr per 10 hrs", "4 Weeks", "6 Days"],
];

export function ScdRules() {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>SCD Category</th>
          <th>Years of Service</th>
          <th>FT Accrual / PP</th>
          <th>PT Divisor (MD 1100.63-1)</th>
          <th>CBA Bid Lines</th>
          <th>CBA DAT Slots</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={cell}>{index === 0 ? <strong>{cell}</strong> : cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
