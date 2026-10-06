/**
 * Server-side Ghana (Africa/Accra) Business Date Utility
 */

export const ACCRA_TIMEZONE = 'Africa/Accra';

export function getAccraToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function getAccraDateString(input?: string | Date | null): string {
  if (!input) return getAccraToday();

  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }

  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) {
    return getAccraToday();
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

export function formatAccraShort(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA_TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export interface AccraDateRange {
  fromDate: string;
  toDate: string;
  label: string;
  normalizedRange: string;
}

export interface AccraDateRangeWithComparison extends AccraDateRange {
  hasComparison: boolean;
  previousRange: {
    fromDate: string;
    toDate: string;
    label: string;
  } | null;
  reasonIfUnavailable?: string;
}

export function resolveAccraDateRange(
  range?: string,
  startDate?: string,
  endDate?: string
): AccraDateRange {
  const normalizedRange = (range || 'this_month')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  const todayStr = getAccraToday();
  const [tY, tM, tD] = todayStr.split('-').map(Number);

  // Date calculation in Ghana (Africa/Accra) time
  const todayDateUtc = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
  const dayOfWeek = todayDateUtc.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

  // Monday of this week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday, 12, 0, 0));
  const thisWeekMondayStr = getAccraDateString(thisWeekMonday);
  const thisWeekSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday + 6, 12, 0, 0));
  const thisWeekSundayStr = getAccraDateString(thisWeekSunday);

  // Last week Monday and Sunday
  const lastWeekMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 7, 12, 0, 0));
  const lastWeekMondayStr = getAccraDateString(lastWeekMonday);
  const lastWeekSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 1, 12, 0, 0));
  const lastWeekSundayStr = getAccraDateString(lastWeekSunday);

  // Yesterday
  const yesterdayDate = new Date(Date.UTC(tY, tM - 1, tD - 1, 12, 0, 0));
  const yesterdayStr = getAccraDateString(yesterdayDate);

  // This month ('YYYY-MM')
  const thisMonthStr = `${tY}-${String(tM).padStart(2, '0')}`;

  // Last month ('YYYY-MM')
  const lastMonthDate = new Date(Date.UTC(tY, tM - 2, 1, 12, 0, 0));
  const lastMonthYear = lastMonthDate.getUTCFullYear();
  const lastMonthNum = lastMonthDate.getUTCMonth() + 1;
  const lastMonthStr = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;
  const lastDayOfLastMonth = new Date(Date.UTC(tY, tM - 1, 0, 12, 0, 0)).getUTCDate();
  const lastMonthEndStr = `${lastMonthStr}-${String(lastDayOfLastMonth).padStart(2, '0')}`;

  // Quarters
  const currentQuarter = Math.floor((tM - 1) / 3) + 1;
  const qStartMonth = (currentQuarter - 1) * 3 + 1;
  const thisQuarterStartStr = `${tY}-${String(qStartMonth).padStart(2, '0')}-01`;
  const qEndMonth = qStartMonth + 2;
  const lastDayOfQuarter = new Date(Date.UTC(tY, qEndMonth, 0, 12, 0, 0)).getUTCDate();
  const thisQuarterEndStr = `${tY}-${String(qEndMonth).padStart(2, '0')}-${String(lastDayOfQuarter).padStart(2, '0')}`;

  const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? tY - 1 : tY;
  const lastQStartMonth = (lastQuarter - 1) * 3 + 1;
  const lastQEndMonth = lastQStartMonth + 2;
  const lastQStartStr = `${lastQuarterYear}-${String(lastQStartMonth).padStart(2, '0')}-01`;
  const lastDayOfLastQ = new Date(Date.UTC(lastQuarterYear, lastQEndMonth, 0, 12, 0, 0)).getUTCDate();
  const lastQEndStr = `${lastQuarterYear}-${String(lastQEndMonth).padStart(2, '0')}-${String(lastDayOfLastQ).padStart(2, '0')}`;

  let fromDate = `${thisMonthStr}-01`;
  let toDate = todayStr;
  let label = 'This Month';

  if (normalizedRange === 'today') {
    fromDate = todayStr;
    toDate = todayStr;
    label = 'Today';
  } else if (normalizedRange === 'yesterday') {
    fromDate = yesterdayStr;
    toDate = yesterdayStr;
    label = 'Yesterday';
  } else if (normalizedRange === 'this_week') {
    fromDate = thisWeekMondayStr;
    toDate = thisWeekSundayStr;
    label = 'This Week';
  } else if (normalizedRange === 'last_week') {
    fromDate = lastWeekMondayStr;
    toDate = lastWeekSundayStr;
    label = 'Last Week';
  } else if (normalizedRange === 'this_month') {
    fromDate = `${thisMonthStr}-01`;
    toDate = todayStr;
    label = 'This Month';
  } else if (normalizedRange === 'last_month') {
    fromDate = `${lastMonthStr}-01`;
    toDate = lastMonthEndStr;
    label = 'Last Month';
  } else if (normalizedRange === 'this_quarter') {
    fromDate = thisQuarterStartStr;
    toDate = todayStr;
    label = 'This Quarter';
  } else if (normalizedRange === 'last_quarter') {
    fromDate = lastQStartStr;
    toDate = lastQEndStr;
    label = 'Last Quarter';
  } else if (normalizedRange === 'this_year') {
    fromDate = `${tY}-01-01`;
    toDate = todayStr;
    label = 'This Year';
  } else if (normalizedRange === 'last_year') {
    fromDate = `${tY - 1}-01-01`;
    toDate = `${tY - 1}-12-31`;
    label = 'Last Year';
  } else if (normalizedRange === 'all_time' || normalizedRange === 'all') {
    fromDate = '1970-01-01';
    toDate = todayStr;
    label = 'All Time';
  } else if (normalizedRange === 'custom' || startDate || endDate) {
    fromDate = startDate ? getAccraDateString(startDate) : `${thisMonthStr}-01`;
    toDate = endDate ? getAccraDateString(endDate) : todayStr;
    label = `${fromDate} to ${toDate}`;
  }

  return { fromDate, toDate, label, normalizedRange };
}

export function resolveAccraDateRangeWithComparison(
  range?: string,
  startDate?: string,
  endDate?: string
): AccraDateRangeWithComparison {
  const current = resolveAccraDateRange(range, startDate, endDate);
  const normalizedRange = current.normalizedRange;

  const todayStr = getAccraToday();
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const todayDateUtc = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
  const dayOfWeek = todayDateUtc.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // Day before yesterday
  const dayBeforeYesterdayDate = new Date(Date.UTC(tY, tM - 1, tD - 2, 12, 0, 0));
  const dayBeforeYesterdayStr = getAccraDateString(dayBeforeYesterdayDate);

  // Yesterday
  const yesterdayDate = new Date(Date.UTC(tY, tM - 1, tD - 1, 12, 0, 0));
  const yesterdayStr = getAccraDateString(yesterdayDate);

  // Last week & Two weeks ago
  const lastWeekMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 7, 12, 0, 0));
  const lastWeekMondayStr = getAccraDateString(lastWeekMonday);
  const lastWeekSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 1, 12, 0, 0));
  const lastWeekSundayStr = getAccraDateString(lastWeekSunday);

  const twoWeeksAgoMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 14, 12, 0, 0));
  const twoWeeksAgoMondayStr = getAccraDateString(twoWeeksAgoMonday);
  const twoWeeksAgoSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 8, 12, 0, 0));
  const twoWeeksAgoSundayStr = getAccraDateString(twoWeeksAgoSunday);

  // Last month ('YYYY-MM')
  const lastMonthDate = new Date(Date.UTC(tY, tM - 2, 1, 12, 0, 0));
  const lastMonthYear = lastMonthDate.getUTCFullYear();
  const lastMonthNum = lastMonthDate.getUTCMonth() + 1;
  const lastMonthStr = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;
  const lastDayOfLastMonth = new Date(Date.UTC(tY, tM - 1, 0, 12, 0, 0)).getUTCDate();
  const lastMonthEndStr = `${lastMonthStr}-${String(lastDayOfLastMonth).padStart(2, '0')}`;

  // 2 Months ago
  const twoMonthsAgoDate = new Date(Date.UTC(tY, tM - 3, 1, 12, 0, 0));
  const twoMonthsAgoYear = twoMonthsAgoDate.getUTCFullYear();
  const twoMonthsAgoNum = twoMonthsAgoDate.getUTCMonth() + 1;
  const twoMonthsAgoStr = `${twoMonthsAgoYear}-${String(twoMonthsAgoNum).padStart(2, '0')}`;
  const lastDayOfTwoMonthsAgo = new Date(Date.UTC(tY, tM - 2, 0, 12, 0, 0)).getUTCDate();
  const twoMonthsAgoEndStr = `${twoMonthsAgoStr}-${String(lastDayOfTwoMonthsAgo).padStart(2, '0')}`;

  // Quarters
  const currentQuarter = Math.floor((tM - 1) / 3) + 1;
  const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? tY - 1 : tY;
  const lastQStartMonth = (lastQuarter - 1) * 3 + 1;
  const lastQEndMonth = lastQStartMonth + 2;
  const lastQStartStr = `${lastQuarterYear}-${String(lastQStartMonth).padStart(2, '0')}-01`;
  const lastDayOfLastQ = new Date(Date.UTC(lastQuarterYear, lastQEndMonth, 0, 12, 0, 0)).getUTCDate();
  const lastQEndStr = `${lastQuarterYear}-${String(lastQEndMonth).padStart(2, '0')}-${String(lastDayOfLastQ).padStart(2, '0')}`;

  const twoQuartersAgo = lastQuarter === 1 ? 4 : lastQuarter - 1;
  const twoQuartersAgoYear = lastQuarter === 1 ? lastQuarterYear - 1 : lastQuarterYear;
  const twoQStartMonth = (twoQuartersAgo - 1) * 3 + 1;
  const twoQEndMonth = twoQStartMonth + 2;
  const twoQStartStr = `${twoQuartersAgoYear}-${String(twoQStartMonth).padStart(2, '0')}-01`;
  const lastDayOfTwoQ = new Date(Date.UTC(twoQuartersAgoYear, twoQEndMonth, 0, 12, 0, 0)).getUTCDate();
  const twoQEndStr = `${twoQuartersAgoYear}-${String(twoQEndMonth).padStart(2, '0')}-${String(lastDayOfTwoQ).padStart(2, '0')}`;

  if (normalizedRange === 'today') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: yesterdayStr,
        toDate: yesterdayStr,
        label: 'Yesterday',
      },
    };
  }

  if (normalizedRange === 'yesterday') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: dayBeforeYesterdayStr,
        toDate: dayBeforeYesterdayStr,
        label: 'Day Before Yesterday',
      },
    };
  }

  if (normalizedRange === 'this_week') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: lastWeekMondayStr,
        toDate: lastWeekSundayStr,
        label: 'Last Week',
      },
    };
  }

  if (normalizedRange === 'last_week') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: twoWeeksAgoMondayStr,
        toDate: twoWeeksAgoSundayStr,
        label: '2 Weeks Ago',
      },
    };
  }

  if (normalizedRange === 'this_month') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: `${lastMonthStr}-01`,
        toDate: lastMonthEndStr,
        label: 'Last Month',
      },
    };
  }

  if (normalizedRange === 'last_month') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: `${twoMonthsAgoStr}-01`,
        toDate: twoMonthsAgoEndStr,
        label: '2 Months Ago',
      },
    };
  }

  if (normalizedRange === 'this_quarter') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: lastQStartStr,
        toDate: lastQEndStr,
        label: 'Last Quarter',
      },
    };
  }

  if (normalizedRange === 'last_quarter') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: twoQStartStr,
        toDate: twoQEndStr,
        label: '2 Quarters Ago',
      },
    };
  }

  if (normalizedRange === 'this_year') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: `${tY - 1}-01-01`,
        toDate: `${tY - 1}-12-31`,
        label: 'Last Year',
      },
    };
  }

  if (normalizedRange === 'last_year') {
    return {
      ...current,
      hasComparison: true,
      previousRange: {
        fromDate: `${tY - 2}-01-01`,
        toDate: `${tY - 2}-12-31`,
        label: `${tY - 2}`,
      },
    };
  }

  if (normalizedRange === 'all_time' || normalizedRange === 'all') {
    return {
      ...current,
      hasComparison: false,
      previousRange: null,
      reasonIfUnavailable: 'Comparison is unavailable for all-time view',
    };
  }

  // Custom date range
  if (current.fromDate && current.toDate) {
    const fParts = current.fromDate.split('-').map(Number);
    const tParts = current.toDate.split('-').map(Number);
    const fromUtc = new Date(Date.UTC(fParts[0], fParts[1] - 1, fParts[2], 12, 0, 0));
    const toUtc = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2], 12, 0, 0));
    const diffMs = toUtc.getTime() - fromUtc.getTime();
    if (diffMs >= 0) {
      const daySpan = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const prevToDateUtc = new Date(fromUtc.getTime() - (1000 * 60 * 60 * 24));
      const prevFromDateUtc = new Date(prevToDateUtc.getTime() - ((daySpan - 1) * 1000 * 60 * 60 * 24));
      const pFromStr = getAccraDateString(prevFromDateUtc);
      const pToStr = getAccraDateString(prevToDateUtc);
      return {
        ...current,
        hasComparison: true,
        previousRange: {
          fromDate: pFromStr,
          toDate: pToStr,
          label: `${pFromStr} to ${pToStr}`,
        },
      };
    }
  }

  return {
    ...current,
    hasComparison: false,
    previousRange: null,
    reasonIfUnavailable: 'Insufficient historical data for comparison',
  };
}

