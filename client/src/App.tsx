import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { QuickTasks } from "@/components/QuickTasks";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ImportProducts from "./pages/ImportProducts";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Customers from "./pages/Customers";
import Catalogs from "./pages/Catalogs";
import CatalogPreview from "./pages/CatalogPreview";
import CatalogComments from "./pages/CatalogComments";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import CustomerDetail from "./pages/CustomerDetail";
import CreateOrder from "./pages/CreateOrder";
import JulesBotChat from "./components/JulesBotChat";
import Finance from "./pages/Finance";
import AccessManagement from "./pages/AccessManagement";
import Invoices from "./pages/Invoices";
import Vendors from "./pages/Vendors";
import Backups from "./pages/Backups";
import StockVouchers from "./pages/StockVouchers";
import StockReports from "./pages/StockReports";
import RoleGate from "./components/RoleGate";
import { useAuth } from "./_core/hooks/useAuth";

/** Super Admin gets the full dashboard; staff get the everyday jobs as big buttons. */
function Home() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Dashboard />;
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose what you want to do. Everything is also in the menu on the left.</p>
      </div>
      <QuickTasks />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public route - Catalog Preview */}
      <Route path="/preview/:token" component={CatalogPreview} />
      
      {/* Protected routes with Dashboard Layout */}
      <Route path="/">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Home /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/products/import">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><ImportProducts /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/products">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><Products /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/collections">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><Collections /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/collections/:id">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><CollectionDetail /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/customers">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Customers /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/customers/:id">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><CustomerDetail /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/catalogs">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><Catalogs /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/catalogs/:id/comments">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><CatalogComments /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/orders">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Orders /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/orders/new">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><CreateOrder /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/orders/:id/edit">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><CreateOrder /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/orders/:id">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><OrderDetail /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/finance">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Finance /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/invoices">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Invoices /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/stock/:type?">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><StockVouchers /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/stock-reports">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><StockReports /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/backups">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><Backups /></RoleGate>
        </DashboardLayout>
      </Route>
      <Route path="/access">
        <DashboardLayout>
          <RoleGate allow={["admin"]}><AccessManagement /></RoleGate>
        </DashboardLayout>
      </Route>

      <Route path="/vendors">
        <DashboardLayout>
          <RoleGate allow={["admin", "operations_finance"]}><Vendors /></RoleGate>
        </DashboardLayout>
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component to conditionally render chat widget (hide on preview pages)
function ConditionalChatWidget() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Hide chat widget on public preview pages
  if (location.startsWith('/preview/') || user?.role !== "admin") {
    return null;
  }
  
  return <JulesBotChat />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <ConditionalChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
