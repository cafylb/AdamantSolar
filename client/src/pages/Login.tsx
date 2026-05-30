import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Reload the entire page to trigger auth check
        window.location.href = "/dashboard";
      } else {
        console.error("Login failed:", response.status);
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-foreground mb-2">
            {t("title")}
          </h1>
          <p className="text-subtle text-lg">
            {t("subtitle")}
          </p>
        </div>

        {/* Login Section */}
        <div className="space-y-4">
          <p className="text-center text-subtle text-sm mb-6">
            {t("login_description")}
          </p>

          {/* Login Button */}
          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all disabled:opacity-50"
              onClick={handleLogin}
              disabled={isLoading}
            >
            {isLoading ? (
              <>
                <Spinner className="w-5 h-5 mr-3" />
                {t("signing_in")}
              </>
            ) : (
              t("sign_in")
            )}
          </Button>
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-center text-subtle text-xs mt-8">
          {t("terms_notice")}
        </p>
      </div>
    </motion.div>
  );
}
