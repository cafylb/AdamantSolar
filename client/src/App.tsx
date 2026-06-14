import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./_core/LanguageContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./_core/hooks/useAuth";
import { Spinner } from "./components/ui/spinner";

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // Special test route: bypass auth and show dashboard directly
  if (location === "/testversion") {
    return <Dashboard bypassAuth />;
  }

  // Redirect to login if not authenticated (default behaviour)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="*">
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  // Authenticated routes
  return (
    <Switch>
      <Route path="/buy">{() => <Dashboard />}</Route>
      <Route path="/orders">{() => <Dashboard />}</Route>
      <Route path="/login">
        <Redirect to="/buy" />
      </Route>
      <Route path="*">
        <Redirect to="/buy" />
      </Route>
    </Switch>
  );
}

// keep router simple — special case handled above

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
