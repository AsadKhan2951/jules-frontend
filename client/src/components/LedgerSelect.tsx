import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type LedgerOption = { id: number; code: string; title: string; parentTitle?: string | null; accountClass?: string | null };

// Ledgers are grouped by their code prefix so staff, customers and vendors are easy to find.
const GROUPS: Array<{ prefix: string; label: string }> = [
  { prefix: "CA", label: "Cash / Bank" },
  { prefix: "SF", label: "Staff" },
  { prefix: "CS", label: "Customers" },
  { prefix: "VN", label: "Vendors" },
  { prefix: "EX", label: "Expenses" },
  { prefix: "SA", label: "Sales / Income" },
  { prefix: "DW", label: "Drawings" },
  { prefix: "ST", label: "Stock" },
];

function groupOf(account: LedgerOption) {
  return GROUPS.find(group => account.code.toUpperCase().startsWith(group.prefix))?.label ?? "Other ledgers";
}

/** Searchable ledger dropdown (type a name, code or group such as "staff"). */
export function LedgerSelect({
  accounts,
  value,
  onChange,
  placeholder = "Select ledger",
  className,
  disabled,
}: {
  accounts: LedgerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find(account => String(account.id) === value);

  const grouped = useMemo(() => {
    const order = [...GROUPS.map(group => group.label), "Other ledgers"];
    const map = new Map<string, LedgerOption[]>();
    for (const account of accounts) {
      const label = groupOf(account);
      map.set(label, [...(map.get(label) ?? []), account]);
    }
    return order.filter(label => map.has(label)).map(label => ({ label, accounts: map.get(label)! }));
  }, [accounts]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-9 w-full min-w-0 justify-between px-3 font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                <span className="ml-2 text-foreground">{selected.title}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[300px] max-w-[min(28rem,calc(100vw-2rem))] p-0"
      >
        <Command>
          <CommandInput placeholder="Search name, code, staff, customer…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No ledger found.</CommandEmpty>
            {grouped.map(group => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.accounts.map(account => (
                  <CommandItem
                    key={account.id}
                    value={`${account.code} ${account.title} #${account.id}`}
                    keywords={[group.label, account.parentTitle ?? ""]}
                    onSelect={() => {
                      onChange(String(account.id));
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", String(account.id) === value ? "opacity-100" : "opacity-0")} />
                    <span className="w-[86px] shrink-0 font-mono text-xs text-muted-foreground">{account.code}</span>
                    <span className="truncate">{account.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default LedgerSelect;
