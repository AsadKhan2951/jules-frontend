import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  MessageSquare,
  Check,
  ImageIcon,
  User
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function CatalogComments() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const catalogId = Number(params.id);

  const { data: catalog, isLoading } = trpc.catalogs.getById.useQuery(
    { id: catalogId },
    { enabled: !!catalogId }
  );

  const utils = trpc.useUtils();

  const markReadMutation = trpc.catalogs.markCommentRead.useMutation({
    onSuccess: () => {
      utils.catalogs.getById.invalidate({ id: catalogId });
      toast.success("Comment marked as read");
    },
  });

  const formatDate = (date: any) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Catalog not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/catalogs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalogs
        </Button>
      </div>
    );
  }

  const comments = catalog.comments || [];
  const unreadCount = comments.filter(c => !c.isRead).length;

  // Get product info for comments
  const getProductForComment = (productId: number | null) => {
    if (!productId) return null;
    return catalog.products?.find(p => p.product.id === productId);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/catalogs")} className="hover:bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Comments for "{catalog.catalog.name}"
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {comments.length} comments {unreadCount > 0 && (
              <span className="text-primary">({unreadCount} unread)</span>
            )}
          </p>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No comments yet</h3>
          <p className="text-sm text-muted-foreground">
            Share your catalog to start receiving feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment, index) => {
            const product = getProductForComment(comment.productId);
            return (
              <div
                key={comment.id}
                className={`relative rounded-xl bg-card border p-5 transition-all animate-fadeIn ${
                  comment.isRead 
                    ? 'border-border' 
                    : 'border-primary/30 bg-primary/5'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  {product && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      {product.product.primaryImage ? (
                        <img
                          src={product.product.primaryImage}
                          alt={product.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {comment.visitorName || "Anonymous"}
                          </span>
                          {!comment.isRead && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                              New
                            </span>
                          )}
                        </div>
                        {product && (
                          <p className="text-xs text-muted-foreground mt-1">
                            on {product.product.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                        {!comment.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markReadMutation.mutate({ id: comment.id })}
                            className="h-8 px-2 text-xs"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-foreground leading-relaxed">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
