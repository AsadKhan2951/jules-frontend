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
  TrendingUp,
  Bot,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sun,
  CloudSun,
  BarChart3
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// Custom event to open chat widget
const openJulesBotChat = () => {
  window.dispatchEvent(new CustomEvent('openJulesBotChat'));
};

export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: goldPrice, isLoading: goldLoading, refetch: refetchGold } = trpc.goldPrice.getLatest.useQuery();
  const { data: todayGold } = trpc.goldPrice.getToday.useQuery();
  const { data: greeting, isLoading: greetingLoading, refetch: refetchGreeting } = trpc.julesBot.getGreeting.useQuery();
  
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [price22k, setPrice22k] = useState("");
  const [price24k, setPrice24k] = useState("");
  const [currentBulletin, setCurrentBulletin] = useState(0);
  
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

  // Parse greeting into bulletins
  const parseBulletins = useCallback(() => {
    if (!greeting?.greeting) return [];
    
    const text = greeting.greeting;
    const bulletins = [];
    
    // Extract market update
    const marketMatch = text.match(/(?:gold market|gold price|market|22K|24K)[^.!]*[.!]/gi);
    if (marketMatch) {
      bulletins.push({
        icon: TrendingUp,
        title: "Gold Market",
        content: marketMatch[0].trim(),
      });
    }
    
    // Extract weather
    const weatherMatch = text.match(/(?:weather|sunny|cloudy|warm|hot|pleasant|temperature|°C)[^.!]*[.!]/gi);
    if (weatherMatch) {
      bulletins.push({
        icon: Sun,
        title: "Karachi Weather",
        content: weatherMatch[0].trim(),
      });
    }
    
    // Business stats bulletin
    bulletins.push({
      icon: BarChart3,
      title: "Business Snapshot",
      content: `${stats?.products || 0} products, ${stats?.customers || 0} customers, ${stats?.currentMonthOrders || 0} orders this month`,
    });
    
    // Extract tip
    const tipMatch = text.match(/(?:tip|suggestion|recommend|consider)[^.!]*[.!]/gi);
    if (tipMatch) {
      bulletins.push({
        icon: Sparkles,
        title: "Today's Tip",
        content: tipMatch[0].trim(),
      });
    }
    
    return bulletins.length > 0 ? bulletins : [{
      icon: Bot,
      title: "Welcome",
      content: "Welcome to JULES! Your jewelry catalog management assistant.",
    }];
  }, [greeting, stats]);

  const bulletins = parseBulletins();

  // Auto-rotate bulletins
  useEffect(() => {
    if (bulletins.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBulletin((prev) => (prev + 1) % bulletins.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bulletins.length]);

  const nextBulletin = () => {
    setCurrentBulletin((prev) => (prev + 1) % bulletins.length);
  };

  const prevBulletin = () => {
    setCurrentBulletin((prev) => (prev - 1 + bulletins.length) % bulletins.length);
  };

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

  const CurrentIcon = bulletins[currentBulletin]?.icon || Bot;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* JulesBot Compact Greeting Banner */}
      <div className={`relative overflow-hidden rounded-xl border ${
        isDark 
          ? 'bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border-violet-500/20' 
          : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 border-purple-400/30 shadow-lg'
      }`}>
        <div className="relative flex items-center gap-4 p-4">
          {/* Bot Icon */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className={`p-2.5 rounded-xl shadow-lg ${
                isDark 
                  ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/20' 
                  : 'bg-white/20 backdrop-blur-sm shadow-white/10'
              }`}>
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className={`absolute -top-0.5 -right-0.5 p-0.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          </div>
          
          {/* Bulletin Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${isDark ? 'text-foreground' : 'text-white'}`}>JulesBot</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-white/20 text-white/90'
              }`}>AI</span>
              {greetingLoading && (
                <RefreshCw className={`h-3 w-3 animate-spin ${isDark ? 'text-violet-400' : 'text-white/70'}`} />
              )}
            </div>
            
            {/* Sliding Bulletin */}
            <div className="relative h-6 overflow-hidden">
              {bulletins.map((bulletin, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex items-center gap-2 transition-all duration-500 ${
                    index === currentBulletin 
                      ? 'opacity-100 translate-x-0' 
                      : index < currentBulletin 
                        ? 'opacity-0 -translate-x-full' 
                        : 'opacity-0 translate-x-full'
                  }`}
                >
                  <bulletin.icon className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-violet-400' : 'text-white/80'}`} />
                  <span className={`text-xs truncate ${isDark ? 'text-muted-foreground' : 'text-white/80'}`}>
                    <span className={`font-medium ${isDark ? 'text-violet-300' : 'text-white'}`}>{bulletin.title}:</span>{' '}
                    {bulletin.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation & CTA */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bulletin Navigation */}
            {bulletins.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={prevBulletin}
                  className={`p-1 rounded-md transition-colors ${
                    isDark ? 'hover:bg-white/10 text-muted-foreground hover:text-foreground' : 'hover:bg-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex gap-1">
                  {bulletins.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBulletin(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        index === currentBulletin 
                          ? isDark ? 'bg-violet-400 w-3' : 'bg-white w-3'
                          : isDark ? 'bg-white/20 hover:bg-white/40' : 'bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextBulletin}
                  className={`p-1 rounded-md transition-colors ${
                    isDark ? 'hover:bg-white/10 text-muted-foreground hover:text-foreground' : 'hover:bg-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {/* Divider */}
            <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-white/20'}`} />
            
            {/* CTA Button */}
            <Button
              onClick={openJulesBotChat}
              size="sm"
              className={`gap-1.5 ${
                isDark 
                  ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border-violet-500/30' 
                  : 'bg-white hover:bg-white/90 text-gray-900 border-transparent shadow-sm'
              }`}
              variant="outline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask JulesBot</span>
            </Button>
            
            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchGreeting()}
              disabled={greetingLoading}
              className={`h-8 w-8 ${isDark ? 'text-muted-foreground hover:text-foreground' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${greetingLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

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
