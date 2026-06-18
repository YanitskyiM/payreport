export const workclockQueryKeys = {
  dashboardEntries: (userId: string, startIso: string, endIso: string) =>
    ['workclock', 'dashboard-entries', userId, startIso, endIso] as const,
  dashboardEntriesPrefix: (userId: string) => ['workclock', 'dashboard-entries', userId] as const,
  dashboardRecentEntries: (userId: string) => ['workclock', 'dashboard-recent-entries', userId] as const,
  entries: (userId: string) => ['workclock', 'entries', userId] as const,
  entryCollections: (userId: string) =>
    [
      workclockQueryKeys.entries(userId),
      workclockQueryKeys.dashboardEntriesPrefix(userId),
      workclockQueryKeys.dashboardRecentEntries(userId),
      workclockQueryKeys.reportEntriesPrefix(userId),
    ] as const,
  profile: (userId: string) => ['workclock', 'profile', userId] as const,
  reportEntries: (userId: string, startDate: string, endDate: string) =>
    ['workclock', 'report-entries', userId, startDate, endDate] as const,
  reportEntriesPrefix: (userId: string) => ['workclock', 'report-entries', userId] as const,
}
