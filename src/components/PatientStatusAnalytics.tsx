import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';

interface PatientStatusAnalyticsProps {
    data: (TemporalRow | PatientStatusProcessedRow)[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
    conceptData?: any;
}

export function PatientStatusAnalytics({ data, zoomLevel = 'years', onDrillDown, conceptData }: PatientStatusAnalyticsProps) {
    const componentId = React.useId();
    const syncId = `patientStatus-${componentId}`;

    // Determine Categories from conceptData or fallback
    const categories = React.useMemo(() => {
        if (conceptData && conceptData.allowed_values && conceptData.allowed_values.values) {
            return conceptData.allowed_values.values;
        }
        return ['High', 'Normal', 'Moderately_low']; // Fallback
    }, [conceptData]);

    const categoryColors: Record<string, string> = React.useMemo(() => {
        const colors: Record<string, string> = {
            'High': '#ef4444', // red-500
            'Normal': '#22c55e', // green-500
            'Moderately_low': '#f59e0b', // amber-500
            'Low': '#3b82f6', // blue-500
            'Medium': '#f59e0b', // amber-500
        };
        // Auto-assign colors if not present?
        // For now rely on defaults and extended palette
        const palette = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        categories.forEach((cat: string, index: number) => {
            if (!colors[cat as any]) { // Cast to avoid index error in TS if cat is string
                colors[cat] = palette[index % palette.length];
            }
        });
        return colors;
    }, [categories]);

    // Aggregate Data if it is Raw TemporalRow[]
    const chartData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        // Detect if already processed
        if ('NormalPct' in data[0] || 'month' in data[0]) {
            return data as PatientStatusProcessedRow[];
        }

        // Processing Raw Data (TemporalRow[])
        const rawData = data as TemporalRow[];
        const buckets = new Map<string, Record<string, number>>();

        rawData.forEach(row => {
            const date = new Date(row.StartTime);
            if (isNaN(date.getTime())) return;

            let key;
            if (zoomLevel === 'years') {
                key = `${date.getFullYear()}`;
            } else if (zoomLevel === 'months') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else {
                // Days
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }

            if (!buckets.has(key)) {
                buckets.set(key, { total: 0 });
                categories.forEach((c: string) => buckets.get(key)![c] = 0);
            }

            const entry = buckets.get(key)!;
            const val = String(row.Value); // Ensure string matching
            if (categories.includes(val)) {
                entry[val] = (entry[val] || 0) + 1;
                entry.total += 1;
            }
        });

        // Convert buckets to rows with Percentages
        const processed: any[] = [];
        // Sort keys to ensure chronological order
        const sortedKeys = Array.from(buckets.keys()).sort();

        sortedKeys.forEach(key => {
            const entry = buckets.get(key)!;
            const row: any = { month: key }; // Using 'month' as XAxis key for compatibility

            categories.forEach((cat: string) => {
                row[cat] = entry[cat];
                row[`${cat}Pct`] = entry.total > 0 ? (entry[cat] / entry.total) * 100 : 0;
            });
            processed.push(row);
        });

        return processed;

    }, [data, categories, zoomLevel]);

    const handleBarClick = (data: any) => {
        if (onDrillDown && data && data.month) {
            // "month" field in current abstract data is YYYY-MM. 
            // If we drill down from years, we might need a full date string or just pass what we have.
            // For Abstract data currently:
            // Years view -> data has "month" (or could be "year")
            // Months view -> data has "month" (YYYY-MM)
            // Days view -> data likely needs "day"

            // Assuming the mock data structure adapts or we parse.
            // Current mock data is strictly YYYY-MM.
            // We need to construct a date object to drill down reliably.
            const validDate = new Date(data.month + '-01'); // Force 1st of month
            if (!isNaN(validDate.getTime())) {
                onDrillDown(validDate.toISOString());
            }
        }
    };

    // Custom Tooltip to show Count (and Percentage)
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const dataKey = payload[0].dataKey as string; // e.g., 'NormalPct'
            const category = dataKey.replace('Pct', ''); // 'Normal'
            const count = dataPoint[category];
            const pct = payload[0].value;
            const color = payload[0].fill;

            return (
                <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                    <p className="font-semibold mb-1">{`Time: ${label}`}</p>
                    <p style={{ color }}>
                        {`${category.replace('_', ' ')}: ${count} patients (${Number(pct).toFixed(1)}%)`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col space-y-4 p-4">
            {categories.map((category: string, index: number) => {
                const isLast = index === categories.length - 1;

                return (
                    <div key={category} className="flex-1 min-h-0 relative">
                        <h3 className="text-sm font-medium mb-1 text-center" style={{ color: categoryColors[category] }}>
                            {category.replace('_', ' ')}
                        </h3>
                        <div className="w-full h-[calc(100%-1.5rem)]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    syncId={syncId}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onClick={(e: any) => {
                                        if (e && e.activePayload && e.activePayload[0]) {
                                            handleBarClick(e.activePayload[0].payload);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        hide={!isLast}
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                        height={30}
                                        tickFormatter={(val) => {
                                            if (!val) return val;

                                            const parts = val.split('-');

                                            // Determine exactly what the data string represents to prevent async mismatches
                                            if (parts.length === 3) {
                                                // Data is YYYY-MM-DD -> Render Day
                                                return parseInt(parts[2], 10).toString();
                                            } else if (parts.length === 2) {
                                                // Data is YYYY-MM -> Render Month
                                                const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
                                                if (!isNaN(date.getTime())) {
                                                    return date.toLocaleDateString(undefined, { month: 'short' });
                                                }
                                            }

                                            // Data is YYYY -> Render Year
                                            return parts[0];
                                        }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                        fontSize={12}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey={`${category}Pct`}
                                        fill={categoryColors[category] || "#8884d8"}
                                        radius={[4, 4, 0, 0]}
                                        cursor="pointer"
                                        onClick={handleBarClick}
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
