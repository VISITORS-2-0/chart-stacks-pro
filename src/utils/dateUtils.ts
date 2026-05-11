import { subMinutes, subHours, subDays, subYears, startOfDay, endOfDay, format } from "date-fns";
import { TimeRange } from "@/components/FilterBar";

export const calculateDateRange = (timeRange: TimeRange): { start_date: string; end_date: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeRange.type === "absolute" && timeRange.startDate && timeRange.endDate) {
        startDate = timeRange.startDate;
        endDate = timeRange.endDate;
    } else if (timeRange.type === "relative" && timeRange.relative) {
        endDate = endOfDay(now);
        switch (timeRange.relative) {
            case "15m":
                startDate = subMinutes(now, 15);
                break;
            case "1h":
                startDate = subHours(now, 1);
                break;
            case "4h":
                startDate = subHours(now, 4);
                break;
            case "24h":
                startDate = subHours(now, 24);
                break;
            case "7d":
                startDate = endOfDay(subDays(now, 7));
                break;
            case "30d":
                startDate = endOfDay(subDays(now, 30));
                break;
            case "90d":
                startDate = endOfDay(subDays(now, 90));
                break;
            case "1y":
                startDate = endOfDay(subYears(now, 1));
                break;
            case "5y":
                startDate = endOfDay(subYears(now, 5));
                break;
            case "10y":
                startDate = endOfDay(subYears(now, 10));
                break;
            default:
                startDate = endOfDay(subYears(now, 5)); // Default fallback
        }
    } else {
        // Fallback
        endDate = endOfDay(now);
        startDate = endOfDay(subYears(now, 5));
    }

    return {
        start_date: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
        end_date: format(endDate, "yyyy-MM-dd'T'HH:mm:ss")
    };
};

/**
 * The backend "anchors" all relative-time data to 1970-01-01T00:00:00Z.
 * This is time-zero — the moment the reference event occurred for each patient.
 *
 * Given a Unix timestamp returned by the backend, this function computes the
 * signed offset from the anchor and returns a compact label:
 *   - Days:   "0d", "1d", "-2d"
 *   - Months: "1m", "-1m"
 *   - Years:  "1y"
 *
 * @param unixMs     Unix timestamp in milliseconds (from Date.getTime())
 * @param granularity 'D' | 'ME' | 'YE' — controls which unit to display
 */
export const ANCHOR_MS = 0; // 1970-01-01T00:00:00Z in milliseconds

export const formatRelativeTime = (unixMs: number, granularity: 'D' | 'ME' | 'YE'): string => {
    const diffMs = unixMs - ANCHOR_MS;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375); // average month
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (granularity === 'YE') {
        const y = diffYears >= 0 ? Math.floor(diffYears) : -Math.floor(-diffYears);
        return `${y}y`;
    }
    if (granularity === 'ME') {
        const m = diffMonths >= 0 ? Math.floor(diffMonths) : -Math.floor(-diffMonths);
        return `${m}m`;
    }
    // Default: days — round because day ticks are placed at midnight boundaries
    const d = Math.round(diffDays);
    return `${d}d`;
};

/**
 * For PatientStatusAnalytics the XAxis uses the "month" string key (e.g. "1970-01-01",
 * "1970-02", "1970"). Parse it back to a timestamp and then format as relative time.
 */
export const formatRelativeTimeFromMonthKey = (monthKey: string, granularity: 'D' | 'ME' | 'YE'): string => {
    const parts = monthKey.split('-');
    let d: Date;
    if (parts.length === 3) {
        d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else if (parts.length === 2) {
        d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
    } else {
        d = new Date(Date.UTC(parseInt(parts[0]), 0, 1));
    }
    return formatRelativeTime(d.getTime(), granularity);
};

/**
 * Detailed tooltip label for relative mode.
 * Converts a Unix timestamp to a human-readable offset from the anchor event.
 * Examples:  "At event",  "5 days after event",  "2 months before event"
 */
export const formatRelativeTooltipTime = (unixMs: number): string => {
    const diffMs = unixMs - ANCHOR_MS;
    const absDiffMs = Math.abs(diffMs);
    const suffix = diffMs >= 0 ? 'after event' : 'before event';

    const HOUR = 1000 * 60 * 60;
    const DAY  = HOUR * 24;
    const MONTH = DAY * 30.4375;
    const YEAR = DAY * 365.25;

    if (absDiffMs < HOUR) return 'At event';

    if (absDiffMs < DAY * 2) {
        const h = Math.round(absDiffMs / HOUR);
        return `${h} hour${h !== 1 ? 's' : ''} ${suffix}`;
    }
    if (absDiffMs < MONTH * 2) {
        const d = Math.round(absDiffMs / DAY);
        return `${d} day${d !== 1 ? 's' : ''} ${suffix}`;
    }
    if (absDiffMs < YEAR * 2) {
        const m = Math.round(absDiffMs / MONTH);
        return `${m} month${m !== 1 ? 's' : ''} ${suffix}`;
    }
    const y = Math.round(absDiffMs / YEAR * 10) / 10;
    return `${y} year${y !== 1 ? 's' : ''} ${suffix}`;
};

/**
 * Compact relative-time label for start/end fields in Gantt tooltips.
 * Auto-picks the best unit.  E.g. "0d", "+5d", "-2m"
 */
export const formatRelativeCompact = (unixMs: number): string => {
    const diffMs = unixMs - ANCHOR_MS;
    const DAY  = 1000 * 60 * 60 * 24;
    const MONTH = DAY * 30.4375;
    const YEAR = DAY * 365.25;
    const absDiffMs = Math.abs(diffMs);

    if (absDiffMs < DAY) return '0d';
    if (absDiffMs < MONTH * 2) {
        const d = Math.round(diffMs / DAY);
        return `${d}d`;
    }
    if (absDiffMs < YEAR * 2) {
        const m = Math.round(diffMs / MONTH);
        return `${m}m`;
    }
    const y = Math.round(diffMs / YEAR * 10) / 10;
    return `${y}y`;
};
