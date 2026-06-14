import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./_core/LanguageContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./_core/hooks/useAuth";
import { Spinner } from "./components/ui/spinner";
import { useEffect } from "react";
import {
  VIEW_TRANSITION_DURATION_MS,
  VIEW_TRANSITION_MOBILE_DURATION_MS,
} from "./const";

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (location === "/testversion") {
    return <Dashboard bypassAuth />;
  }

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

function App() {
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--view-transition-duration",
      `${VIEW_TRANSITION_DURATION_MS}ms`
    );
    document.documentElement.style.setProperty(
      "--view-transition-mobile-duration",
      `${VIEW_TRANSITION_MOBILE_DURATION_MS}ms`
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (!ref || !/^[a-zA-Z0-9@._+-]{1,320}$/.test(ref)) {
      return;
    }

    fetch(`/api/ref/click/${encodeURIComponent(ref)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.counted) {
          localStorage.setItem("referralName", ref);
        }
      })
      .catch(() => {});
  }, []);

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