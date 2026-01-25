import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  BookOpen,
  Eye,
  Link2,
  Copy,
  ImageIcon,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Check,
  Users,
  LayoutGrid,
  List,
  Calendar,
  Upload,
  UserPlus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Dummy cover images for selection
const COVER_IMAGES = [
  { id: 1, url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600", name: "Jewelry Set" },
  { id: 2, url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600", name: "Bridal" },
  { id: 3, url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600", name: "Earrings" },
  { id: 4, url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600", name: "Bracelet" },
  { id: 5, url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600", name: "Gold" },
  { id: 6, url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600", name: "Gemstones" },
];

type CatalogFormData = {
  name: string;
  description: string;
  coverImage: string;
  productType: string;
  customFields: string;
  customerId: number | null;
  isPublic: boolean;
  status: "draft" | "published" | "archived";
  productIds: number[];
};

const initialFormData: CatalogFormData = {
  name: "",
  description: "",
  coverImage: "",
  productType: "",
  customFields: "",
  customerId: null,
  isPublic: true,
  status: "draft",
  productIds: [],
};

type NewCustomerData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
};

const initialNewCustomerData: NewCustomerData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
};

export default function Catalogs() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState<string>("all");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>(initialNewCustomerData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  
  const { data: catalogs, isLoading } = trpc.catalogs.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: products } = trpc.products.list.useQuery({ isActive: true });
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  const uploadImageMutation = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      setFormData({ ...formData, coverImage: data.url });
      toast.success("Cover image uploaded successfully");
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload image");
      setIsUploading(false);
    },
  });

  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Customer created successfully");
      setFormData({ ...formData, customerId: data.id });
      setShowNewCustomerModal(false);
      setNewCustomerData(initialNewCustomerData);
      utils.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  const createMutation = trpc.catalogs.create.useMutation({
    onSuccess: (data) => {
      toast.success("Catalog created successfully");
      setShowModal(false);
      resetForm();
      utils.catalogs.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create catalog");
    },
  });

  const updateMutation = trpc.catalogs.update.useMutation({
    onSuccess: () => {
      toast.success("Catalog updated successfully");
      setShowModal(false);
      resetForm();
      utils.catalogs.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update catalog");
    },
  });

  const deleteMutation = trpc.catalogs.delete.useMutation({
    onSuccess: () => {
      toast.success("Catalog deleted successfully");
      setDeleteConfirm(null);
      utils.catalogs.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete catalog");
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setStep(1);
    setProductSearch("");
    setProductCategory("all");
    setShowCoverPicker(false);
    setNewCustomerData(initialNewCustomerData);
  };

  const handleEdit = async (catalogId: number) => {
    const catalog = catalogs?.find(c => c.catalog.id === catalogId);
    if (!catalog) return;

    const fullCatalog = await utils.catalogs.getById.fetch({ id: catalogId });
    if (!fullCatalog) return;

    setEditingId(catalogId);
    setFormData({
      name: fullCatalog.catalog.name || "",
      description: fullCatalog.catalog.description || "",
      coverImage: fullCatalog.catalog.coverImage || "",
      productType: fullCatalog.catalog.productType || "",
      customFields: fullCatalog.catalog.customFields || "",
      customerId: fullCatalog.catalog.customerId,
      isPublic: fullCatalog.catalog.isPublic ?? true,
      status: fullCatalog.catalog.status || "draft",
      productIds: fullCatalog.products?.map(p => p.product.id) || [],
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Catalog name is required");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      coverImage: formData.coverImage || undefined,
      productType: formData.productType || undefined,
      customFields: formData.customFields || undefined,
      customerId: formData.customerId,
      isPublic: formData.isPublic,
      status: formData.status,
      productIds: formData.productIds,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadImageMutation.mutate({
        base64,
        filename: file.name,
        contentType: file.type,
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateNewCustomer = () => {
    if (!newCustomerData.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!newCustomerData.phone.trim() && !newCustomerData.email.trim()) {
      toast.error("Please provide either phone or email");
      return;
    }

    createCustomerMutation.mutate({
      firstName: newCustomerData.firstName,
      lastName: newCustomerData.lastName || undefined,
      email: newCustomerData.email || undefined,
      phone: newCustomerData.phone || undefined,
      address: newCustomerData.address || undefined,
    });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = !productSearch || 
        p.product.name.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCategory === "all" || 
        p.product.categoryId?.toString() === productCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategory]);

  const toggleProduct = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const copyPreviewLink = (token: string) => {
    const link = `${window.location.origin}/preview/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Preview link copied to clipboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-emerald-500/20 text-emerald-400";
      case "draft": return "bg-amber-500/20 text-amber-400";
      case "archived": return "bg-zinc-500/20 text-zinc-400";
      default: return "bg-zinc-500/20 text-zinc-400";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Catalogs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage jewelry catalogs
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
          New Catalog
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search catalogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!catalogs || catalogs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No catalogs yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first catalog to get started</p>
          <Button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="gold-gradient text-primary-foreground border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Catalog
          </Button>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && catalogs && catalogs.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((item, index) => (
            <div
              key={item.catalog.id}
              className="group relative rounded-xl overflow-hidden bg-card border border-border transition-all duration-300 hover:shadow-lg animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Cover Image */}
              <div className="aspect-video relative bg-muted">
                {item.catalog.coverImage ? (
                  <img 
                    src={item.catalog.coverImage} 
                    alt={item.catalog.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Status Badge */}
                <Badge className={`absolute top-3 left-3 ${getStatusColor(item.catalog.status || 'draft')}`}>
                  {item.catalog.status}
                </Badge>
                
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(item.catalog.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {item.catalog.publicToken && (
                      <>
                        <DropdownMenuItem onClick={() => setLocation(`/preview/${item.catalog.publicToken || ''}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyPreviewLink(item.catalog.publicToken!)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setLocation(`/catalogs/${item.catalog.id}/comments`)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Comments
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteConfirm(item.catalog.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium text-foreground truncate">{item.catalog.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>{(item as any).productCount || 0} items</span>
                  {item.customer && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <Users className="h-4 w-4" />
                      <span className="truncate">{item.customer.firstName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && catalogs && catalogs.length > 0 && viewMode === 'list' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Products</TableHead>
                  <TableHead className="text-foreground">Customer</TableHead>
                  <TableHead className="text-foreground">Created</TableHead>
                  <TableHead className="text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogs.map((item) => (
                  <TableRow key={item.catalog.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {item.catalog.coverImage ? (
                            <img 
                              src={item.catalog.coverImage} 
                              alt={item.catalog.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{item.catalog.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.catalog.status || 'draft')}>
                        {item.catalog.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(item as any).productCount || 0} items
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.customer ? `${item.customer.firstName} ${item.customer.lastName || ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.catalog.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {item.catalog.publicToken && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setLocation(`/preview/${item.catalog.publicToken || ''}`)}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyPreviewLink(item.catalog.publicToken!)}
                            >
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item.catalog.id)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(item.catalog.id)}
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

      {/* Create/Edit Catalog Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Edit Catalog" : "Create New Catalog"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {step === 1 && "Enter the catalog details"}
              {step === 2 && "Select products to include"}
              {step === 3 && "Assign to a customer (optional)"}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 mx-1 transition-colors ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Catalog Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Bridal Collection 2024"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catalog description..."
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Cover Image</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {isUploading ? "Uploading..." : "Upload from Computer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCoverPicker(!showCoverPicker)}
                      className="text-xs"
                    >
                      {showCoverPicker ? "Hide Gallery" : "Choose from Gallery"}
                    </Button>
                  </div>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* Current cover image preview */}
                {formData.coverImage && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={formData.coverImage} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, coverImage: "" })}
                      className="absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {showCoverPicker && (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                    {COVER_IMAGES.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, coverImage: img.url });
                          setShowCoverPicker(false);
                        }}
                        className="aspect-video rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                
                <Input
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://... or upload/select from gallery"
                  className="bg-input border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productType" className="text-foreground">Product Type Tag</Label>
                  <Input
                    id="productType"
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    placeholder="e.g., Bridal, Diamond"
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customFields" className="text-foreground">Custom Fields (JSON)</Label>
                <Textarea
                  id="customFields"
                  value={formData.customFields}
                  onChange={(e) => setFormData({ ...formData, customFields: e.target.value })}
                  placeholder='{"field1": "value1", "field2": "value2"}'
                  className="bg-input border-border font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <Label className="text-foreground">Public Preview</Label>
                  <p className="text-xs text-muted-foreground">Allow anyone with the link to view this catalog</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>
            </div>
          )}

          {/* Step 2: Select Products */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>
                <Select value={productCategory} onValueChange={setProductCategory}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-input border-border">
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
              </div>

              <p className="text-sm text-muted-foreground">
                {formData.productIds.length} products selected
              </p>

              <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                {filteredProducts.map((item) => (
                  <button
                    key={item.product.id}
                    type="button"
                    onClick={() => toggleProduct(item.product.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                      formData.productIds.includes(item.product.id)
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-2 ring-muted-foreground/30'
                    }`}
                  >
                    {item.product.primaryImage ? (
                      <img 
                        src={item.product.primaryImage} 
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    {formData.productIds.includes(item.product.id) && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                      <p className="text-white text-xs truncate">{item.product.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Assign Customer */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-foreground">Assign to Customer (Optional)</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.customerId?.toString() || "none"} 
                    onValueChange={(v) => setFormData({ ...formData, customerId: v === "none" ? null : Number(v) })}
                  >
                    <SelectTrigger className="bg-input border-border flex-1">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No customer assigned</SelectItem>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.firstName} {customer.lastName} - {customer.email || customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add New
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-medium text-foreground">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground">{formData.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products:</span>
                    <span className="text-foreground">{formData.productIds.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-foreground capitalize">{formData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Public:</span>
                    <span className="text-foreground">{formData.isPublic ? "Yes" : "No"}</span>
                  </div>
                  {formData.customerId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="text-foreground">
                        {customers?.find(c => c.id === formData.customerId)?.firstName || "—"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : setShowModal(false)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step > 1 ? "Back" : "Cancel"}
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !formData.name.trim()) {
                    toast.error("Catalog name is required");
                    return;
                  }
                  setStep(step + 1);
                }}
                className="gold-gradient text-primary-foreground border-0"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                {editingId ? "Update Catalog" : "Create Catalog"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Modal */}
      <Dialog open={showNewCustomerModal} onOpenChange={setShowNewCustomerModal}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Customer</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new customer and automatically assign them to this catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newFirstName" className="text-foreground">First Name *</Label>
                <Input
                  id="newFirstName"
                  value={newCustomerData.firstName}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, firstName: e.target.value })}
                  placeholder="First name"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newLastName" className="text-foreground">Last Name</Label>
                <Input
                  id="newLastName"
                  value={newCustomerData.lastName}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, lastName: e.target.value })}
                  placeholder="Last name"
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPhone" className="text-foreground">Phone</Label>
              <Input
                id="newPhone"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                placeholder="+92 300 1234567"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-foreground">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                placeholder="customer@example.com"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAddress" className="text-foreground">Address</Label>
              <Textarea
                id="newAddress"
                value={newCustomerData.address}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                placeholder="Customer address..."
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewCustomerModal(false);
                setNewCustomerData(initialNewCustomerData);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewCustomer}
              disabled={createCustomerMutation.isPending}
              className="gold-gradient text-primary-foreground border-0"
            >
              {createCustomerMutation.isPending ? "Creating..." : "Create & Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Catalog</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this catalog? This action cannot be undone.
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
