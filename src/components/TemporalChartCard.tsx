import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnePatientRaw, useMultiPatientAbstract, useMultiPatientRaw } from "../hooks/useTemporalData";
import { PatientStatusAnalytics } from "./PatientStatusAnalytics";
import { PatientStateGantt } from "./PatientStateGantt";
import { PatientContinuousIntervalChart } from "./PatientContinuousIntervalChart";
import { PatientMultiLineChart } from "./PatientMultiLineChart";
import { SinglePatientAbstractionPanel, AbstractionInterval, ValueLevel } from "./SinglePatientAbstractionPanel";
import { RangeCutoffConfig } from "./RangeCutoffConfig";
import { useState, useMemo } from "react";
import { GraphContextModal } from "./GraphContextModal";
import { MappingAbstractionsModal } from "./MappingAbstractionsModal";

export type ZoomLevel = 'years' | 'months' | 'days';

interface TemporalChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    patientIds?: string[];
    isRaw?: boolean;
    chartType?: string;
    externalData?: any[];
    conceptData?: any;
    onDrillDown?: (date: Date, currentLevel: ZoomLevel) => void;
    onZoomOut?: (currentLevel: ZoomLevel) => void;
    onNavigate?: (direction: 'next' | 'prev', currentZoom: ZoomLevel, focusDate: Date | null) => void;
    cutoffs?: number[];
    isCutoffsBalanced?: boolean;
    onApplyCutoffs?: (cutoffs: number[], isBalanced: boolean) => void;
}

export function TemporalChartCard({
    id,
    title,
    onRemove,
    isRaw = false,
    chartType,
    externalData,
    conceptData,
    onDrillDown,
    onZoomOut,
    onNavigate,
    cutoffs,
    isCutoffsBalanced,
    onApplyCutoffs,
    patientIds,
}: TemporalChartCardProps) {
    const isMultiPatient = patientIds ? patientIds.length > 1 : false;

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

        // We no longer bypass filtering here even if onDrillDown is provided,
        // because we still want to benefit from the generic client-side filtering 
        // fallback for single patients or raw data sets.

        // If 'years', show everything (charts handle aggregation)
        // If 'months', filter by focusDate year
        // If 'days', filter by focusDate month

        // For raw data, we never filter the dataset anymore because PatientMultiLineChart
        // now supports horizontal scrolling, so we want all data available.
        if (isRaw) return data;

        if (zoomLevel === 'years') return data;
        if (!focusDate) return data;

        return data.filter((row: any) => {
            if (row.StartTime) {
                const rowDate = new Date(row.StartTime);
                if (isNaN(rowDate.getTime())) return false;

                if (zoomLevel === 'months') {
                    return rowDate.getFullYear() === focusDate.getFullYear();
                }
                if (zoomLevel === 'days') {
                    return rowDate.getFullYear() === focusDate.getFullYear() &&
                        rowDate.getMonth() === focusDate.getMonth();
                }
                return true;
            } else if (row.month) {
                // Abstract data row.month is 'YYYY-MM'
                const parts = row.month.split('-');
                const rowYear = parseInt(parts[0], 10);

                if (zoomLevel === 'months') {
                    return rowYear === focusDate.getFullYear();
                }
                if (zoomLevel === 'days') {
                    const rowMonth = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
                    return rowYear === focusDate.getFullYear() && rowMonth === focusDate.getMonth();
                }
                return true;
            }
            return false;
        });
    }, [data, zoomLevel, focusDate, onDrillDown]);

    // Data Transformation for SinglePatientAbstractionPanel
    const { abstractionIntervals, valueLevels } = useMemo(() => {
        if (!conceptData || !filteredData || chartType !== 'bar') {
            return { abstractionIntervals: [], valueLevels: [] };
        }

        // 1. Value Levels
        const values = conceptData.values || [];
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

        // Set local focus reference
        setFocusDate(clickedDate);

        // Update local zoom level for UI state
        if (zoomLevel === 'years') {
            setZoomLevel('months');
        } else if (zoomLevel === 'months') {
            setZoomLevel('days');
        }

        // Always notify parent just in case it wants to do server-side fetching
        if (onDrillDown) {
            onDrillDown(clickedDate, zoomLevel);
        }
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

    const handleNavigateWrapper = (dir: 'next' | 'prev') => {
        if (!focusDate) return;
        const y = focusDate.getFullYear();
        const m = focusDate.getMonth();
        let newFocus = new Date(focusDate);
        if (zoomLevel === 'months') {
            newFocus.setFullYear(y + (dir === 'next' ? 1 : -1));
        } else if (zoomLevel === 'days') {
            newFocus.setMonth(m + (dir === 'next' ? 1 : -1));
        }
        setFocusDate(newFocus);
        if (onNavigate) {
            onNavigate(dir, zoomLevel, focusDate);
        }
    };

    return (
        <Card className="border border-border shadow-sm animate-in fade-in-50 duration-300 w-full h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        {patientIds && patientIds.length > 0 && (
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger>
                                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded cursor-help inline-flex items-center">
                                            {patientIds.length === 1
                                                ? `Patient ${patientIds[0]}`
                                                : `${patientIds.length} Patients: ${patientIds.slice(0, 3).join(', ')}${patientIds.length > 3 ? '...' : ''}`}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px] flex-wrap break-words" side="bottom" align="start">
                                        <p className="text-xs font-semibold mb-1 w-full flex">Patients Included:</p>
                                        <p className="text-xs w-full flex">{patientIds.join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <GraphContextModal conceptName={title} />
                        <MappingAbstractionsModal
                            conceptName={title}
                            conceptType={conceptData?.concept_type || conceptData?.["@concept-type"]}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {loading ? "Loading..." : `${filteredData.length} data points`} ({zoomLevel})
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {(zoomLevel === 'months' || zoomLevel === 'days') && !!onNavigate && (
                        <div className="flex justify-center items-center gap-1 shrink-0 bg-muted/50 rounded-md p-1 border">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleNavigateWrapper('prev')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-semibold text-muted-foreground px-2 text-center min-w-[90px]">
                                {focusDate ? (zoomLevel === 'months' ? focusDate.getFullYear() : focusDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })) : ''}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleNavigateWrapper('next')}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {onApplyCutoffs && isMultiPatient && conceptData !== undefined && chartType === 'analytics' && (conceptData.min !== undefined || conceptData['min-value'] !== undefined) && (
                        <RangeCutoffConfig
                            minValue={conceptData.min ?? conceptData['min-value'] ?? 0}
                            maxValue={conceptData.max ?? conceptData['max-value'] ?? 100}
                            currentCutoffs={cutoffs}
                            isBalanced={isCutoffsBalanced}
                            onApply={onApplyCutoffs}
                        />
                    )}
                    {zoomLevel !== 'years' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={handleZoomOut}
                        >
                            <ZoomOut className="h-3 w-3" />
                            Zoom Out
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
                    chartType === 'continuous-interval' ? (
                        <PatientContinuousIntervalChart
                            data={data as any}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            focusDate={focusDate}
                        />
                    ) : isRaw ? (
                        <PatientMultiLineChart
                            data={filteredData as any}
                            zoomLevel={zoomLevel}
                            focusDate={focusDate}
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
                            focusDate={focusDate}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            onNavigate={handleNavigateWrapper}
                        />
                    )
                )}
            </CardContent>
        </Card>
    );
}
