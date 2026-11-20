Liability tab: year parameters, SCD reference, group rollup, and the editable roster.
Domain: `computeEmployeeLiabilityRow`, `computeLiabilityRollup`, `syncLiabilityEmployeesToBid`, `activateAirport`.
Actions: `src/store/actions/liability.ts` and `setActiveAirport`. Selector: `selectLiabilityView`.
View modes (summary, SCD rate, part-time detail) read those row fields. The reference HTML select is not wired.
