import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/_core/LanguageContext";
import type { Lang } from "@/_core/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthLabels: Record<Lang, string[]> = {
  en: MONTHS,
  ru: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  uz: [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  processing: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"buy" | "orders">("buy");

  // Form state for "Купить" tab
  const [formStep, setFormStep] = useState<"form" | "address">("form");
  const [formData, setFormData] = useState({
    location: "",
    day: 26,
    month: "May",
    year: 2026,
    hour: 16,
    minute: 59,
    mainTitle: "",
    line1: "",
    line2: "",
    message: "",
    contactNumber: "",
    hideTime: false,
    deliveryAddress: "",
  });
  const [citySuggestions, setCitySuggestions] = useState<{
    display_name: string;
    lat: string;
    lon: string;
  }[]>([]);
  const [cityOptionMap, setCityOptionMap] = useState<Record<string, { lat: string; lon: string }>>({});
  const [isCitySearching, setIsCitySearching] = useState(false);
  const citySearchTimeout = useRef<number | null>(null);
  const [isCitySelected, setIsCitySelected] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const ordersQuery = trpc.orders.list.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();

  const statusLabels = {
    pending: t("status_pending"),
    processing: t("status_processing"),
    completed: t("status_completed"),
    cancelled: t("status_cancelled"),
  } as Record<string, string>;

  const getMonthLabel = (month: string) =>
    monthLabels[lang][MONTHS.indexOf(month)] ?? month;

  const requestCitySuggestions = async (city: string) => {
    if (!city.trim()) {
      setCitySuggestions([]);
      return;
    }

    setIsCitySearching(true);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("q", city);
      url.searchParams.set("limit", "5");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
        },
      });
      const results = (await response.json()) as Array<any>;
      if (!Array.isArray(results)) {
        setCitySuggestions([]);
        return;
      }

      const suggestions = results
        .filter((item) => item.display_name && item.lat && item.lon)
        .map((item) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.city_district || addr.county || addr.state || item.name || "";
          const country = addr.country || "";
          const formattedName = city && country
            ? (city.toLowerCase() === country.toLowerCase() ? country : `${city}, ${country}`)
            : (item.display_name || "");
          return {
            display_name: formattedName,
            lat: item.lat,
            lon: item.lon,
          };
        });

      const uniqueSuggestions: typeof suggestions = [];
      const seen = new Set<string>();
      for (const s of suggestions) {
        if (!seen.has(s.display_name)) {
          seen.add(s.display_name);
          uniqueSuggestions.push(s);
        }
      }

      setCitySuggestions(uniqueSuggestions);
      setCityOptionMap((prev) => {
        const next = { ...prev };
        uniqueSuggestions.forEach((item) => {
          next[item.display_name] = { lat: item.lat, lon: item.lon };
        });
        return next;
      });
    } catch (error) {
      console.error("City suggestion fetch failed", error);
      setCitySuggestions([]);
    } finally {
      setIsCitySearching(false);
    }
  };

  const geocodeCity = async (city: string) => {
    if (cityOptionMap[city]) {
      return cityOptionMap[city];
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", city);
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
        },
      });
      const results = (await response.json()) as Array<any>;
      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }
      const [first] = results;
      const coords = { lat: first.lat, lon: first.lon };
      setCityOptionMap((prev) => ({ ...prev, [city]: coords }));
      return coords;
    } catch (error) {
      console.error("City geocode failed", error);
      return null;
    }
  };

  const handleCityInput = (city: string) => {
    setFormData((prev) => ({ ...prev, location: city }));
    setIsCitySelected(false);
    if (citySearchTimeout.current) {
      window.clearTimeout(citySearchTimeout.current);
    }
    citySearchTimeout.current = window.setTimeout(() => {
      requestCitySuggestions(city);
    }, 180);
  };

  const selectCitySuggestion = (displayName: string) => {
    setFormData((prev) => ({ ...prev, location: displayName }));
    setCitySuggestions([]);
    setIsCitySelected(true);
  };

  useEffect(() => {
    return () => {
      if (citySearchTimeout.current) {
        window.clearTimeout(citySearchTimeout.current);
      }
    };
  }, []);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    if (!isCitySelected) {
      toast.error(t("location_required"));
      return;
    }
    if (!formData.mainTitle.trim()) {
      toast.error(t("main_title_required"));
      return;
    }
    if (!formData.line1.trim()) {
      toast.error(t("line1_required"));
      return;
    }
    if (!formData.line2.trim()) {
      toast.error(t("line2_required"));
      return;
    }
    setFormStep("address");
  };

  const handleSubmit = async () => {
    if (!formData.deliveryAddress.trim()) {
      toast.error(t("delivery_address_required"));
      return;
    }
    if (!formData.contactNumber || !formData.contactNumber.trim()) {
      toast.error(t("contact_number_required"));
      return;
    }

    const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
    const addressLower = formData.deliveryAddress.toLowerCase();
    const isTashkentAddress = tashkentKeywords.some((keyword) =>
      addressLower.includes(keyword)
    );

    if (!isTashkentAddress) {
      toast.error(t("tashkent_error"));
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrderMutation.mutateAsync({
        location: formData.location,
        day: formData.day,
        month: formData.month,
        year: formData.year,
        hour: formData.hour,
        minute: formData.minute,
        mainTitle: formData.mainTitle,
        line1: formData.line1,
        line2: formData.line2,
        message: formData.message || undefined,
        hideTime: formData.hideTime,
        deliveryAddress: formData.deliveryAddress,
        contactNumber: formData.contactNumber,
      });

      toast.success("Order placed successfully!");
      
      // Reset form
      setFormData({
        location: "",
        day: 26,
        month: "May",
        year: 2026,
        hour: 16,
        minute: 59,
        mainTitle: "",
        line1: "",
        line2: "",
        message: "",
        contactNumber: "",
        hideTime: false,
        deliveryAddress: "",
      });
      setIsCitySelected(false);
      setFormStep("form");
      
      // Refresh orders list
      ordersQuery.refetch();
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b border-border shadow-subtle sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-1 min-w-0">
            <Logo className="h-8 w-8 text-foreground" />
            <h1 className="text-2xl font-semibold text-foreground truncate md:block hidden">
              {t("title")}
            </h1>
            <h1 className="text-2xl font-semibold text-foreground truncate md:hidden">
              AS
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8">
            <motion.button
              onClick={() => {
                setTab("buy");
                setFormStep("form");
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                tab === "buy"
                  ? "text-foreground border-foreground"
                  : "text-subtle border-transparent hover:text-foreground"
              }`}
            >
              {t("tab_buy")}
            </motion.button>
            <motion.button
              onClick={() => setTab("orders")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                tab === "orders"
                  ? "text-foreground border-foreground"
                  : "text-subtle border-transparent hover:text-foreground"
              }`}
            >
              {t("tab_orders")}
            </motion.button>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3 justify-end min-w-0">
            <span className="text-sm text-subtle truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">
              {user.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button
                  className="px-3 py-2 rounded-lg border text-sm"
                  aria-label="Select language"
                >
                  {lang.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={6}>
                <DropdownMenuItem onSelect={() => setLang("ru")}>RU</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLang("en")}>EN</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLang("uz")}>UZ</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="h-9 px-4 text-sm rounded-lg"
            >
              {t("sign_out")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === "buy" ? (
            <motion.div
              key="buy-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* "Купить" Tab - Order Form */}
              <div className="space-y-8">
                <div>
                  <div className="mb-12">
                    <h2 className="text-3xl font-semibold text-foreground mb-2">
                      {t("create_order")}
                    </h2>
                    <p className="text-subtle">
                      {formStep === "form"
                        ? t("step_order_details")
                        : t("step_delivery_address")}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {formStep === "form" ? (
                      // Form Step
                      <motion.div
                        key="step-form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                        className="space-y-8 max-w-2xl"
                      >
                        {/* Location */}
                        <div className="relative">
                          <Label className="label-minimal mb-2 block">{t("location_label")}</Label>
                          <Input
                            id="cityInput"
                            value={formData.location}
                            onChange={(e) => handleCityInput(e.target.value)}
                            className="input-minimal"
                            placeholder={t("location_placeholder")}
                            autoComplete="off"
                          />
                          <p className="text-xs text-subtle mt-1">
                            {t("currently_available_tashkent")}
                          </p>

                          {citySuggestions.length > 0 && (
                            <div
                              id="suggestionsPanel"
                              className="absolute z-10 mt-2 w-full rounded-lg border border-border bg-white shadow-lg"
                            >
                              {citySuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.display_name}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                  onClick={() => selectCitySuggestion(suggestion.display_name)}
                                >
                                  {suggestion.display_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="label-minimal mb-2 block">{t("day")}</Label>
                            <Select
                              value={String(formData.day)}
                              onValueChange={(value) => handleFormChange("day", parseInt(value))}
                            >
                              <SelectTrigger className="w-full" size="default">
                                <SelectValue placeholder={t("day")} />
                              </SelectTrigger>
                              <SelectContent side="bottom">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                  <SelectItem key={d} value={d.toString()}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="label-minimal mb-2 block">{t("month")}</Label>
                            <Select
                              value={formData.month}
                              onValueChange={(value) => handleFormChange("month", value)}
                            >
                              <SelectTrigger className="w-full" size="default">
                                <SelectValue placeholder={t("month")} />
                              </SelectTrigger>
                              <SelectContent side="bottom">
                                {MONTHS.map((m, index) => (
                                  <SelectItem key={m} value={m}>
                                    {monthLabels[lang][index]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="label-minimal mb-2 block">{t("year")}</Label>
                            <Input
                              type="number"
                              value={formData.year}
                              onChange={(e) =>
                                handleFormChange("year", parseInt(e.target.value))
                              }
                              className="input-minimal"
                            />
                          </div>
                        </div>

                        {/* Time */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="label-minimal mb-2 block">{t("hour")}</Label>
                            <Select
                              value={String(formData.hour)}
                              onValueChange={(value) => handleFormChange("hour", parseInt(value))}
                            >
                              <SelectTrigger className="w-full" size="default">
                                <SelectValue placeholder={t("hour")} />
                              </SelectTrigger>
                              <SelectContent side="bottom">
                                {HOURS.map((h) => (
                                  <SelectItem key={h} value={h.toString()}>
                                    {String(h).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="label-minimal mb-2 block">{t("minute")}</Label>
                            <Select
                              value={String(formData.minute)}
                              onValueChange={(value) => handleFormChange("minute", parseInt(value))}
                            >
                              <SelectTrigger className="w-full" size="default">
                                <SelectValue placeholder={t("minute")} />
                              </SelectTrigger>
                              <SelectContent side="bottom">
                                {MINUTES.map((m) => (
                                  <SelectItem key={m} value={m.toString()}>
                                    {String(m).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Hide time option */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="hideTimeCheckbox"
                            checked={formData.hideTime}
                            onCheckedChange={(checked) =>
                              handleFormChange("hideTime", checked)
                            }
                          />
                          <Label htmlFor="hideTimeCheckbox" className="text-sm font-normal cursor-pointer select-none">
                            {t("hide_time_output")}
                          </Label>
                        </div>

                        {/* Main Title */}
                        <div>
                          <Label className="label-minimal mb-2 block">
                            {t("main_title_label")} *
                          </Label>
                          <Input
                            placeholder={t("main_title_placeholder")}
                            value={formData.mainTitle}
                            onChange={(e) =>
                              handleFormChange("mainTitle", e.target.value)
                            }
                            className="input-minimal"
                          />
                        </div>

                        {/* Line 1 */}
                        <div>
                          <Label className="label-minimal mb-2 block">
                            {t("line1_label")} *
                          </Label>
                          <Input
                            placeholder={t("line1_placeholder")}
                            value={formData.line1}
                            onChange={(e) => handleFormChange("line1", e.target.value)}
                            className="input-minimal"
                          />
                        </div>

                        {/* Line 2 */}
                        <div>
                          <Label className="label-minimal mb-2 block">
                            {t("line2_label")} *
                          </Label>
                          <Input
                            placeholder={t("line2_placeholder")}
                            value={formData.line2}
                            onChange={(e) => handleFormChange("line2", e.target.value)}
                            className="input-minimal"
                          />
                        </div>

                        {/* Message (Optional) */}
                        <div>
                          <Label className="label-minimal mb-2 block">
                            {t("message_optional")}
                          </Label>
                          <textarea
                            placeholder={t("message_placeholder")}
                            value={formData.message}
                            onChange={(e) =>
                              handleFormChange("message", e.target.value)
                            }
                            className="input-minimal w-full resize-none"
                            rows={3}
                          />
                        </div>

                        {/* Next Button */}
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={handleNext}
                            className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all"
                          >
                            {t("continue_to_address")}
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      // Address Step
                      <motion.div
                        key="step-address"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                        className="space-y-8 max-w-2xl"
                      >
                        {/* Delivery Address */}
                        <div>
                          <Label className="label-minimal mb-2 block">
                            {t("delivery_address")} *
                          </Label>
                          <textarea
                            placeholder={t("delivery_address_placeholder")}
                            value={formData.deliveryAddress}
                            onChange={(e) =>
                              handleFormChange("deliveryAddress", e.target.value)
                            }
                            className="input-minimal w-full resize-none"
                            rows={4}
                          />
                          <p className="text-xs text-subtle mt-1">
                            {t("delivery_address_hint")}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="label-minimal mb-2 block">{t("contact_number")}</Label>
                          <Input
                            value={formData.contactNumber}
                            onChange={(e) => handleFormChange("contactNumber", e.target.value)}
                            placeholder={t("contact_placeholder")}
                          />
                        </div>

                        {/* Order Summary */}
                        <div className="bg-secondary/30 rounded-lg p-6 space-y-3">
                          <h3 className="font-semibold text-foreground">
                            {t("order_summary")}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="text-subtle">{t("title_label")}:</span>{" "}
                              <span className="font-medium">{formData.mainTitle}</span>
                            </p>
                            <p>
                              <span className="text-subtle">{t("date_label")}:</span>{" "}
                              <span className="font-medium">
                                {formData.day} {getMonthLabel(formData.month)} {formData.year}
                              </span>
                            </p>
                            {!formData.hideTime && (
                              <p>
                                <span className="text-subtle">{t("time_label")}:</span>{" "}
                                <span className="font-medium">
                                  {String(formData.hour).padStart(2, "0")}:
                                  {String(formData.minute).padStart(2, "0")}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                            <Button
                              onClick={() => setFormStep("form")}
                              variant="outline"
                              className="w-full h-12 font-medium text-base rounded-lg"
                            >
                              {t("back")}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                            <Button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all disabled:opacity-50"
                            >
                              {isSubmitting ? t("placing_order") : t("place_order")}
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
        <motion.div
          key="orders-tab"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* "Заказы" Tab - Orders List */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-semibold text-foreground mb-1">
                  {t("your_orders")}
                </h2>
                <p className="text-subtle">
                  {t("track_manage_orders")}
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => {
                    setTab("buy");
                    setFormStep("form");
                  }}
                  className="h-11 px-6 bg-foreground text-white hover:bg-foreground/90 font-medium rounded-lg shadow-subtle transition-all"
                >
                  {t("new_order")}
                </Button>
              </motion.div>
            </div>

            {/* Orders List */}
            {ordersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6" />
              </div>
            ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
              <motion.div
                className="space-y-4"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
              >
                {ordersQuery.data.map((order: any) => (
                  <motion.div
                    key={order.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.15 }}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { type: "spring", stiffness: 300, damping: 24 },
                      },
                    }}
                    className="border border-border rounded-lg p-6 hover:shadow-soft transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {order.mainTitle}
                        </h3>
                        <p className="text-sm text-subtle mt-1">
                          {t("order_number")} #{order.id}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-subtle mb-1">{t("date_label")}</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.day} {getMonthLabel(order.month)} {order.year}
                        </p>
                      </div>
                      {order.hideTime === 0 && (
                        <div>
                          <p className="text-xs text-subtle mb-1">{t("time_label")}</p>
                          <p className="text-sm font-medium text-foreground">
                            {String(order.hour).padStart(2, "0")}:
                            {String(order.minute).padStart(2, "0")}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-subtle mb-1">{t("location_label")}</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-subtle mb-1">{t("created_label")}</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-subtle">{t("line1_label")}:</span>{" "}
                        <span className="text-foreground">{order.line1}</span>
                      </p>
                      <p>
                        <span className="text-subtle">{t("line2_label")}:</span>{" "}
                        <span className="text-foreground">{order.line2}</span>
                      </p>
                      {order.message && (
                        <p>
                          <span className="text-subtle">{t("message_label")}:</span>{" "}
                          <span className="text-foreground">
                            {order.message}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-subtle">{t("delivery_address")}:</span>{" "}
                        <span className="text-foreground">
                          {order.deliveryAddress}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-subtle mb-4">{t("no_orders_yet")}</p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => {
                      setTab("buy");
                      setFormStep("form");
                    }}
                    className="h-11 px-6 bg-foreground text-white hover:bg-foreground/90 font-medium rounded-lg shadow-subtle transition-all"
                  >
                    {t("create_first_order")}
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>
    </div>
  );
}
