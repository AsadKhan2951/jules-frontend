import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Search, LayoutGrid, List, MoreHorizontal, ImageIcon, Plus, Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CollectionDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const collectionId = parseInt(params.id || "0");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  const utils = trpc.useUtils();

  const { data: collection, isLoading } = trpc.collections.getById.useQuery(
    { id: collectionId },
    { enabled: !!collectionId }
  );

  const { data: allProducts } = trpc.products.list.useQuery({ isActive: true });

  const updateMutation = trpc.collections.update.useMutation({
    onSuccess: () => {
      toast.success("Products added to collection");
      setShowAddProducts(false);
      setSelectedProducts([]);
      utils.collections.getById.invalidate();
      utils.collections.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddProducts = () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }
    updateMutation.mutate({
      id: collectionId,
      productIds: selectedProducts,
    });
  };

  // Filter products based on search
  const filteredProducts = collection?.products?.filter((item: any) =>
    item.product.name.toLowerCase().includes(search.toLowerCase()) ||
    item.product.sku?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Get products not in collection for adding
  const existingProductIds = new Set(collection?.products?.map((p: any) => p.product.id) || []);
  const availableProducts = allProducts?.filter(p => !existingProductIds.has(p.product.id)) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full shimmer" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded shimmer" />
            <div className="h-4 w-24 rounded shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-medium text-foreground mb-2">Collection not found</h3>
        <p className="text-sm text-muted-foreground mb-4">The collection you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/collections")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/collections")}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{collection.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {collection.products?.length || 0} items
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddProducts(true)}
          className="gold-gradient text-primary-foreground border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Products
        </Button>
      </div>

      {/* Description */}
      {collection.description && (
        <p className="text-muted-foreground">{collection.description}</p>
      )}

      {/* Search and View Mode */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
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

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No products in this collection</h3>
          <p className="text-sm text-muted-foreground mb-4">Add products to this collection to see them here.</p>
          <Button
            onClick={() => setShowAddProducts(true)}
            className="gold-gradient text-primary-foreground border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Products
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((item: any, index: number) => (
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
                  <p className="text-white/70 text-xs mt-1">
                    PKR {Number(item.product.basePrice || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium text-sm">Product</th>
                  <th className="text-left p-4 text-muted-foreground font-medium text-sm">SKU</th>
                  <th className="text-left p-4 text-muted-foreground font-medium text-sm">Category</th>
                  <th className="text-right p-4 text-muted-foreground font-medium text-sm">Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item: any) => (
                  <tr key={item.product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.product.primaryImage ? (
                          <img
                            src={item.product.primaryImage}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-medium text-foreground">{item.product.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{item.product.sku || '-'}</td>
                    <td className="p-4">
                      {item.category ? (
                        <span className="px-2 py-1 bg-muted rounded text-xs text-foreground">
                          {item.category.name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-right text-foreground font-medium">
                      PKR {Number(item.product.basePrice || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Products Modal */}
      <Dialog open={showAddProducts} onOpenChange={setShowAddProducts}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Products to Collection</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select products to add to "{collection.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                All products are already in this collection.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                {availableProducts.map((item) => (
                  <button
                    key={item.product.id}
                    type="button"
                    onClick={() => toggleProductSelection(item.product.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedProducts.includes(item.product.id)
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
                    {selectedProducts.includes(item.product.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedProducts.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {selectedProducts.length} products selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddProducts(false);
                setSelectedProducts([]);
              }}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProducts}
              disabled={selectedProducts.length === 0 || updateMutation.isPending}
              className="gold-gradient text-primary-foreground border-0"
            >
              {updateMutation.isPending ? "Adding..." : `Add ${selectedProducts.length} Products`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
