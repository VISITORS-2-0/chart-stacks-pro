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

interface PatientMultiSelectProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

const AVAILABLE_PATIENTS = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "100", "101", "102", "103", "104",
    "1000", "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010", "1011", "1012"
];

export function PatientMultiSelect({ selectedIds, onChange }: PatientMultiSelectProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (currentValue: string) => {
        if (selectedIds.includes(currentValue)) {
            onChange(selectedIds.filter((id) => id !== currentValue));
        } else {
            onChange([...selectedIds, currentValue]);
        }
    };

    const handleRemove = (idToRemove: string) => {
        onChange(selectedIds.filter((id) => id !== idToRemove));
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const handleSelectAll = () => {
        onChange(AVAILABLE_PATIENTS);
    };

    const areAllSelected = AVAILABLE_PATIENTS.every(id => selectedIds.includes(id));

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="flex-1 justify-between h-auto min-h-[2.5rem]"
                        >
                            {selectedIds.length > 0
                                ? `${selectedIds.length} patients selected`
                                : "Select patients..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search patient ID..." />
                            <CommandList>
                                <CommandEmpty>No patient found.</CommandEmpty>
                                <CommandGroup>
                                    {AVAILABLE_PATIENTS.map((id) => (
                                        <CommandItem
                                            key={id}
                                            value={id}
                                            onSelect={handleSelect}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedIds.includes(id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {id}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {!areAllSelected && (
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
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedIds.map((id) => (
                        <Badge key={id} variant="secondary" className="px-2 py-1 gap-1">
                            {id}
                            <button
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(id);
                                }}
                            >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Remove {id}</span>
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
