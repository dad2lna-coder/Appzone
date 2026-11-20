import { Card } from "../../shared/ui/Card";
import { Select } from "../../shared/ui/Select";
import { setLeaveListRoleFilter } from "../../store/actions/leaveList";
import { selectLeaveListView } from "../../store/selectors";
import { useAppStore } from "../../store/store";
import { LeaveListTable } from "./LeaveListTable";

export function LeaveListTab() {
  const roleFilter = useAppStore((state) => state.ui.leaveListRoleFilter);
  const view = useAppStore((state) => selectLeaveListView(state, roleFilter));
  const options = [{ value: "ALL", label: "All Roles" }, ...view.roles.map((role) => ({ value: role, label: role }))];
  return (
    <Card
      title="5B- 364-Day Leave Bid Calendar & Daily Roster Table"
      subtitle="Complete 364-day list of daily passenger volume and officers scheduled on Weekly Lines or Daily DAT"
      actions={
        <>
          {/* TODO sbs: renderSideBySideCalendarIfActive */}
          <label className="inline-label">
            Filter Role:
            <Select bare value={roleFilter} onChange={setLeaveListRoleFilter} options={options} />
          </label>
          <button className="btn btn-accent btn-sm" type="button" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </>
      }
    >
      <LeaveListTable rows={view.rows} />
    </Card>
  );
}
