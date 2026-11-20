# Leave Bid golden baseline

`npm install` then `npm test` (vitest). Tests reload `../LeaveBid.html` in jsdom — SheetJS CDN stubbed, localStorage cleared — and deep-equal `snapshots/`.

- liability-rows.json: computeEmployeeLiabilityRow for each liabilityEmployees row using STATE.liabilityParams
- ranked-bid-employees.json: computeRankedBidEmployees()
- allocations.json: computeWorkgroupAllocations() / recalculateAllocation() state per getAllKnownAirports() airport
- appointment-schedule.json: generateAppointmentSchedule()
- default-state.json: getDefaultState() (synthetic roster)
`npm run capture` rewrites snapshots after an intentional behavior change.
