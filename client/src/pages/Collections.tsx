import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FolderOpen, ArrowLeft, ImageIcon, Check, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";

type CollectionFormData = {
  name: string;
  description: string;
  coverImage: string;
  productIds: number[];
};

const initialFormData: CollectionFormData = {
  name: "",
  description: "",
  coverImage: "",
  productIds: [],
};

export default function Collections() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [viewingCollection, setViewingCollection] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const utils = trpc.useUtils();
  
  const { data: collections, isLoading } = trpc.collections.list.useQuery({
    search: search || undefined,
    isActive: true,
  });

  const { data: collectionDetail } = trpc.collections.getById.useQuery(
    { id: viewingCollection! },
    { enabled: !!viewingCollection }
  );

  const { data: allProducts } = trpc.products.list.useQuery({ isActive: true });

  const createMutation = trpc.collections.create.useMutation({
    onSuccess: () => {
      toast.success("Collection created successfully");
      setShowModal(false);
      resetForm();
      utils.collections.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create collection");
    },
  });

  const updateMutation = trpc.collections.update.useMutation({
    onSuccess: () => {
      toast.success("Collection updated successfully");
      setShowModal(false);
      resetForm();
      utils.collections.list.invalidate();
      utils.collections.getById.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });

  const deleteMutation = trpc.collections.delete.useMutation({
    onSuccess: () => {
      toast.success("Collection deleted successfully");
      setDeleteConfirm(null);
      utils.collections.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete collection");
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleEdit = (collection: any) => {
    setEditingId(collection.id);
    setFormData({
      name: collection.name || "",
      description: collection.description || "",
      coverImage: collection.coverImage || "",
      productIds: [],
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      coverImage: formData.coverImage || undefined,
      productIds: formData.productIds.length > 0 ? formData.productIds : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  // If viewing a collection, show its products
  if (viewingCollection && collectionDetail) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewingCollection(null)}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">{collectionDetail.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {collectionDetail.products?.length || 0} items
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {collectionDetail.products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No products in this collection</h3>
            <p className="text-sm text-muted-foreground">Add products to this collection to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {collectionDetail.products?.map((item: any, index: number) => (
              <div
                key={item.product.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-card photo-grid-item cursor-pointer animate-fadeIn"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {item.product.primaryImage ? (
                  <img
                    src={item.product.primaryImage}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-medium text-sm truncate">{item.product.name}</p>
                    {item.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded text-xs text-white/90">
                        {item.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your products into collections
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="gold-gradient text-primary-foreground border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Search and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-muted' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'list' ? 'bg-muted' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collections Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square rounded-xl shimmer" />
              <div className="h-4 w-24 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : collections?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No collections yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first collection to organize products.</p>
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="gold-gradient text-primary-foreground border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {collections?.map((collection, index) => (
            <div
              key={collection.id}
              className="group animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className="relative aspect-square rounded-xl overflow-hidden bg-card collection-card cursor-pointer"
                onClick={() => setViewingCollection(collection.id)}
              >
                {collection.coverImage ? (
                  <img
                    src={collection.coverImage}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <FolderOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Overlay with count */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-xs font-medium">
                      {collection.productCount || 0} items
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(collection); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(collection.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground truncate">{collection.name}</p>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground font-medium">Collection</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Products</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Description</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections?.map((collection) => (
                  <TableRow 
                    key={collection.id} 
                    className="border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => setViewingCollection(collection.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {collection.coverImage ? (
                          <img
                            src={collection.coverImage}
                            alt={collection.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-medium text-foreground">{collection.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground">{collection.productCount || 0} items</span>
                    </TableCell>
                    <TableCell>
                      {collection.description ? (
                        <p className="text-muted-foreground truncate max-w-[200px]">
                          {collection.description}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleEdit(collection); }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(collection.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add/Edit Collection Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Edit Collection" : "New Collection"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a collection to organize your jewelry products.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Collection Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Diamond Collection"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Collection description..."
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImage" className="text-foreground">Cover Image URL</Label>
              <Input
                id="coverImage"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://..."
                className="bg-input border-border"
              />
            </div>

            {/* Product Selection */}
            {!editingId && (
              <div className="space-y-3">
                <Label className="text-foreground">Add Products</Label>
                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                  {allProducts?.map((item) => (
                    <button
                      key={item.product.id}
                      type="button"
                      onClick={() => toggleProductSelection(item.product.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        formData.productIds.includes(item.product.id)
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      {item.product.primaryImage ? (
                        <img
                          src={item.product.primaryImage}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                      {formData.productIds.includes(item.product.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {formData.productIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formData.productIds.length} products selected
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gold-gradient text-primary-foreground border-0"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this collection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
