import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Group } from "@/services/groupsApi";

interface GroupMultiSelectProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    groups?: Group[];
}

export function GroupMultiSelect({ selectedIds, onChange, groups }: GroupMultiSelectProps) {
    const [open, setOpen] = useState(false);

    const availableGroupVals = groups ? groups.map(g => `group:${g.name}`) : [];

    const handleSelect = (currentValue: string) => {
        const realValue = availableGroupVals.find(v => v.toLowerCase() === currentValue) || currentValue;

        if (selectedIds.includes(realValue)) {
            onChange(selectedIds.filter((id) => id !== realValue));
        } else {
            onChange([...selectedIds, realValue]);
        }
    };

    const handleRemove = (idToRemove: string) => {
        onChange(selectedIds.filter((id) => id !== idToRemove));
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const handleSelectAll = () => {
        onChange(availableGroupVals);
    };

    const areAllSelected = availableGroupVals.length > 0 && availableGroupVals.every(id => selectedIds.includes(id));

    const getDisplaySummary = () => {
        if (selectedIds.length === 0) return "Select groups...";
        return `${selectedIds.length} groups selected`;
    };

    return (
        <div className="flex flex-col gap-2 max-w-[400px]">
            <div className="flex items-center gap-2 w-full">
                <Popover open={open} onOpenChange={setOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[300px] justify-between h-auto min-h-[2.5rem]"
                            disabled={!groups || groups.length === 0}
                        >
                            {getDisplaySummary()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search group..." />
                            <CommandList>
                                <CommandEmpty>No matching group found.</CommandEmpty>
                                
                                {groups && groups.length > 0 && (
                                    <CommandGroup>
                                        {groups.map((g) => {
                                            const val = `group:${g.name}`;
                                            return (
                                                <CommandItem
                                                    key={val}
                                                    value={val}
                                                    onSelect={handleSelect}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedIds.includes(val) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {g.name}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {!areAllSelected && availableGroupVals.length > 0 && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSelectAll}
                        className="whitespace-nowrap"
                    >
                        Select All
                    </Button>
                )}
                {selectedIds.length > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClearAll}
                        className="whitespace-nowrap"
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {selectedIds.length > 0 && (
                <div className="max-h-[150px] overflow-y-auto mt-2 p-1">
                    <div className="flex flex-wrap gap-2">
                        {selectedIds.map((id) => {
                            const displayId = id.startsWith("group:") ? id.substring(6) : id;
                            return (
                                <Badge key={id} variant="default" className="px-2 py-1 gap-1">
                                    <span className="text-xs opacity-70 mr-1">Group:</span>
                                    {displayId}
                                    <button
                                        className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(id);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">Remove {id}</span>
                                    </button>
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
