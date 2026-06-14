import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import type { Lang } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Globe, LogOut, Plus, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const LANGS: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "uz", label: "O'zbekcha" },
];

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

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

  const refCode: string =
    profile?.referralCode ?? u?.referralCode ?? u?.openId ?? String(u?.id ?? "");

  const formattedBalance = `${balance.toLocaleString()} ${t("currency")}`;

  const handleCopyRef = async () => {
    const link = `${window.location.origin}/?ref=${refCode}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("ref_link_copied"));
    } catch {
      toast.message(link);
    }
  };

  const handleTopUp = () => {
    toast.info(t("top_up_soon"));
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("profile")}
        >
          <User className="h-5 w-5 text-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
        {/* Identity */}
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted shrink-0">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-none">
              Adamant User
            </p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Balance */}
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">{t("balance")}</p>
            <p className="text-sm font-semibold">{formattedBalance}</p>
          </div>

          <Button
            size="sm"
            className="ml-auto h-8 px-3"
            onClick={(e) => {
              e.stopPropagation();
              handleTopUp();
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("top_up")}
          </Button>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Referral */}
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

        {/* Language */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Globe className="mr-2 h-4 w-4" />
            <span>{t("language")}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {lang.toUpperCase()}
            </span>
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={lang}
              onValueChange={(v) => setLang(v as Lang)}
            >
              {LANGS.map((l) => (
                <DropdownMenuRadioItem
                  key={l.value}
                  value={l.value}
                  className="cursor-pointer"
                >
                  {l.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-red-500 focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          <span>{t("sign_out")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ProfileMenu;