import { useMemo, useState } from "react";
import { Hammer, Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VENDOR_ROLES, VendorFormDialog } from "@/components/VendorFormDialog";

const roleLabel = Object.fromEntries(VENDOR_ROLES.map(role => [role.value, role.label])) as Record<string, string>;

export default function Vendors() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [role, setRole] = useState("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const vendors = trpc.vendors.list.useQuery();
  const setActive = trpc.vendors.update.useMutation({
    onSuccess: async vendor => {
      toast.success(vendor?.isActive ? "Vendor reactivated" : "Vendor deactivated");
      await Promise.all([utils.vendors.list.invalidate(), utils.finance.accounts.list.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (vendors.data ?? []).filter((vendor: any) => {
      if (status === "active" && vendor.isActive === false) return false;
      if (status === "inactive" && vendor.isActive !== false) return false;
      if (role !== "all" && !(vendor.roles ?? []).includes(role)) return false;
      if (!query) return true;
      return [vendor.code, vendor.name, vendor.company, vendor.phone, vendor.mobile, vendor.city].some(value =>
        String(value ?? "").toLowerCase().includes(query)
      );
    });
  }, [vendors.data, search, status, role]);

  const openForm = (vendor: any | null) => {
    setEditing(vendor);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary"><Hammer className="h-4 w-4" />Operations & Finance</div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">Karigars and suppliers, the work they do and the rates agreed with them. Each vendor gets a ledger in Finance.</p>
        </div>
        <Button onClick={() => openForm(null)} className="gold-gradient text-primary-foreground border-0">
          <Plus className="mr-2 h-4 w-4" />New Vendor
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, code or phone" className="pl-9" />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {VENDOR_ROLES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={value => setStatus(value as typeof status)}>
              <SelectTrigger className="sm:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left">Code</th>
                  <th className="px-5 py-3 text-left">Vendor</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  <th className="px-5 py-3 text-left">Roles</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((vendor: any) => (
                  <tr key={vendor.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-5 py-3.5 font-mono text-xs text-primary">{vendor.code}</td>
                    <td className="px-5 py-3.5">
                      <button type="button" className="text-left font-medium text-foreground hover:underline" onClick={() => openForm(vendor)}>{vendor.name}</button>
                      {vendor.company && <p className="text-xs text-muted-foreground">{vendor.company}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      <p>{vendor.mobile || vendor.phone || "—"}</p>
                      {vendor.city && <p className="text-xs">{vendor.city}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {(vendor.roles ?? []).length
                          ? vendor.roles.map((item: string) => <Badge key={item} variant="outline" className="font-normal">{roleLabel[item] ?? item}</Badge>)
                          : <span className="text-muted-foreground">{vendor.specialization || "—"}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge className={vendor.isActive === false ? "bg-zinc-500/10 text-zinc-500" : "bg-emerald-500/10 text-emerald-600"}>
                        {vendor.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openForm(vendor)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={setActive.isPending}
                        className={vendor.isActive === false ? "" : "text-destructive hover:text-destructive"}
                        onClick={() => setActive.mutate({ id: vendor.id, isActive: vendor.isActive === false })}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />{vendor.isActive === false ? "Activate" : "Deactivate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!vendors.isLoading && rows.length === 0 && (
            <div className="py-14 text-center">
              <Hammer className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{vendors.data?.length ? "No vendors match these filters." : "No vendors yet. Add your first karigar."}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} vendor={editing} />
    </div>
  );
}
