"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showClear?: boolean;
  id?: string;
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
  id,
}: DatePickerProps) {
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setDate(value ? new Date(value) : undefined);
  }, [value]);

  const handleSelect = (selectedDate: Date | null) => {
    setDate(selectedDate || undefined);
    if (onChange && selectedDate) {
      onChange(selectedDate.toISOString().split("T")[0]);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    if (onChange) {
      onChange("");
    }
  };

  return (
    <div className="relative">
      <DatePicker
        selected={date}
        onChange={handleSelect}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        open={isOpen}
        onFocus={() => !disabled && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        customInput={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9 text-sm",
              !date && "text-muted-foreground",
              className
            )}
            type="button"
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              <span>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        }
        popperClassName="z-50"
        calendarClassName="rounded-md border shadow-lg p-3 bg-white"
      />
      {showClear && date && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10"
          tabIndex={-1}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
