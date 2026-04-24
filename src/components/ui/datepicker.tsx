"use client";

import React, { useEffect, useRef, useState } from "react";
import flatpickr from "flatpickr";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "flatpickr/dist/themes/light.css";
import { Indonesian } from "flatpickr/dist/l10n/id.js";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayDate, setDisplayDate] = useState<string>(value || "");
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // Initialize flatpickr
  useEffect(() => {
    if (inputRef.current && !fpInstance.current) {
      fpInstance.current = flatpickr(inputRef.current, {
        dateFormat: "d M Y",
        locale: Indonesian,
        disableMobile: true,
        minDate: minDate,
        maxDate: maxDate,
        defaultDate: value || new Date(), // Default to today if no value
        onChange: (selectedDates, dateStr) => {
          setDisplayDate(dateStr);
          onChange?.(dateStr);
        },
      });
    }

    return () => {
      if (fpInstance.current) {
        fpInstance.current.destroy();
        fpInstance.current = null;
      }
    };
  }, []);

  // Update flatpickr when external value changes
  useEffect(() => {
    if (fpInstance.current && value !== undefined) {
      fpInstance.current.setDate(value, true);
      setDisplayDate(value);
    }
  }, [value]);

  // Update flatpickr config
  useEffect(() => {
    if (fpInstance.current) {
      fpInstance.current.set("minDate", minDate);
      fpInstance.current.set("maxDate", maxDate);
      if (disabled) {
        fpInstance.current.close();
      }
    }
  }, [minDate, maxDate, disabled]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayDate("");
    onChange?.("");
    if (fpInstance.current) {
      fpInstance.current.clear();
    }
  };

  const openCalendar = () => {
    if (!disabled && fpInstance.current) {
      fpInstance.current.open();
    }
  };

  return (
    <div className="relative">
      {/* Hidden input for flatpickr */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="sr-only"
        aria-label={placeholder}
      />
      
      {/* Visible button that triggers calendar */}
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal h-9 text-sm cursor-pointer",
          !displayDate && "text-muted-foreground",
          className
        )}
        type="button"
        disabled={disabled}
        onClick={openCalendar}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {displayDate ? (
          <span>
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(displayDate))}
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>
      
      {/* Clear button */}
      {showClear && displayDate && !disabled && (
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
