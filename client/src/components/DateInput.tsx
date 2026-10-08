import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date field with a calendar picker. Works with "yyyy-MM-dd" strings, the
 * same format the API and the old <input type="date"> used.
 */
export function DateInput({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled,
  clearable = true,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parse(value.slice(0, 10), "yyyy-MM-dd", new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-border bg-input px-3 text-left text-sm shadow-xs transition-colors",
            "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{selected ? format(selected, "dd MMM yyyy") : placeholder}</span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              aria-label="Clear date"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={event => {
                event.stopPropagation();
                onChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          onSelect={date => {
            if (date) onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateInput;
