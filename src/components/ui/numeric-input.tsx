"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value?: number | null;
  onValueChange: (value: number) => void;
  decimalScale?: number;
  allowNegative?: boolean;
};

function sanitizeNumberInput(value: string, decimalScale: number, allowNegative: boolean) {
  let sanitized = value.replace(decimalScale > 0 ? /[^0-9,.-]/g : /[^0-9.-]/g, "");

  if (!allowNegative) {
    sanitized = sanitized.replace(/-/g, "");
  } else {
    sanitized = sanitized.replace(/(?!^)-/g, "");
  }

  const parts = sanitized.split(",");
  if (parts.length > 1) {
    sanitized = `${parts[0]},${parts.slice(1).join("").replace(/,/g, "")}`;
  }

  return sanitized;
}

function parseFormattedNumber(value: string, decimalScale: number, allowNegative: boolean) {
  const sanitized = sanitizeNumberInput(value, decimalScale, allowNegative);
  const normalized = sanitized
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, decimalScale: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: decimalScale,
  }).format(value);
}

function formatDisplayValue(value: number | null | undefined, decimalScale: number) {
  return value === null || value === undefined ? "" : formatNumber(value, decimalScale);
}

export function NumericInput({
  value,
  onValueChange,
  decimalScale = 4,
  allowNegative = false,
  className,
  onBlur,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = React.useState(
    formatDisplayValue(value, decimalScale)
  );

  React.useEffect(() => {
    setDisplayValue(formatDisplayValue(value, decimalScale));
  }, [decimalScale, value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimalScale > 0 ? "decimal" : "numeric"}
      value={displayValue}
      onChange={(event) => {
        const nextValue = sanitizeNumberInput(event.target.value, decimalScale, allowNegative);
        setDisplayValue(nextValue);
        onValueChange(parseFormattedNumber(nextValue, decimalScale, allowNegative));
      }}
      onBlur={(event) => {
        const parsed = parseFormattedNumber(event.target.value, decimalScale, allowNegative);
        setDisplayValue(event.target.value === "" ? "" : formatNumber(parsed, decimalScale));
        onBlur?.(event);
      }}
      className={cn("text-left tabular-nums", className)}
    />
  );
}
