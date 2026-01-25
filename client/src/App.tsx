import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Customers from "./pages/Customers";
import Catalogs from "./pages/Catalogs";
import CatalogPreview from "./pages/CatalogPreview";
import CatalogComments from "./pages/CatalogComments";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import CustomerDetail from "./pages/CustomerDetail";
import JulesBotChat from "./components/JulesBotChat";

function Router() {
  return (
    <Switch>
      {/* Public route - Catalog Preview */}
      <Route path="/preview/:token" component={CatalogPreview} />
      
      {/* Protected routes with Dashboard Layout */}
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/products">
        <DashboardLayout>
          <Products />
        </DashboardLayout>
      </Route>
      <Route path="/collections">
        <DashboardLayout>
          <Collections />
        </DashboardLayout>
      </Route>
      <Route path="/collections/:id">
        <DashboardLayout>
          <CollectionDetail />
        </DashboardLayout>
      </Route>
      <Route path="/customers">
        <DashboardLayout>
          <Customers />
        </DashboardLayout>
      </Route>
      <Route path="/customers/:id">
        <DashboardLayout>
          <CustomerDetail />
        </DashboardLayout>
      </Route>
      <Route path="/catalogs">
        <DashboardLayout>
          <Catalogs />
        </DashboardLayout>
      </Route>
      <Route path="/catalogs/:id/comments">
        <DashboardLayout>
          <CatalogComments />
        </DashboardLayout>
      </Route>
      <Route path="/orders">
        <DashboardLayout>
          <Orders />
        </DashboardLayout>
      </Route>
      <Route path="/orders/:id">
        <DashboardLayout>
          <OrderDetail />
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
  
  // Hide chat widget on public preview pages
  if (location.startsWith('/preview/')) {
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
