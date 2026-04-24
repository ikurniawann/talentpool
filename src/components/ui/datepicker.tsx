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
  const [date, setDate] = useState<string | undefined>(value);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (inputRef.current && !fpInstance.current) {
      fpInstance.current = flatpickr(inputRef.current, {
        dateFormat: "d M Y",
        locale: Indonesian,
        disableMobile: true, // Force desktop calendar on mobile too
        minDate: minDate,
        maxDate: maxDate,
        defaultDate: value || undefined,
        onChange: (selectedDates) => {
          const selectedDate = selectedDates[0];
          const dateStr = selectedDate
            ? selectedDate.toISOString().split("T")[0]
            : "";
          setDate(dateStr || undefined);
          onChange?.(dateStr);
        },
        clickOpens: !disabled,
      });
    }

    return () => {
      if (fpInstance.current) {
        fpInstance.current.destroy();
        fpInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (fpInstance.current && value !== undefined) {
      fpInstance.current.setDate(value, true);
    }
  }, [value]);

  useEffect(() => {
    if (fpInstance.current) {
      fpInstance.current.set("minDate", minDate);
      fpInstance.current.set("maxDate", maxDate);
      fpInstance.current.set("disabled", disabled);
    }
  }, [minDate, maxDate, disabled]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    onChange?.("");
    if (fpInstance.current) {
      fpInstance.current.clear();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        readOnly
        placeholder={placeholder}
        disabled={disabled}
        className="sr-only"
        aria-label={placeholder}
      />
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal h-9 text-sm",
          !date && "text-muted-foreground",
          className
        )}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled && fpInstance.current) {
            fpInstance.current.open();
          }
        }}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? (
          <span>
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(date))}
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>
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
