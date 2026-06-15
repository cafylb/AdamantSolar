import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import type { Lang } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Check,
  Copy,
  CreditCard,
  Globe,
  LogOut,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const LANGS: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "uz", label: "O'zbekcha" },
];

const TOP_UP_AMOUNTS = ["50000", "100000", "150000"];

const PAYMENT_METHODS: {
  id: string;
  name: string;
  descKey: string;
  logo: string;
}[] = [
  {
    id: "click",
    name: "Click",
    descKey: "pm_click_desc",
    logo: "/payments/click.png",
  },
  {
    id: "uzum",
    name: "Uzum Bank",
    descKey: "pm_uzum_desc",
    logo: "/payments/uzum.png",
  },
  {
    id: "payme",
    name: "Payme",
    descKey: "pm_payme_desc",
    logo: "/payments/payme.png",
  },
];

const formatMoney = (value: number | string) => {
  const number = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(number)) {
    return "0";
  }

  return Math.floor(number).toLocaleString("de-DE");
};

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("50000");
  const [paymentMethod, setPaymentMethod] = useState<string>("uzum");

  const u = user as any;

  const { data: profile } = trpc.account.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const balance: number =
    typeof profile?.balance === "number"
      ? profile.balance
      : typeof u?.balance === "number"
        ? u.balance
        : 0;

  const refCode = profile?.referralCode ?? user?.email ?? "";

  const formattedBalance = `${formatMoney(balance)} ${t("currency")}`;

  const handleCopyRef = async () => {
    const link = `${window.location.origin}/?ref=${encodeURIComponent(refCode)}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("ref_link_copied"));
    } catch {
      toast.success(t("ref_link_copied"));
    }
  };

  const handleTopUp = () => {
    setTopUpOpen(true);
  };

  const handleContinuePayment = () => {
    const method =
      PAYMENT_METHODS.find((m) => m.id === paymentMethod) ?? PAYMENT_METHODS[0];

    toast.success(`${t("redirecting_to")} ${method.name}`);
    setTopUpOpen(false);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-foreground focus:text-foreground active:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("profile")}
          >
            <User className="h-4 w-4 !text-foreground" />
            <span>{t("profile")}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-72">
          <DropdownMenuLabel className="flex items-center gap-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none">Adamant User</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">{t("balance")}</p>
              <p className="text-sm font-semibold">{formattedBalance}</p>
            </div>

            <Button
              size="sm"
              className="ml-auto h-8 bg-black px-3 text-white hover:bg-zinc-800"
              onClick={(e) => {
                e.stopPropagation();
                handleTopUp();
              }}
            >
              <CreditCard className="mr-1 h-4 w-4 !text-white" />
              {t("top_up")}
            </Button>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleCopyRef();
            }}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            <span>{t("copy_ref_link")}</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer [&>svg:last-child]:!ml-2">
              <Globe className="mr-2 h-4 w-4" />
              <span>{t("language")}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {lang.toUpperCase()}
              </span>
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent>
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.value}
                  onClick={() => setLang(l.value)}
                  className="cursor-pointer justify-between gap-6"
                >
                  <span>{l.label}</span>
                  {lang === l.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={logout}
            className="cursor-pointer text-red-500 focus:text-red-500"
          >
            <LogOut className="mr-2 h-4 w-4 text-red-500" />
            <span>{t("sign_out")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("top_up_title")}</DialogTitle>
            <DialogDescription>{t("top_up_choose")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("payment_method")}
              </label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => {
                  const selected = paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 active:scale-[0.99] ${
                        selected
                          ? "border-2 border-foreground"
                          : "border border-border hover:border-foreground/30 hover:bg-accent"
                      }`}
                    >
                      <img
                        src={method.logo}
                        alt={method.name}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {method.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t(method.descKey)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("top_up_amount")}</label>
              <Input
                inputMode="numeric"
                value={topUpAmount}
                onChange={(e) =>
                  setTopUpAmount(e.target.value.replace(/\D/g, ""))
                }
                placeholder="50000"
              />
              <div className="grid grid-cols-3 gap-2">
                {TOP_UP_AMOUNTS.map((amount) => {
                  const selected = topUpAmount === amount;

                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopUpAmount(amount)}
                      className={`min-h-9 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                        selected
                          ? "border-black bg-black text-white hover:bg-zinc-800"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {formatMoney(amount)} {t("currency")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpOpen(false)}>
              {t("back")}
            </Button>
            <Button
              className="bg-black text-white hover:bg-zinc-800"
              onClick={handleContinuePayment}
            >
              {t("proceed_to_payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProfileMenu; 