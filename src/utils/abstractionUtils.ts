import { AbstractionInterval, ValueLevel } from "@/components/SinglePatientAbstractionPanel";

// Master list for semantic sorting of common medical/abstraction terms
// Master list for semantic sorting removed as per requirement to rely on API metadata.

import { ConceptData } from "@/services/abstractionService";

export function generateDynamicValueLevels(
    intervals: AbstractionInterval[], 
    conceptData?: ConceptData
): { levels: ValueLevel[], processedIntervals: AbstractionInterval[] } {
    
    let levels: ValueLevel[] = [];

    // Strategy 1: Use Explicit API Metadata
    if (conceptData?.allowed_values?.values) {
        const values = conceptData.allowed_values.values;
        // Handle ordering direction if needed (api defaults to asc usually fits our index 0..N)
        // If desc, we might want to reverse? Usually index 0 is bottom y-axis.
        // Assuming values are sorted [Bottom, ..., Top] if 'asc'.
        
        let sortedValues = [...values];
        // If ordering is explicitly 'desc' meaning [Top, ..., Bottom], we reverse to get [Bottom, ..., Top] for index mapping
        if (conceptData.allowed_values.ordering === 'desc') {
             sortedValues.reverse();
        }

        levels = sortedValues.map((val, index) => ({
            label: val,
            order: index,
            color: getDynamicColor(index, sortedValues.length)
        }));
    } 
    // Strategy 2: Dynamic discovery (Fallback)
    else {
         // 1. Extract unique values
        const uniqueValues = Array.from(new Set(intervals.map(i => i.valueLabel)));

        // 2. Sort values alphabetically
        uniqueValues.sort((a, b) => a.localeCompare(b));

        // 3. Create ValueLevels
        levels = uniqueValues.map((val, index) => ({
            label: val,
            order: index,
            color: getDynamicColor(index, uniqueValues.length)
        }));
    }

    // 4. Update intervals with new indices
    const processedIntervals = intervals.map(interval => {
        const levelIndex = levels.findIndex(l => l.label === interval.valueLabel);
        return {
            ...interval,
            valueOrderIndex: levelIndex >= 0 ? levelIndex : 0
        };
    });

    return { levels, processedIntervals };
}

// Generates a color from Cool (Blue) to Warm (Red) based on relative position
function getDynamicColor(index: number, total: number): string {
    if (total <= 1) return "#22c55e"; // Single value -> Green (Normal-ish)

    // Palette: Deep Blue -> Light Blue -> Green -> Yellow -> Orange -> Red
    const palette = [
        "#3b82f6", // very low (blue)
        "#60a5fa", // low (light blue)
        "#22c55e", // normal (green)
        "#eab308", // medium (yellow)
        "#f59e0b", // high (orange)
        "#ef4444"  // very high (red)
    ];

    // Calculate position in palette (0 to palette.length - 1)
    // We map [0, total-1] domain to [0, palette.length-1] range
    const ratio = index / (total - 1);
    const paletteIndex = Math.round(ratio * (palette.length - 1));
    
    return palette[paletteIndex];
}
