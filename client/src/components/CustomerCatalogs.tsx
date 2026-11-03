import { useState } from "react";
import { BookOpen, Copy, ExternalLink, MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CatalogBuilderDialog, catalogLink } from "@/components/CatalogBuilderDialog";

type Customer = { id: number; firstName: string; lastName?: string | null; phone?: string | null };

/** Catalogs belong to a customer: list, create, edit and share them from the customer page. */
export function CustomerCatalogs({ customer }: { customer: Customer }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: catalogs, isLoading } = trpc.catalogs.list.useQuery({ customerId: customer.id });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const remove = trpc.catalogs.delete.useMutation({
    onSuccess: () => {
      toast.success("Catalog deleted");
      utils.catalogs.invalidate();
      setDeleteId(null);
    },
    onError: error => toast.error(error.message || "Could not delete the catalog"),
  });

  const openNew = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Catalogs</h3>
          <p className="text-sm text-muted-foreground mt-1">Curated selections shared with {customer.firstName}</p>
        </div>
        <Button onClick={openNew} className="gold-gradient text-primary-foreground border-0">
          <Plus className="h-4 w-4 mr-2" /> Create catalog
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !catalogs?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No catalogs yet for {customer.firstName}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Create the first one
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalogs.map(({ catalog }: any) => (
            <div key={catalog.id} className="group overflow-hidden rounded-xl border border-border bg-background">
              <a href={catalogLink(catalog.publicToken)} target="_blank" rel="noreferrer" className="block aspect-[16/9] bg-muted">
                {catalog.coverImage ? (
                  <img src={catalog.coverImage} alt={catalog.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </a>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{catalog.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
                      {catalog.status}
                    </Badge>
                    {new Date(catalog.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(catalogLink(catalog.publicToken)).then(() => toast.success("Link copied"))}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(catalogLink(catalog.publicToken), "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Open preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(catalog.id);
                        setBuilderOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit products
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation(`/catalogs/${catalog.id}/comments`)}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Likes &amp; comments
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(catalog.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <CatalogBuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} customer={customer} catalogId={editingId} />

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this catalog?</AlertDialogTitle>
            <AlertDialogDescription>The shared link will stop working. Likes and comments are removed too.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId !== null && remove.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

