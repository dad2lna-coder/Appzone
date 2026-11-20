# LeaveBid override inventory

Pre-merge line ranges in `LeaveBid.html`. Every entry is **merged** into the single core script. The runtime version won; wrappers were inlined so each name exists once.

| Status | Kind | Name | Core lines | Override lines | Result |
| --- | --- | --- | --- | --- | --- |
| merged | function | `enforcePortraitPageRule` | — | 11908-11916 | moved into core section 1C |
| merged | window assignment | `isTwoStageCategory` | — | 11923-11926 | new; moved into core as a function declaration |
| merged | window assignment | `computeEmployeeLiabilityRow` | 8982-9018 | 11928-12010 | override replaced core; bodies differed |
| merged | function | `normalizeAirportCode` | — | 12026-12029 | moved into core section 1C |
| merged | function | `ensureMultiAirportStructures` | — | 12031-12072 | moved into core section 1C |
| merged | function | `cloneDeep` | — | 12074-12076 | moved into core section 1C |
| merged | function | `ensureSingleAirportConfig` | — | 12078-12128 | moved into core section 1C |
| merged | function | `saveActiveAirportConfigSnapshot` | — | 12130-12144 | moved into core section 1C |
| merged | function | `loadAirportConfigSnapshotIntoActive` | — | 12146-12156 | moved into core section 1C |
| merged | function | `syncActiveConfigToFormControls` | — | 12158-12179 | moved into core section 1C |
| merged | function | `injectAllocPhaseDropdown` | — | 12181-12208 | moved into core section 1C |
| merged | window assignment | `handleAllocCatOrPhaseChange` | — | 12210-12225 | new; moved into core as a function declaration |
| merged | function | `updateLiabilityModeDropdownLabels` | — | 12227-12244 | moved into core section 1C |
| merged | window assignment | `getAllKnownAirports` | 8724-8730 | 12246-12253 | override replaced core; bodies differed |
| merged | window assignment | `getAirportEmployeeCount` | — | 12255-12258 | new; moved into core as a function declaration |
| merged | wrapper capture | const _origSaveState | — | 12260-12260 | removed after inline; not a function |
| merged | window assignment | `saveState` | 8705-8711 | 12261-12264 | wrapper inlined; no _orig call remains |
| merged | window assignment | `setGlobalAirport` | 8742-8751 | 12266-12284 | override replaced core; bodies differed |
| merged | window assignment | `withAirportScope` | — | 12286-12330 | new; moved into core as a function declaration |
| merged | window assignment | `computeRankedBidEmployees` | 9154-9254 | 12336-12439 | override replaced core; bodies differed |
| merged | window assignment | `renderLiabilityTab` | 9020-9126 | 12441-12576 | override replaced core; bodies differed |
| merged | window assignment | `updateLiabEmpPhase1Weeks` | — | 12578-12590 | new; moved into core as a function declaration |
| merged | wrapper capture | const _origComputeWorkgroupAllocations | — | 12592-12592 | removed after inline; not a function |
| merged | window assignment | `computeWorkgroupAllocations` | 9386-9537 | 12593-12612 | wrapper inlined; no _orig call remains |
| merged | function | wrapTabWithActiveAirportScope (inlined, not retained) | — | 12614-12623 | body inlined into the four scope-wrap rows below |
| merged | function | `injectMultiAirportBar` | — | 12634-12643 | moved into core section 1C |
| merged | window assignment | `renderMultiAirportBar` | — | 12645-12697 | new; moved into core as a function declaration |
| merged | window assignment | `promptSetup6Airports` | — | 12699-12716 | new; moved into core as a function declaration |
| merged | window assignment | `toggleSbsAirport` | — | 12718-12727 | new; moved into core as a function declaration |
| merged | window assignment | `selectAllWithRosterForSbs` | — | 12729-12738 | new; moved into core as a function declaration |
| merged | window assignment | `setSbsMode` | — | 12740-12748 | new; moved into core as a function declaration |
| merged | function | `getSelectedSbsAirportsList` | — | 12750-12753 | moved into core section 1C |
| merged | function | `refreshCurrentTabViews` | — | 12755-12760 | moved into core section 1C |
| merged | window assignment | `updateAirportConfigField` | — | 12766-12783 | new; moved into core as a function declaration |
| merged | window assignment | `updateWeekAllocAdjForAirport` | — | 12785-12796 | new; moved into core as a function declaration |
| merged | window assignment | `updateDayAllocAdjForAirport` | — | 12798-12809 | new; moved into core as a function declaration |
| merged | window assignment | `deletePoolFromBidForAirport` | — | 12811-12826 | new; moved into core as a function declaration |
| merged | function | `computeIsolatedAirportAllocation` | — | 12828-12840 | moved into core section 1C |
| merged | wrapper capture | const _origRecalculateAllocation | — | 12842-12842 | removed after inline; not a function |
| merged | window assignment | `recalculateAllocation` | 9539-9671 | 12843-12903 | wrapper inlined; no _orig call remains |
| merged | function | `renderSbsSplitAllocationPanels` | — | 12905-13046 | moved into core section 1C |
| merged | window assignment | `handleSbsSyncScroll` | — | 13048-13057 | new; moved into core as a function declaration |
| merged | function | `renderSbsUnifiedAllocationMatrix` | — | 13059-13164 | moved into core section 1C |
| merged | function | `renderSideBySideLiabilityIfActive` | — | 13170-13246 | moved into core section 1C |
| merged | function | `renderSideBySideResultsIfActive` | — | 13248-13315 | moved into core section 1C |
| merged | function | `renderSideBySideCalendarIfActive` | — | 13317-13356 | moved into core section 1C |
| merged | function | `upgradeRosterWizardModalUI` | — | 13362-13381 | moved into core section 1C |
| merged | wrapper capture | const _origOpenRosterWizard | — | 13383-13383 | removed after inline; not a function |
| merged | window assignment | `openRosterWizard` | 10023-10028 | 13384-13389 | wrapper inlined; no _orig call remains |
| merged | window assignment | `loadSampleRosterIntoWizard` | 10077-10096 | 13391-13412 | override replaced core; bodies differed |
| merged | window assignment | `commitWizardImport` | 10373-10439 | 13414-13518 | override replaced core; bodies differed |
| merged | window assignment | `buildAllocSubTableHtml` | 11343-11404 | 13525-13584 | override replaced core; bodies differed |
| merged | window assignment | `buildPortraitPrintHTML` | 11406-11590 | 13586-13737 | override replaced core; bodies differed |
| merged | window assignment | `printActiveTabToPDF` | 11606-11615 | 13739-13749 | override replaced core; bodies differed |
| merged | wrapper capture | const _origInitApp | — | 13751-13751 | removed after inline; not a function |
| merged | window assignment | `initApp` | 11634-11645 | 13752-13756 | wrapper inlined; no _orig call remains |
| merged | scope wrap | `renderCalendar5BTab` | 11224-11252 | 12614-12628 | withAirportScope around core body |
| merged | scope wrap | `renderInteractiveCalendarTab` | 9772-9803 | 12614-12628 | withAirportScope around core body then renderSideBySideCalendarIfActive() |
| merged | scope wrap | `openCalDayModal` | 9960-10003 | 12614-12628 | withAirportScope around core body |
| merged | scope wrap | `renderResultsTab` | 11139-11222 | 12614-12628 | withAirportScope around core body then renderSideBySideResultsIfActive() |

Startup kept at the end of the core script, in the same order as the old IIFE: `enforcePortraitPageRule()`, then the `document.readyState` branch (`ensureMultiAirportStructures`, `renderMultiAirportBar`, `refreshCurrentTabViews`).

`DOMContentLoaded` still runs the original `initApp` body first (that listener had already captured the pre-wrap function). Later `initApp()` calls use the wrapped body.
