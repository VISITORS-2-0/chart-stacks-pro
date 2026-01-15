import { subMinutes, subHours, subDays, startOfDay } from "date-fns";
import { TimeRange } from "@/components/FilterBar";

export const calculateDateRange = (timeRange: TimeRange): { start_date: string; end_date: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeRange.type === "absolute" && timeRange.startDate && timeRange.endDate) {
        startDate = timeRange.startDate;
        endDate = timeRange.endDate;
        // Ensure end of day for end date? Requirement implies exact times usually, but for absolute range usually users expect full days.
        // The requirement example: "last 90 days, the start day should be 90 days ago and the ernd date will be today."
    } else if (timeRange.type === "relative" && timeRange.relative) {
        endDate = now;
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
                startDate = subDays(now, 7);
                break;
            case "30d":
                startDate = subDays(now, 30);
                break;
            case "90d":
                startDate = subDays(now, 90);
                break;
            default:
                startDate = subDays(now, 30); // Default fallback
        }
    } else {
        // Fallback
        endDate = now;
        startDate = subDays(now, 30);
    }

    // Format to ISO string as requested: "1991-01-01T00:00:00"
    // Note: toISOString returns UTC usually. We might need local time if server expects "local" ISO. 
    // However, standard ISO is safest. Let's stick to standard ISO but maybe strip ms if needed.
    // Requirement example: "1991-01-01T00:00:00". Ideally this is ISO-8601.

    return {
        start_date: startDate.toISOString().split('.')[0], // simple hack to remove ms and Z if we want naive, but toISOString is UTC. 
        // If we simply use iso, it works for most backends. 
        // Let's use full ISO but slice to seconds to match the example format roughly.
        end_date: endDate.toISOString().split('.')[0]
    };
};
