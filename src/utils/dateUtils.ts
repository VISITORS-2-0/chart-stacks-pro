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
