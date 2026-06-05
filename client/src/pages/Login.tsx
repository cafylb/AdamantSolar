import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleOAuthSignIn = (provider: "google" | "apple") => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-md text-base leading-7 text-slate-700 mt-4">
            {t("login_description")}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all"
            onClick={() => handleOAuthSignIn("google")}
          >
            Continue with Google
          </Button>

          <Button
            className="w-full h-12 border border-border text-foreground bg-transparent hover:bg-slate-100 font-medium text-base rounded-lg shadow-subtle transition-all"
            onClick={() => handleOAuthSignIn("apple")}
          >
            Continue with Apple
          </Button>
        </div>

        <p className="text-center text-subtle text-xs mt-8">
          {t("terms_notice")}
        </p>
      </div>
    </motion.div>
  );
}
