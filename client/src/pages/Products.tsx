import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Pencil, Trash2, Package, ImageIcon, LayoutGrid, List, X, Eye, ChevronLeft, ChevronRight, Gem, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Dummy jewelry images for selection
const JEWELRY_IMAGES = [
  { id: 1, url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400", name: "Diamond Set" },
  { id: 2, url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", name: "Bridal Necklace" },
  { id: 3, url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400", name: "Diamond Earrings" },
  { id: 4, url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400", name: "Gold Bracelet" },
  { id: 5, url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400", name: "Chain Bracelet" },
  { id: 6, url: "https://images.unsplash.com/photo-1603561596112-0a132b757442?w=400", name: "Link Bracelet" },
  { id: 7, url: "https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=400", name: "Pearl Earrings" },
  { id: 8, url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400", name: "Gold Studs" },
  { id: 9, url: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400", name: "Gold Kara" },
  { id: 10, url: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=400", name: "Designer Ring" },
  { id: 11, url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400", name: "Traditional Kara" },
  { id: 12, url: "https://images.unsplash.com/photo-1586104195538-050b9f74f58e?w=400", name: "Colored Stone Ring" },
  { id: 13, url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=400", name: "Gemstone Set" },
  { id: 14, url: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400", name: "Gemstone Rings" },
  { id: 15, url: "https://images.unsplash.com/photo-1610694955371-d4a3e0ce4b52?w=400", name: "Gold Earrings" },
  { id: 16, url: "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=400", name: "Filigree Earrings" },
];

type ProductFormData = {
  name: string;
  description: string;
  sku: string;
  categoryId: number | null;
  goldKarat: "22k" | "24k" | null;
  goldWeight: string;
  goldWastage: string;
  goldRateAtOrder: string;
  makingCharges: string;
  makingChargesType: "fixed" | "per_gram";
  diamondWeight: string;
  diamondRate: string;
  diamondPrice: string;
  stoneType: string;
  stoneWeight: string;
  stoneRate: string;
  stonePrice: string;
  primaryImage: string;
  images: string;
};

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  sku: "",
  categoryId: null,
  goldKarat: null,
  goldWeight: "",
  goldWastage: "",
  goldRateAtOrder: "",
  makingCharges: "",
  makingChargesType: "fixed",
  diamondWeight: "",
  diamondRate: "",
  diamondPrice: "",
  stoneType: "",
  stoneWeight: "",
  stoneRate: "",
  stonePrice: "",
  primaryImage: "",
  images: "",
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Image preview lightbox state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: products, isLoading } = trpc.products.list.useQuery({
    search: search || undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    isActive: true,
  });
  
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: goldPrice } = trpc.goldPrice.getLatest.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setShowModal(false);
      resetForm();
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setShowModal(false);
      resetForm();
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update product");
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      setDeleteConfirm(null);
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowImagePicker(false);
  };

  const handleEdit = (product: any) => {
    setEditingId(product.product.id);
    setFormData({
      name: product.product.name || "",
      description: product.product.description || "",
      sku: product.product.sku || "",
      categoryId: product.product.categoryId,
      goldKarat: product.product.goldKarat || null,
      goldWeight: product.product.goldWeight || "",
      goldWastage: product.product.goldWastage || "",
      goldRateAtOrder: product.product.goldRateAtOrder || "",
      makingCharges: product.product.makingCharges || "",
      makingChargesType: product.product.makingChargesType || "fixed",
      diamondWeight: product.product.diamondWeight || "",
      diamondRate: product.product.diamondRate || "",
      diamondPrice: product.product.diamondPrice || "",
      stoneType: product.product.stoneType || "",
      stoneWeight: product.product.stoneWeight || "",
      stoneRate: product.product.stoneRate || "",
      stonePrice: product.product.stonePrice || "",
      primaryImage: product.product.primaryImage || "",
      images: product.product.images || "",
    });
    setShowModal(true);
  };

  // Calculate price based on gold weight and current gold price
  const calculatedPrice = useMemo(() => {
    if (!formData.goldWeight || !formData.goldKarat || !goldPrice) return null;
    
    const weight = parseFloat(formData.goldWeight);
    const goldRate = formData.goldKarat === "22k" 
      ? parseFloat(goldPrice.price22k || "0") 
      : parseFloat(goldPrice.price24k || "0");
    
    const goldValue = weight * goldRate;
    const making = parseFloat(formData.makingCharges || "0");
    const diamond = parseFloat(formData.diamondPrice || "0");
    const stone = parseFloat(formData.stonePrice || "0");
    
    let makingTotal = making;
    if (formData.makingChargesType === "per_gram") {
      makingTotal = making * weight * 11.664; // 1 tola = 11.664 grams
    }
    
    return goldValue + makingTotal + diamond + stone;
  }, [formData.goldWeight, formData.goldKarat, formData.makingCharges, formData.makingChargesType, formData.diamondPrice, formData.stonePrice, goldPrice]);

  // Auto-calculate diamond price when weight and rate change
  const handleDiamondChange = (field: 'diamondWeight' | 'diamondRate', value: string) => {
    const newData = { ...formData, [field]: value };
    if (newData.diamondWeight && newData.diamondRate) {
      const price = parseFloat(newData.diamondWeight) * parseFloat(newData.diamondRate);
      newData.diamondPrice = price.toFixed(2);
    }
    setFormData(newData);
  };

  // Auto-calculate stone price when weight and rate change
  const handleStoneChange = (field: 'stoneWeight' | 'stoneRate', value: string) => {
    const newData = { ...formData, [field]: value };
    if (newData.stoneWeight && newData.stoneRate) {
      const price = parseFloat(newData.stoneWeight) * parseFloat(newData.stoneRate);
      newData.stonePrice = price.toFixed(2);
    }
    setFormData(newData);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    // Get current gold rate for the selected karat
    const currentGoldRate = formData.goldKarat === "22k" 
      ? goldPrice?.price22k 
      : goldPrice?.price24k;

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      sku: formData.sku || undefined,
      categoryId: formData.categoryId || undefined,
      goldKarat: formData.goldKarat || undefined,
      goldWeight: formData.goldWeight || undefined,
      goldWastage: formData.goldWastage || undefined,
      goldRateAtOrder: formData.goldRateAtOrder || currentGoldRate || undefined,
      makingCharges: formData.makingCharges || undefined,
      makingChargesType: formData.makingChargesType,
      diamondWeight: formData.diamondWeight || undefined,
      diamondRate: formData.diamondRate || undefined,
      diamondPrice: formData.diamondPrice || undefined,
      stoneType: formData.stoneType || undefined,
      stoneWeight: formData.stoneWeight || undefined,
      stoneRate: formData.stoneRate || undefined,
      stonePrice: formData.stonePrice || undefined,
      primaryImage: formData.primaryImage || undefined,
      images: formData.images || undefined,
      basePrice: calculatedPrice ? calculatedPrice.toString() : undefined,
      totalPrice: calculatedPrice ? calculatedPrice.toString() : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "—";
    return `PKR ${Number(price).toLocaleString()}`;
  };

  // Handle image click for preview
  const handleImageClick = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewProduct(product);
    setPreviewImage(product.product.primaryImage);
    setShowProductDetail(true);
  };

  // Get all images for a product
  const getProductImages = (product: any) => {
    const images = [product.product.primaryImage];
    if (product.product.images) {
      try {
        const additionalImages = product.product.images.split(',').map((s: string) => s.trim()).filter(Boolean);
        images.push(...additionalImages);
      } catch {
        // If not valid, just use primary
      }
    }
    return images.filter(Boolean);
  };

  // Navigate images in lightbox
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!previewProduct) return;
    const images = getProductImages(previewProduct);
    const currentIndex = images.indexOf(previewImage);
    if (direction === 'prev') {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      setPreviewImage(images[newIndex]);
    } else {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      setPreviewImage(images[newIndex]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your jewelry inventory
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
          Add Product
        </Button>
      </div>

      {/* Filters */}
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products Display */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !products?.length ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">Add your first jewelry product to get started</p>
          <Button onClick={() => setShowModal(true)} className="gold-gradient text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products?.map((item) => (
            <div
              key={item.product.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              onClick={(e) => handleImageClick(item, e)}
            >
              {item.product.primaryImage ? (
                <img
                  src={item.product.primaryImage}
                  alt={item.product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-white/70 text-xs">{formatPrice(item.product.totalPrice)}</p>
                  {item.product.goldKarat && (
                    <Badge className="mt-1 bg-primary/80 text-primary-foreground text-xs">
                      {item.product.goldKarat}
                    </Badge>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(item, e);
                    }}
                  >
                    <Eye className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-destructive border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(item.product.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Product</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Gold</TableHead>
                  <TableHead className="text-muted-foreground text-right">Price</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((item) => (
                  <TableRow key={item.product.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="cursor-pointer"
                          onClick={(e) => handleImageClick(item, e)}
                        >
                          {item.product.primaryImage ? (
                            <img
                              src={item.product.primaryImage}
                              alt={item.product.name}
                              className="w-12 h-12 rounded-lg object-cover hover:ring-2 ring-primary transition-all"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.product.name}</p>
                          {item.product.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.product.sku || '-'}
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="secondary" className="bg-muted">
                          {item.category.name}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.product.goldWeight && (
                          <span className="text-foreground">{item.product.goldWeight} tola</span>
                        )}
                        {item.product.goldKarat && (
                          <Badge className="ml-2 bg-primary/20 text-primary">
                            {item.product.goldKarat}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatPrice(item.product.totalPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleImageClick(item, e)}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(item.product.id)}
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

      {/* Product Detail / Image Preview Lightbox */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-card border-border p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewProduct?.product?.name || 'Product Details'}</DialogTitle>
          </DialogHeader>
          {previewProduct && (
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image Section */}
              <div className="relative bg-black aspect-square md:aspect-auto md:min-h-[500px]">
                <img
                  src={previewImage || previewProduct.product.primaryImage}
                  alt={previewProduct.product.name}
                  className="w-full h-full object-contain"
                />
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={() => setShowProductDetail(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
                
                {/* Navigation arrows */}
                {getProductImages(previewProduct).length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={() => navigateImage('prev')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={() => navigateImage('next')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                
                {/* Image thumbnails */}
                {getProductImages(previewProduct).length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {getProductImages(previewProduct).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewImage(img)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          previewImage === img ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Details Section */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{previewProduct.product.name}</h2>
                  {previewProduct.category && (
                    <Badge className="mt-2 bg-primary/20 text-primary">{previewProduct.category.name}</Badge>
                  )}
                  {previewProduct.product.description && (
                    <p className="text-muted-foreground mt-3">{previewProduct.product.description}</p>
                  )}
                </div>
                
                {/* Price */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(previewProduct.product.totalPrice)}
                  </p>
                </div>
                
                {/* Product Specifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Product Specifications
                  </h3>
                  
                  {/* Gold Details */}
                  {(previewProduct.product.goldKarat || previewProduct.product.goldWeight) && (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Gold Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {previewProduct.product.goldKarat && (
                          <div>
                            <p className="text-muted-foreground">Cartage of Gold</p>
                            <p className="font-medium text-foreground">{previewProduct.product.goldKarat}</p>
                          </div>
                        )}
                        {previewProduct.product.goldWeight && (
                          <div>
                            <p className="text-muted-foreground">Weight (incl. wastage)</p>
                            <p className="font-medium text-foreground">{previewProduct.product.goldWeight} tola</p>
                          </div>
                        )}
                        {previewProduct.product.goldWastage && (
                          <div>
                            <p className="text-muted-foreground">Wastage %</p>
                            <p className="font-medium text-foreground">{previewProduct.product.goldWastage}%</p>
                          </div>
                        )}
                        {previewProduct.product.goldRateAtOrder && (
                          <div>
                            <p className="text-muted-foreground">Rate at Order</p>
                            <p className="font-medium text-foreground">{formatPrice(previewProduct.product.goldRateAtOrder)}/tola</p>
                          </div>
                        )}
                        {goldPrice && previewProduct.product.goldKarat && (
                          <div>
                            <p className="text-muted-foreground">Rate Today</p>
                            <p className="font-medium text-primary">
                              {formatPrice(previewProduct.product.goldKarat === '22k' ? goldPrice.price22k : goldPrice.price24k)}/tola
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Diamond Details */}
                  {(previewProduct.product.diamondWeight || previewProduct.product.diamondPrice) && (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                        <Gem className="h-4 w-4" />
                        Diamond Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {previewProduct.product.diamondWeight && (
                          <div>
                            <p className="text-muted-foreground">Weight</p>
                            <p className="font-medium text-foreground">{previewProduct.product.diamondWeight} carats</p>
                          </div>
                        )}
                        {previewProduct.product.diamondRate && (
                          <div>
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-medium text-foreground">{formatPrice(previewProduct.product.diamondRate)}/carat</p>
                          </div>
                        )}
                        {previewProduct.product.diamondPrice && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Total Diamond Price</p>
                            <p className="font-medium text-foreground">{formatPrice(previewProduct.product.diamondPrice)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Stone Details */}
                  {(previewProduct.product.stoneType || previewProduct.product.stoneWeight) && (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Stone Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {previewProduct.product.stoneType && (
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium text-foreground">{previewProduct.product.stoneType}</p>
                          </div>
                        )}
                        {previewProduct.product.stoneWeight && (
                          <div>
                            <p className="text-muted-foreground">Weight</p>
                            <p className="font-medium text-foreground">{previewProduct.product.stoneWeight} carats</p>
                          </div>
                        )}
                        {previewProduct.product.stoneRate && (
                          <div>
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-medium text-foreground">{formatPrice(previewProduct.product.stoneRate)}/carat</p>
                          </div>
                        )}
                        {previewProduct.product.stonePrice && (
                          <div>
                            <p className="text-muted-foreground">Total Stone Price</p>
                            <p className="font-medium text-foreground">{formatPrice(previewProduct.product.stonePrice)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Making Charges */}
                  {previewProduct.product.makingCharges && (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Making Charges</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium text-foreground">{formatPrice(previewProduct.product.makingCharges)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium text-foreground capitalize">
                            {previewProduct.product.makingChargesType === 'per_gram' ? 'Per Gram' : 'Fixed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowProductDetail(false);
                      handleEdit(previewProduct);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Product
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowProductDetail(false);
                      setDeleteConfirm(previewProduct.product.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the product details. Price will be calculated automatically based on gold weight and current gold price.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Diamond Ring"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-foreground">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., DR-001"
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Category</Label>
              <Select 
                value={formData.categoryId?.toString() || ""} 
                onValueChange={(v) => setFormData({ ...formData, categoryId: v ? Number(v) : null })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Specifications */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary border-b border-border pb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Product Specifications
              </h3>
              
              {/* Gold Details */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gold Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goldKarat" className="text-foreground">Cartage of Gold</Label>
                    <Select 
                      value={formData.goldKarat || ""} 
                      onValueChange={(v) => setFormData({ ...formData, goldKarat: v as "22k" | "24k" | null })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select karat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="22k">22K Gold</SelectItem>
                        <SelectItem value="24k">24K Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goldWeight" className="text-foreground">Weight incl. Wastage (Tola)</Label>
                    <Input
                      id="goldWeight"
                      type="number"
                      step="0.001"
                      value={formData.goldWeight}
                      onChange={(e) => setFormData({ ...formData, goldWeight: e.target.value })}
                      placeholder="e.g., 1.5"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goldWastage" className="text-foreground">Wastage %</Label>
                    <Input
                      id="goldWastage"
                      type="number"
                      step="0.01"
                      value={formData.goldWastage}
                      onChange={(e) => setFormData({ ...formData, goldWastage: e.target.value })}
                      placeholder="e.g., 5"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goldRateAtOrder" className="text-foreground">Gold Rate at Order (PKR/Tola)</Label>
                    <Input
                      id="goldRateAtOrder"
                      type="number"
                      value={formData.goldRateAtOrder}
                      onChange={(e) => setFormData({ ...formData, goldRateAtOrder: e.target.value })}
                      placeholder={goldPrice ? `Current: ${formData.goldKarat === '24k' ? goldPrice.price24k : goldPrice.price22k}` : "e.g., 250000"}
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Diamond Details */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Gem className="h-3 w-3" />
                  Diamond Details
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="diamondWeight" className="text-foreground">Weight (Carats)</Label>
                    <Input
                      id="diamondWeight"
                      type="number"
                      step="0.001"
                      value={formData.diamondWeight}
                      onChange={(e) => handleDiamondChange('diamondWeight', e.target.value)}
                      placeholder="e.g., 0.5"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diamondRate" className="text-foreground">Rate (PKR/Carat)</Label>
                    <Input
                      id="diamondRate"
                      type="number"
                      value={formData.diamondRate}
                      onChange={(e) => handleDiamondChange('diamondRate', e.target.value)}
                      placeholder="e.g., 100000"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diamondPrice" className="text-foreground">Total Price (PKR)</Label>
                    <Input
                      id="diamondPrice"
                      type="number"
                      value={formData.diamondPrice}
                      onChange={(e) => setFormData({ ...formData, diamondPrice: e.target.value })}
                      placeholder="Auto-calculated"
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Stone Details */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stone Details (Emerald, Sapphire, Ruby, etc.)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stoneType" className="text-foreground">Stone Type</Label>
                    <Select 
                      value={formData.stoneType || ""} 
                      onValueChange={(v) => setFormData({ ...formData, stoneType: v })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select stone type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Emerald">Emerald</SelectItem>
                        <SelectItem value="Sapphire">Sapphire</SelectItem>
                        <SelectItem value="Ruby">Ruby</SelectItem>
                        <SelectItem value="Pearl">Pearl</SelectItem>
                        <SelectItem value="Topaz">Topaz</SelectItem>
                        <SelectItem value="Amethyst">Amethyst</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stoneWeight" className="text-foreground">Weight (Carats)</Label>
                    <Input
                      id="stoneWeight"
                      type="number"
                      step="0.01"
                      value={formData.stoneWeight}
                      onChange={(e) => handleStoneChange('stoneWeight', e.target.value)}
                      placeholder="e.g., 0.5"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stoneRate" className="text-foreground">Rate (PKR/Carat)</Label>
                    <Input
                      id="stoneRate"
                      type="number"
                      value={formData.stoneRate}
                      onChange={(e) => handleStoneChange('stoneRate', e.target.value)}
                      placeholder="e.g., 50000"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stonePrice" className="text-foreground">Total Price (PKR)</Label>
                    <Input
                      id="stonePrice"
                      type="number"
                      value={formData.stonePrice}
                      onChange={(e) => setFormData({ ...formData, stonePrice: e.target.value })}
                      placeholder="Auto-calculated"
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Making Charges */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Making Charges</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="makingCharges" className="text-foreground">Amount (PKR)</Label>
                    <Input
                      id="makingCharges"
                      type="number"
                      value={formData.makingCharges}
                      onChange={(e) => setFormData({ ...formData, makingCharges: e.target.value })}
                      placeholder="e.g., 5000"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="makingChargesType" className="text-foreground">Charge Type</Label>
                    <Select 
                      value={formData.makingChargesType} 
                      onValueChange={(v) => setFormData({ ...formData, makingChargesType: v as "fixed" | "per_gram" })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Fixed Amount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="per_gram">Per Gram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Price */}
            {calculatedPrice && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">Calculated Price</p>
                <p className="text-2xl font-semibold text-primary">
                  PKR {calculatedPrice.toLocaleString()}
                </p>
              </div>
            )}

            {/* Images */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Images</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="text-xs"
                >
                  {showImagePicker ? "Hide Gallery" : "Choose from Gallery"}
                </Button>
              </div>
              
              {showImagePicker && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg max-h-48 overflow-y-auto">
                  {JEWELRY_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, primaryImage: img.url });
                        setShowImagePicker(false);
                      }}
                      className="aspect-square rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="primaryImage" className="text-foreground">Primary Image URL</Label>
                <Input
                  id="primaryImage"
                  value={formData.primaryImage}
                  onChange={(e) => setFormData({ ...formData, primaryImage: e.target.value })}
                  placeholder="https://... or select from gallery"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="images" className="text-foreground">Additional Images (comma-separated URLs)</Label>
                <Textarea
                  id="images"
                  value={formData.images}
                  onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                  placeholder="https://..., https://..."
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
