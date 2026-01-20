import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnePatientRaw, useMultiPatientAbstract, useMultiPatientRaw } from "../hooks/useTemporalData";
import { PatientStatusAnalytics } from "./PatientStatusAnalytics";
import { PatientStateGantt } from "./PatientStateGantt";
import { PatientMultiLineChart } from "./PatientMultiLineChart";
import { SinglePatientAbstractionPanel, AbstractionInterval, ValueLevel } from "./SinglePatientAbstractionPanel";
import { useState, useMemo } from "react";

export type ZoomLevel = 'years' | 'months' | 'days';

interface TemporalChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    isMultiPatient?: boolean;
    isRaw?: boolean;
    chartType?: string;
    externalData?: any[];
    conceptData?: any;
    onDrillDown?: (date: Date, currentLevel: ZoomLevel) => void;
    onZoomOut?: (currentLevel: ZoomLevel) => void;
}

export function TemporalChartCard({
    id,
    title,
    onRemove,
    isMultiPatient = false,
    isRaw = false,
    chartType,
    externalData,
    conceptData,
    onDrillDown,
    onZoomOut,
}: TemporalChartCardProps) {
    const singlePatient = useOnePatientRaw();
    const multiPatientAbstract = useMultiPatientAbstract();
    const multiPatientRaw = useMultiPatientRaw();

    // Zoom State
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('years');
    const [focusDate, setFocusDate] = useState<Date | null>(null);

    // Determine which data hook to use (only if no externalData)
    let dataHook;
    if (isMultiPatient) {
        if (isRaw) {
            dataHook = multiPatientRaw;
        } else {
            // Force abstract for non-raw multi-patient (as per previous logic for demo)
            dataHook = multiPatientAbstract;
        }
    } else {
        dataHook = singlePatient;
    }

    const { data: hookData, loading: hookLoading, error: hookError } = dataHook;

    // prioritized external data if available
    const data = externalData || hookData;
    const loading = externalData ? false : hookLoading;
    const error = externalData ? null : hookError;

    // Filter Data based on Zoom Level
    const filteredData = useMemo(() => {
        if (!data) return [];

        // If external drill-down is provided, assume parent manages filtering/data
        if (onDrillDown) return data;

        // If 'years', show everything (charts handle aggregation)
        // If 'months', filter by focusDate year
        // If 'days', filter by focusDate month

        if (zoomLevel === 'years') return data;
        if (!focusDate) return data;

        return data.filter((row: any) => {
            // Check row.StartTime (raw) or row.month (abstract)
            // Abstract data only has month 'YYYY-MM'. 
            // Raw data has StartTime ISO.

            const rowDate = row.StartTime ? new Date(row.StartTime) : (row.month ? new Date(row.month + '-01') : null);
            if (!rowDate) return false;

            if (zoomLevel === 'months') {
                return rowDate.getFullYear() === focusDate.getFullYear();
            }
            if (zoomLevel === 'days') {
                return rowDate.getFullYear() === focusDate.getFullYear() &&
                    rowDate.getMonth() === focusDate.getMonth();
            }
            return true;
        });
    }, [data, zoomLevel, focusDate, onDrillDown]);

    // Data Transformation for SinglePatientAbstractionPanel
    const { abstractionIntervals, valueLevels } = useMemo(() => {
        if (!conceptData || !filteredData || chartType !== 'bar') {
            return { abstractionIntervals: [], valueLevels: [] };
        }

        // 1. Value Levels
        const values = conceptData.allowed_values?.values || [];
        const levels: ValueLevel[] = values.map((val: string, index: number) => ({
            label: val,
            order: index,
            color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
        }));

        // 2. Intervals
        const intervals: AbstractionInterval[] = filteredData.map((row: any) => {
            const val = String(row.Value);
            const level = levels.find(l => l.label === val);
            return {
                start: row.StartTime,
                end: row.EndTime,
                valueLabel: val,
                valueOrderIndex: level ? level.order : 0,
                contextId: String(row.PatientID), // showing patient ID as context
            };
        });

        return { abstractionIntervals: intervals, valueLevels: levels };

    }, [filteredData, conceptData, chartType]);

    const handleDrillDown = (dateStr: string) => {
        const clickedDate = new Date(dateStr);
        if (isNaN(clickedDate.getTime())) return;

        if (onDrillDown) {
            onDrillDown(clickedDate, zoomLevel);
            // Manually advance local zoom state to match what we expect?
            // Or rely on parent to update data.
            // If we rely on parent, we still might want to update local 'zoomLevel' for display purposes 
            // (e.g., tick formatting relies on it in PatientStatusAnalytics?).
            // Actually, `PatientStatusAnalytics` takes `zoomLevel` prop.
            // We should update local state IF the parent doesn't control `zoomLevel` prop.
            // But `zoomLevel` is local state here.

            if (zoomLevel === 'years') setZoomLevel('months');
            else if (zoomLevel === 'months') setZoomLevel('days');

            return;
        }

        setFocusDate(clickedDate);
        if (zoomLevel === 'years') setZoomLevel('months');
        else if (zoomLevel === 'months') setZoomLevel('days');
    };

    const handleZoomOut = () => {
        if (onZoomOut) {
            onZoomOut(zoomLevel);
            // Manually revert local zoom state?
            // If parent manages data, we should probably follow suit or trust data update.
            // But we might need to sync local zoom for display reasons if not controlled.
            // Assuming strict hierarchy YE -> ME -> D.
            if (zoomLevel === 'days') setZoomLevel('months');
            else if (zoomLevel === 'months') {
                setZoomLevel('years');
                setFocusDate(null);
            }
            return;
        }

        if (zoomLevel === 'days') setZoomLevel('months');
        else if (zoomLevel === 'months') {
            setZoomLevel('years');
            setFocusDate(null);
        }
    };

    return (
        <Card className="border border-border shadow-sm animate-in fade-in-50 duration-300 w-full h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {loading ? "Loading..." : `${filteredData.length} data points`} ({zoomLevel})
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {zoomLevel !== 'years' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={handleZoomOut}
                        >
                            <ZoomOut className="h-3 w-3" />
                            Drop Frame
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onRemove(id)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {loading && <div className="h-full flex items-center justify-center text-blue-600">Loading temporal data...</div>}
                {error && <div className="h-full flex items-center justify-center text-red-600">Error: {error.message}</div>}

                {!loading && !error && filteredData.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available in this view</div>
                )}

                {!loading && !error && filteredData.length > 0 && (
                    isRaw ? (
                        <PatientMultiLineChart
                            data={filteredData as any}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            onZoomOut={handleZoomOut}
                        />
                    ) : chartType === 'bar' ? (
                        <PatientStateGantt
                            data={data as any}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            focusDate={focusDate}
                        />
                    ) : (
                        <PatientStatusAnalytics
                            data={filteredData as any}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                        />
                    )
                )}
            </CardContent>
        </Card>
    );
}
