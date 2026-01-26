import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Package, 
  Users, 
  BookOpen, 
  ShoppingCart,
  Gem,
  FolderOpen,
  Sun,
  Moon,
  Search,
  ChevronRight,
  Crown
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package, label: "Products", path: "/products" },
  { icon: BookOpen, label: "Catalogs", path: "/catalogs" },
  { icon: Users, label: "Customers", path: "/customers" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const utils = trpc.useUtils();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      setLoginPassword("");
      utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full animate-fadeIn">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <Gem className="h-12 w-12 text-primary" />
              <span className="text-4xl font-semibold tracking-tight text-foreground">
                JULES
              </span>
            </div>
            <h1 className="text-lg font-medium tracking-tight text-center text-muted-foreground">
              Jewelry Catalog Management
            </h1>
            <p className="text-sm text-muted-foreground/70 text-center max-w-sm">
              Sign in to manage your jewelry catalogs, products, and customers.
            </p>
          </div>
          <form
            className="w-full grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate({
                email: loginEmail.trim(),
                password: loginPassword,
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@company.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            {loginMutation.error ? (
              <p className="text-sm text-destructive">
                {loginMutation.error.message || "Login failed"}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full gold-gradient text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all border-0"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  // Fetch data for search and collections
  const { data: products } = trpc.products.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: catalogs } = trpc.catalogs.list.useQuery();
  const { data: collections } = trpc.collections.list.useQuery();

  // Filter results based on search query
  const filteredProducts = products?.filter(p => 
    p.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];

  const filteredCustomers = customers?.filter(c => 
    `${c.firstName} ${c.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  ).slice(0, 5) || [];

  const filteredCatalogs = catalogs?.filter(c => 
    c.catalog.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];

  const filteredCollections = collections?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Check if we're on a collection page
  const isCollectionActive = location.startsWith("/collections");
  const activeCollectionId = location.startsWith("/collections/") 
    ? parseInt(location.split("/collections/")[1]) 
    : null;

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Gem className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight text-lg text-foreground">
                    JULES
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-3">
            <SidebarMenu className="px-2 py-1 space-y-1">
              {/* Regular menu items before Shaikha Collection */}
              {menuItems.slice(0, 2).map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isActive 
                          ? 'bg-sidebar-accent text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Shaikha Collection with submenu */}
              <Collapsible
                open={collectionsOpen}
                onOpenChange={setCollectionsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isCollectionActive}
                      tooltip="Shaikha Collection"
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isCollectionActive 
                          ? 'bg-sidebar-accent text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <Crown className={`h-4 w-4 ${isCollectionActive ? "text-primary" : ""}`} />
                      <span className="font-medium">Shaikha Collection</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 ${collectionsOpen ? "rotate-90" : ""}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                      {/* All Collections link */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => setLocation("/collections")}
                          isActive={location === "/collections"}
                          className={`h-9 rounded-lg ${
                            location === "/collections"
                              ? 'bg-sidebar-accent/70 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30'
                          }`}
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-2" />
                          <span className="text-sm">All Collections</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      
                      {/* Individual collections */}
                      {collections?.map((collection) => (
                        <SidebarMenuSubItem key={collection.id}>
                          <SidebarMenuSubButton
                            onClick={() => setLocation(`/collections/${collection.id}`)}
                            isActive={activeCollectionId === collection.id}
                            className={`h-9 rounded-lg ${
                              activeCollectionId === collection.id
                                ? 'bg-sidebar-accent/70 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30'
                            }`}
                          >
                            <span className="text-sm truncate">{collection.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground/70">
                              {collection.productCount || 0}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Rest of menu items after Shaikha Collection */}
              {menuItems.slice(2).map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isActive 
                          ? 'bg-sidebar-accent text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Top Header Bar with Search and Theme Toggle */}
        <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-card" />
            )}
            {/* Global Search Bar */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-muted-foreground text-sm min-w-[200px] md:min-w-[300px]"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </Button>
          </div>
        </div>

        {/* Command Dialog for Search */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput 
            placeholder="Search products, customers, catalogs..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {filteredProducts.length > 0 && (
              <CommandGroup heading="Products">
                {filteredProducts.map((product) => (
                  <CommandItem
                    key={`product-${product.product.id}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setLocation("/products");
                    }}
                    className="flex items-center gap-3"
                  >
                    {product.product.primaryImage ? (
                      <img src={product.product.primaryImage} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        PKR {Number(product.product.basePrice || 0).toLocaleString()}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredCustomers.length > 0 && (
              <CommandGroup heading="Customers">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={`customer-${customer.id}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setLocation(`/customers/${customer.id}`);
                    }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {customer.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {customer.firstName} {customer.lastName || ''}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.email || customer.phone || '-'}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredCatalogs.length > 0 && (
              <CommandGroup heading="Catalogs">
                {filteredCatalogs.map((catalog) => (
                  <CommandItem
                    key={`catalog-${catalog.catalog.id}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setLocation("/catalogs");
                    }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{catalog.catalog.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {catalog.catalog.status || 'Draft'}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredCollections.length > 0 && (
              <CommandGroup heading="Collections">
                {filteredCollections.map((collection) => (
                  <CommandItem
                    key={`collection-${collection.id}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setLocation(`/collections/${collection.id}`);
                    }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{collection.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collection.productCount || 0} items
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>

        <main className="flex-1 p-6 bg-background min-h-[calc(100vh-3.5rem)] overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
