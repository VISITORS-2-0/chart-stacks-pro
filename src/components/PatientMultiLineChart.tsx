import React, { useMemo } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TemporalRow } from '../types/temporal';

interface PatientMultiLineChartProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
}

export function PatientMultiLineChart({ data, zoomLevel = 'years', onDrillDown }: PatientMultiLineChartProps) {
    // Shared X-Axis logic: Use numeric timestamps to allow precise plotting

    // 1. Prepare Scatter Data (All Points)
    const scatterData = useMemo(() => {
        return data.map(row => {
            const val = parseFloat(row.Value as any);
            const date = new Date(row.StartTime);
            if (isNaN(val) || isNaN(date.getTime())) return null;
            return {
                x: date.getTime(),
                y: val,
                date: date,
                patientId: row.PatientID
            };
        }).filter(Boolean) as any[];
    }, [data]);

    // 2. Prepare Monthly Max/Min Data
    const { maxLineData, minLineData } = useMemo(() => {
        const buckets = new Map<string, {
            maxPoint: { x: number, y: number, date: Date } | null;
            minPoint: { x: number, y: number, date: Date } | null;
        }>();

        scatterData.forEach(point => {
            // Bucket Key depends on zoomLevel
            // If Years -> Bucket by Month (as requested "Buckets for min/max to be monthly")
            // If Months -> Bucket by Day? Or keep Month?
            // "I want the buckets for the min and max to be monthly for now" implies constant monthly buckets.
            // But if we zoom to Days, monthly buckets are huge. 
            // Let's stick to Monthly buckets for Years view. 
            // For Months view, maybe Daily buckets? 
            // The request said "pressing a bucket would increase my resolutions".

            let key;
            if (zoomLevel === 'years') {
                // Monthly buckets
                key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
            } else if (zoomLevel === 'months') {
                // Daily buckets
                key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}-${String(point.date.getDate()).padStart(2, '0')}`;
            } else {
                // Hourly? Just keep daily for now or individual points
                key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}-${String(point.date.getDate()).padStart(2, '0')}-${point.date.getHours()}`;
            }

            if (!buckets.has(key)) {
                buckets.set(key, { maxPoint: point, minPoint: point });
            } else {
                const entry = buckets.get(key)!;
                if (point.y > entry.maxPoint!.y) {
                    entry.maxPoint = point;
                }
                if (point.y < entry.minPoint!.y) {
                    entry.minPoint = point;
                }
            }
        });

        // Convert to sorted arrays
        const sortedKeys = Array.from(buckets.keys()).sort();
        const maxData = sortedKeys.map(k => buckets.get(k)!.maxPoint).filter(Boolean);
        const minData = sortedKeys.map(k => buckets.get(k)!.minPoint).filter(Boolean);

        return { maxLineData: maxData, minLineData: minData };
    }, [scatterData, zoomLevel]);

    const handlePointClick = (data: any) => {
        if (onDrillDown && data && data.date) {
            onDrillDown(data.date.toISOString());
        }
    };

    const xAxisTickFormatter = (unixTime: number) => {
        const date = new Date(unixTime);
        if (zoomLevel === 'years') {
            return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        } else if (zoomLevel === 'months') {
            return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        }
    };

    return (
        <div className="w-full h-full p-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onClick={(e: any) => {
                        // Attempt to capture clicks on the chart area if specific element click fails
                        if (e && e.activePayload && e.activePayload[0]) {
                            handlePointClick(e.activePayload[0].payload);
                        }
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="x"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={xAxisTickFormatter}
                        scale="time"
                        allowDuplicatedCategory={false}
                    />
                    <YAxis dataKey="y" />
                    <Tooltip
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value, name) => [value, name === 'y' ? 'Value' : name]}
                    />
                    <Legend />

                    {/* Max Line - Red */}
                    <Line
                        data={maxLineData}
                        dataKey="y"
                        stroke="#ff0000"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 6 }}
                        name="Max"
                        connectNulls
                        isAnimationActive={false}
                    />

                    {/* Min Line - Blue */}
                    <Line
                        data={minLineData}
                        dataKey="y"
                        stroke="#0000ff"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 6 }}
                        name="Min"
                        connectNulls
                        isAnimationActive={false}
                    />

                    {/* All Points - Gray */}
                    <Scatter
                        data={scatterData}
                        name="Patient Values"
                        fill="#888888"
                        shape="circle"
                        line={false}
                        onClick={handlePointClick}
                        cursor="pointer"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
