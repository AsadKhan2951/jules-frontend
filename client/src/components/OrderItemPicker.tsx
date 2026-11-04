import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, ImageIcon, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PickedProduct } from "@/components/ProductPicker";

/**
 * Item on a sales order: pick a catalogue product (its picture then goes on the invoice)
 * or a plain item type such as "Necklace". Searches all products on the server.
 */
export function OrderItemPicker({
  value,
  productId,
  types,
  onPickProduct,
  onPickType,
  disabled,
}: {
  value: string;
  productId?: string;
  types: string[];
  onPickProduct: (product: PickedProduct) => void;
  onPickType: (name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const products = trpc.products.pick.useQuery({ search: query || undefined, limit: 30 }, { enabled: open });
  const list = (products.data ?? []) as PickedProduct[];
  const needle = search.trim().toLowerCase();
  const typeMatches = types.filter(type => !needle || type.toLowerCase().includes(needle));
  const exact = types.some(type => type.toLowerCase() === needle) || list.some(product => product.name.toLowerCase() === needle);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={next => (next ? setOpen(true) : close())} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("h-9 w-full min-w-0 justify-between bg-input px-3 font-normal", !value && "text-muted-foreground")}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {productId && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />}
            <span className="truncate">{value || "Select product or item"}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[60] w-[380px] max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Search products (name / SKU) or item type…" />
          <CommandList className="max-h-80">
            {products.isFetching && !list.length ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <CommandEmpty>No product found.</CommandEmpty>
            )}
            {list.length > 0 && (
              <CommandGroup heading={query ? "Products" : "Recent products"}>
                {list.map(product => (
                  <CommandItem
                    key={`p${product.id}`}
                    value={`p${product.id}`}
                    onSelect={() => {
                      onPickProduct(product);
                      close();
                    }}
                    className="gap-2.5"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                      {product.thumbnail ? <img src={product.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{[product.sku, product.category].filter(Boolean).join(" · ")}</p>
                    </div>
                    {String(product.id) === productId && <Check className="h-4 w-4 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {typeMatches.length > 0 && (
              <CommandGroup heading="Item types (no picture)">
                {typeMatches.map(type => (
                  <CommandItem
                    key={`t${type}`}
                    value={`t${type}`}
                    onSelect={() => {
                      onPickType(type);
                      close();
                    }}
                  >
                    <Check className={cn("h-4 w-4", !productId && value === type ? "opacity-100" : "opacity-0")} />
                    {type}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {needle && !exact && (
              <CommandGroup>
                <CommandItem
                  value="custom"
                  onSelect={() => {
                    onPickType(search.trim());
                    close();
                  }}
                >
                  <Plus className="h-4 w-4" /> Use “{search.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default OrderItemPicker;
