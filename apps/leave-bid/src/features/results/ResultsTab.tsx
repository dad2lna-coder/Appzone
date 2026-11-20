import { exportResultsCsv } from "../../io/exports/results";
import { downloadFile } from "../../io/csv";
import { Card } from "../../shared/ui/Card";
import { selectResultsView } from "../../store/selectors";
import { useAppStore } from "../../store/store";
import { FcfsSummaryTable } from "./FcfsSummaryTable";
import { GroupSummaryTable } from "./GroupSummaryTable";
import { ParticipantTable } from "./ParticipantTable";

export function ResultsTab() {
  const view = useAppStore(selectResultsView);
  return (
    <>
      {/* TODO sbs: renderSideBySideResultsIfActive */}
      <div className="grid-2">
        <Card title="Post-Bid FCFS Liability Summary (By Effective Pool)">
          <GroupSummaryTable rows={view.groups} />
        </Card>
        <Card title="Post-Bid FCFS Liability Summary (By FCFS Group)">
          <FcfsSummaryTable rows={view.fcfs} />
        </Card>
      </div>
      <Card
        title="Individual Participant Selections & FCFS Slots"
        actions={
          <>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => {
                const file = exportResultsCsv(useAppStore.getState());
                downloadFile(file.name, file.text, file.mime);
              }}
            >
              Export Results (.csv)
            </button>
            <button className="btn btn-accent btn-sm" type="button" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </>
        }
      >
        <ParticipantTable rows={view.participants} />
      </Card>
    </>
  );
}
