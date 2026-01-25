import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Heart, 
  MessageSquare, 
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  Gem,
  ImageIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useParams } from "wouter";

export default function CatalogPreview() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  
  const [visitorId, setVisitorId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: catalog, isLoading, refetch } = trpc.catalogs.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const likeMutation = trpc.catalogs.like.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const commentMutation = trpc.catalogs.comment.useMutation({
    onSuccess: () => {
      toast.success("Comment submitted successfully");
      setShowCommentModal(false);
      setCommentName("");
      setCommentText("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit comment");
    },
  });

  // Generate or retrieve visitor ID
  useEffect(() => {
    let id = localStorage.getItem("jules_visitor_id");
    if (!id) {
      id = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("jules_visitor_id", id);
    }
    setVisitorId(id);
  }, []);

  const isLiked = (productId: number) => {
    return catalog?.likes?.some(
      (like) => like.productId === productId && like.visitorId === visitorId
    );
  };

  const getLikeCount = (productId: number) => {
    return catalog?.likes?.filter((like) => like.productId === productId).length || 0;
  };

  const handleLike = (productId: number) => {
    if (!catalog?.catalog.id) return;
    likeMutation.mutate({
      catalogId: catalog.catalog.id,
      productId,
      visitorId,
    });
  };

  const handleComment = () => {
    if (!catalog?.catalog.id || !commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    commentMutation.mutate({
      catalogId: catalog.catalog.id,
      productId: selectedProduct?.product.id,
      visitorName: commentName || "Anonymous",
      comment: commentText,
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (lightboxIndex === null || !catalog?.products) return;
    const total = catalog.products.length;
    if (direction === "prev") {
      setLightboxIndex((lightboxIndex - 1 + total) % total);
    } else {
      setLightboxIndex((lightboxIndex + 1) % total);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading catalog...</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center mx-auto mb-4">
            <Gem className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Catalog Not Found</h1>
          <p className="text-muted-foreground">This catalog may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                <Gem className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{catalog.catalog.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {catalog.products?.length || 0} items
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProduct(null);
                setShowCommentModal(true);
              }}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Leave Feedback
            </Button>
          </div>
          {catalog.catalog.description && (
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              {catalog.catalog.description}
            </p>
          )}
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {catalog.products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No items in this catalog</h3>
            <p className="text-sm text-muted-foreground">Check back later for updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {catalog.products?.map((item, index) => (
              <div
                key={item.product.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-card cursor-pointer animate-fadeIn"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => openLightbox(index)}
              >
                {item.product.primaryImage ? (
                  <img
                    src={item.product.primaryImage}
                    alt={item.product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Gem className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-medium text-sm truncate">{item.product.name}</p>
                    {item.product.basePrice && (
                      <p className="text-white/80 text-xs">
                        PKR {Number(item.product.basePrice).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Like Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(item.product.id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/60"
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isLiked(item.product.id)
                        ? "fill-rose-500 text-rose-500"
                        : "text-white"
                    }`}
                  />
                </button>

                {/* Like Count */}
                {getLikeCount(item.product.id) > 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-current" />
                    {getLikeCount(item.product.id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && catalog.products && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fadeIn">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Navigation */}
          <button
            onClick={() => navigateLightbox("prev")}
            className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => navigateLightbox("next")}
            className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          {/* Image */}
          <div className="max-w-4xl max-h-[80vh] px-16">
            {catalog.products[lightboxIndex]?.product.primaryImage ? (
              <img
                src={catalog.products[lightboxIndex].product.primaryImage}
                alt={catalog.products[lightboxIndex].product.name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <div className="w-96 h-96 flex items-center justify-center bg-card rounded-lg">
                <Gem className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto flex items-end justify-between">
              <div>
                <h3 className="text-white text-xl font-semibold">
                  {catalog.products[lightboxIndex]?.product.name}
                </h3>
                {catalog.products[lightboxIndex]?.product.basePrice && (
                  <p className="text-white/80 text-lg mt-1">
                    PKR {Number(catalog.products[lightboxIndex].product.basePrice).toLocaleString()}
                  </p>
                )}
                {catalog.products[lightboxIndex]?.product.description && (
                  <p className="text-white/60 text-sm mt-2 max-w-xl">
                    {catalog.products[lightboxIndex].product.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLike(catalog.products![lightboxIndex].product.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    isLiked(catalog.products![lightboxIndex].product.id)
                      ? "bg-rose-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked(catalog.products![lightboxIndex].product.id) ? "fill-current" : ""}`} />
                  {getLikeCount(catalog.products![lightboxIndex].product.id) || "Like"}
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(catalog.products![lightboxIndex]);
                    setShowCommentModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  Comment
                </button>
              </div>
            </div>
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
            {lightboxIndex + 1} / {catalog.products.length}
          </div>
        </div>
      )}

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedProduct ? `Comment on ${selectedProduct.product.name}` : "Leave Feedback"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Name (Optional)</label>
              <Input
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Anonymous"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Comment *</label>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                className="bg-input border-border"
              />
            </div>
            <Button
              onClick={handleComment}
              disabled={commentMutation.isPending || !commentText.trim()}
              className="w-full gold-gradient text-primary-foreground border-0"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Comment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gem className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">JULES</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Jewelry Catalog Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
