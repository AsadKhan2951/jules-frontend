import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  BookOpen, 
  Package, 
  Users, 
  ShoppingCart, 
  Factory,
  Coins,
  TrendingUp
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: goldPrice, isLoading: goldLoading, refetch: refetchGold } = trpc.goldPrice.getLatest.useQuery();
  const { data: todayGold } = trpc.goldPrice.getToday.useQuery();
  
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [price22k, setPrice22k] = useState("");
  const [price24k, setPrice24k] = useState("");
  
  const setGoldPriceMutation = trpc.goldPrice.set.useMutation({
    onSuccess: () => {
      toast.success("Gold price updated successfully");
      setShowGoldModal(false);
      refetchGold();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update gold price");
    },
  });


  // Show gold price modal if no price set for today
  useEffect(() => {
    if (!goldLoading && !todayGold) {
      setShowGoldModal(true);
    }
  }, [goldLoading, todayGold]);

  // Pre-fill with latest prices
  useEffect(() => {
    if (goldPrice) {
      setPrice22k(goldPrice.price22k || "");
      setPrice24k(goldPrice.price24k || "");
    }
  }, [goldPrice]);

  const handleSaveGoldPrice = () => {
    if (!price22k || !price24k) {
      toast.error("Please enter both 22k and 24k gold prices");
      return;
    }
    setGoldPriceMutation.mutate({ price22k, price24k });
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "Not set";
    return `PKR ${Number(price).toLocaleString()}`;
  };

  // Light mode: monochromatic icons, dark mode: colored icons
  const statCards = [
    {
      title: "Total Catalogs",
      value: stats?.catalogs ?? 0,
      icon: BookOpen,
    },
    {
      title: "Total Products",
      value: stats?.products ?? 0,
      icon: Package,
    },
    {
      title: "Total Customers",
      value: stats?.customers ?? 0,
      icon: Users,
    },
    {
      title: "Orders This Month",
      value: stats?.currentMonthOrders ?? 0,
      icon: ShoppingCart,
    },
    {
      title: "In Production",
      value: stats?.productionOrders ?? 0,
      icon: Factory,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back! Here's an overview of your jewelry business.
          </p>
        </div>
        <Button 
          onClick={() => setShowGoldModal(true)}
          className={isDark ? 'gold-gradient text-primary-foreground border-0' : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0 shadow-md shadow-amber-500/20'}
        >
          <Coins className="h-4 w-4 mr-2" />
          Set Gold Price
        </Button>
      </div>

      {/* Gold Price Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 ${
        isDark 
          ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20' 
          : 'bg-amber-50/50 border border-amber-200/50'
      }`}>
        {isDark && <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />}
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-primary/20' : 'bg-amber-100'}`}>
              <Coins className={`h-5 w-5 ${isDark ? 'text-primary' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today's Gold Price</h2>
              <p className="text-xs text-muted-foreground">Per Tola in PKR</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-card/50 backdrop-blur border border-border' : 'bg-white border border-amber-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">22K Gold</span>
                <TrendingUp className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-primary' : 'text-amber-600'}`}>
                {goldLoading ? "..." : formatPrice(goldPrice?.price22k)}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-card/50 backdrop-blur border border-border' : 'bg-white border border-amber-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">24K Gold</span>
                <TrendingUp className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-primary' : 'text-amber-600'}`}>
                {goldLoading ? "..." : formatPrice(goldPrice?.price24k)}
              </p>
            </div>
          </div>
          
          {goldPrice?.priceDate && (
            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {new Date(goldPrice.priceDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid - Light mode: clean white cards with monochromatic icons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <div
            key={stat.title}
            className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] ${
              isDark 
                ? 'bg-card border border-border/50 hover:shadow-lg hover:shadow-black/20' 
                : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {statsLoading ? "..." : stat.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-muted' : 'bg-gray-50'}`}>
                <stat.icon className={`h-5 w-5 ${isDark ? 'text-primary' : 'text-gray-600'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gold Price Modal */}
      <Dialog open={showGoldModal} onOpenChange={setShowGoldModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Coins className={`h-5 w-5 ${isDark ? 'text-primary' : 'text-amber-600'}`} />
              Set Today's Gold Price
            </DialogTitle>
            <DialogDescription>
              Enter the current gold prices per tola in PKR. This will affect all product pricing calculations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price22k" className="text-foreground">22K Gold Price (PKR/Tola)</Label>
              <Input
                id="price22k"
                type="number"
                placeholder="e.g., 245000"
                value={price22k}
                onChange={(e) => setPrice22k(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price24k" className="text-foreground">24K Gold Price (PKR/Tola)</Label>
              <Input
                id="price24k"
                type="number"
                placeholder="e.g., 265000"
                value={price24k}
                onChange={(e) => setPrice24k(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGoldModal(false)}>
              Not now
            </Button>
            <Button 
              onClick={handleSaveGoldPrice}
              disabled={setGoldPriceMutation.isPending}
              className={isDark ? 'gold-gradient text-primary-foreground border-0' : 'bg-gray-900 hover:bg-gray-800 text-white border-0'}
            >
              {setGoldPriceMutation.isPending ? "Saving..." : "Save Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


