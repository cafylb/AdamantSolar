import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/buy");
    }
  }, [isAuthenticated, navigate]);

  const handleOAuthSignIn = (provider: "google" | "apple") => {
    const ref = localStorage.getItem("referralName");

    const query =
      ref && /^[a-zA-Z0-9@._+-]{1,320}$/.test(ref)
        ? `?ref=${encodeURIComponent(ref)}`
        : "";

    window.location.href = `/api/auth/${provider}${query}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md anim-fade-in">
        <div className="text-center mb-12 anim-fade-up">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            {t("title")}
          </h1>

          <p className="mx-auto max-w-md text-base leading-7 text-slate-700 mt-4">
            {t("login_description")}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all anim-fade-up anim-delay-2"
            onClick={() => handleOAuthSignIn("google")}
          >
            Continue with Google
          </Button>

          <Button
            className="w-full h-12 border border-border text-foreground bg-transparent hover:bg-slate-100 font-medium text-base rounded-lg shadow-subtle transition-all anim-fade-up anim-delay-3"
            onClick={() => handleOAuthSignIn("apple")}
          >
            Continue with Apple
          </Button>
        </div>

        <p className="text-center text-subtle text-xs mt-8 anim-fade-in anim-delay-4">
          {t("terms_notice")}
        </p>
      </div>
    </div>
  );
}