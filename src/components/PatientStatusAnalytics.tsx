import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';

interface PatientStatusAnalyticsProps {
    data: (TemporalRow | PatientStatusProcessedRow)[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
}

const CATEGORIES = ['High', 'Normal', 'Moderately_low'];

export function PatientStatusAnalytics({ data, zoomLevel = 'years', onDrillDown }: PatientStatusAnalyticsProps) {
    // Cast to processed type for rendering because we know it's coming from the mocked API
    // In a real dual-support scenario, we'd add a type guard.
    // Define specific colors for each category
    const categoryColors: Record<string, string> = {
        'High': '#ef4444', // red-500
        'Normal': '#22c55e', // green-500
        'Moderately_low': '#f59e0b', // amber-500
    };

    // Aggregation Logic
    const aggregatedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        const buckets = new Map<string, {
            Normal: number;
            Moderately_low: number;
            High: number;
            count: number;
            dateStr: string;
        }>();

        data.forEach(row => {
            const rowData = row as PatientStatusProcessedRow;
            const date = new Date(rowData.date);
            if (isNaN(date.getTime())) return;

            // Determine bucket key based on zoom level
            let key = '';
            let dateStr = '';

            if (zoomLevel === 'years') {
                key = date.getFullYear().toString();
                dateStr = key;
            } else if (zoomLevel === 'months') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                dateStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            } else {
                key = rowData.date;
                dateStr = date.getDate().toString();
            }

            if (!buckets.has(key)) {
                buckets.set(key, { Normal: 0, Moderately_low: 0, High: 0, count: 0, dateStr });
            }

            const entry = buckets.get(key)!;
            entry.Normal += rowData.Normal;
            entry.Moderately_low += rowData.Moderately_low;
            entry.High += rowData.High;
            entry.count += 1;
        });

        // Convert to array and calculate percentages
        return Array.from(buckets.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => {
                const total = value.Normal + value.Moderately_low + value.High;
                return {
                    date: key, // Use key as date identifier
                    displayDate: value.dateStr,
                    Normal: value.Normal,
                    Moderately_low: value.Moderately_low,
                    High: value.High,
                    NormalPct: total > 0 ? (value.Normal / total) * 100 : 0,
                    Moderately_lowPct: total > 0 ? (value.Moderately_low / total) * 100 : 0,
                    HighPct: total > 0 ? (value.High / total) * 100 : 0
                };
            });
    }, [data, zoomLevel]);

    const handleBarClick = (data: any) => {
        if (onDrillDown && data && data.date) {
            // data.date is the key (Year '2022', Month '2022-01', Day '2022-01-01')
            let dateStr = data.date;

            // If it's a year, append Jan 1st
            if (zoomLevel === 'years') {
                dateStr += '-01-01';
            }
            // If it's a month, append 1st
            else if (zoomLevel === 'months') {
                dateStr += '-01';
            }

            const validDate = new Date(dateStr);
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
            const count = dataPoint[category]; // This is total count for the period
            const pct = payload[0].value;
            const color = payload[0].fill;

            return (
                <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                    <p className="font-semibold mb-1">{`Time: ${dataPoint.displayDate}`}</p>
                    <p style={{ color }}>
                        {`${category.replace('_', ' ')}: ${count} patients (${Number(pct).toFixed(1)}%)`}
                    </p>
                </div>
            );
        }
        return null; // Return null if not active or missing payload
    };

    return (
        <div className="w-full h-full flex flex-col space-y-4 p-4">
            {CATEGORIES.map((category, index) => {
                const isLast = index === CATEGORIES.length - 1;

                return (
                    <div key={category} className="flex-1 min-h-0 relative">
                        <h3 className="text-sm font-medium mb-1 text-center" style={{ color: categoryColors[category] }}>
                            {category.replace('_', ' ')}
                        </h3>
                        <div className="w-full h-[calc(100%-1.5rem)]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={aggregatedData}
                                    syncId="patientStatus"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onClick={(e: any) => {
                                        if (e && e.activePayload && e.activePayload[0]) {
                                            handleBarClick(e.activePayload[0].payload);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="displayDate"
                                        hide={!isLast}
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                        height={30}
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
