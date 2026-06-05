import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-foreground mb-2">
            Adamant Solar
          </h1>
          <p className="text-subtle text-lg">
            Create your custom solar panel order
          </p>
        </div>

        {/* Login Section */}
        <div className="space-y-4">
          <p className="text-center text-subtle text-sm mb-6">
            Sign in to get started
          </p>

          {/* Google OAuth Button */}
          <a href={getLoginUrl()} className="block">
            <Button
              className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all"
              onClick={e => {
                e.preventDefault();
                window.location.href = getLoginUrl();
              }}
            >
              <svg
                className="w-5 h-5 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </a>

          {/* Apple OAuth Button */}
          <a href={getLoginUrl()} className="block">
            <Button
              className="w-full h-12 bg-black text-white hover:bg-black/90 font-medium text-base rounded-lg shadow-subtle transition-all"
              onClick={e => {
                e.preventDefault();
                window.location.href = getLoginUrl();
              }}
            >
              <svg
                className="w-5 h-5 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.05 13.5c-.91 0-1.82.55-2.25 1.51.5.38 1.03.82 1.44 1.41.41.59.75 1.18 1.01 1.76.52-1.45.52-2.68 0-4.68zm-5.5 0c-.91 0-1.82.55-2.25 1.51.5.38 1.03.82 1.44 1.41.41.59.75 1.18 1.01 1.76.52-1.45.52-2.68 0-4.68zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              Continue with Apple
            </Button>
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-subtle text-xs mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
