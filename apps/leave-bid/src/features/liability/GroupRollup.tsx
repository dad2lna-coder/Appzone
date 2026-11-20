import type { LiabilityRollup } from "../../domain/types";
import { useAppStore } from "../../store/store";
import { TableWrap } from "../../shared/ui/Table";

export function GroupRollup({ rollup, twoStage, activeAirport }: { rollup: LiabilityRollup; twoStage: boolean; activeAirport: string }) {
  const phase = useAppStore((state) => state.liabilityParams.phase);
  const lineHdr = twoStage ? "100% Phase 1 Line Liability (ceil)" : "80% Weekly Line Liability (ceil)";
  const datHdr = twoStage
    ? phase === "Phase 1"
      ? "Phase 1 DAT Liability (0 in Ph 1)"
      : "Phase 2 Remaining Hrs DAT Liability (ceil)"
    : "20% Daily DAT Liability (ceil)";
  const columns = twoStage ? 9 : 7;
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Role / Group ({activeAirport})</th>
          <th>Officers</th>
          <th>100% Accrued Hours</th>
          {twoStage ? (
            <>
              <th>Phase 1 Weeks Used</th>
              <th>Phase 2 Rem. Hours</th>
            </>
          ) : null}
          <th>{lineHdr}</th>
          <th>{datHdr}</th>
          <th>Sum of Officer Bid Lines</th>
          <th>Sum of Officer DAT Slots</th>
        </tr>
      </thead>
      <tbody>
        {rollup.groups.length === 0 ? (
          <tr>
            <td colSpan={columns}>No officers loaded for {activeAirport}.</td>
          </tr>
        ) : (
          rollup.groups.map((group) => (
            <tr key={group.group}>
              <td>
                <strong>{group.group}</strong>
              </td>
              <td>{group.count}</td>
              <td>{group.hours.toLocaleString()} hrs</td>
              {twoStage ? (
                <>
                  <td>{group.p1Wks} Wks</td>
                  <td>{group.remHrs.toLocaleString()} hrs</td>
                </>
              ) : null}
              <td>
                <span className="pill pill-info">{group.weeksLiabCeil} Lines</span> ({group.weeksLiab.toFixed(1)})
              </td>
              <td>
                <span className="pill pill-warn">{group.daysLiabCeil} DAT</span> ({group.daysLiab.toFixed(1)})
              </td>
              <td>
                <strong>{group.cbaLines}</strong>
              </td>
              <td>
                <strong>{group.cbaDat}</strong>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrap>
  );
}
