"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showClear?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  className,
  disabled,
  minDate,
  maxDate,
  showClear = true,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  React.useEffect(() => {
    setDate(value ? new Date(value) : undefined);
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (onChange && selectedDate) {
      onChange(selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    if (onChange) {
      onChange("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 text-sm",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : <span>{placeholder}</span>}
          {showClear && date && (
            <span
              onClick={handleClear}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              ×
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
          fromDate={minDate}
          toDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}
