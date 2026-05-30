import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  processing: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"buy" | "orders">("buy");

  // Form state for "Купить" tab
  const [formStep, setFormStep] = useState<"form" | "address">("form");
  const [formData, setFormData] = useState({
    location: "Tashkent",
    day: 26,
    month: "May",
    year: 2026,
    hour: 16,
    minute: 59,
    mainTitle: "",
    line1: "",
    line2: "",
    message: "",
    hideTime: false,
    deliveryAddress: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const ordersQuery = trpc.orders.list.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();

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
    if (!formData.mainTitle.trim()) {
      toast.error("Main title is required");
      return;
    }
    if (!formData.line1.trim()) {
      toast.error("Line 1 is required");
      return;
    }
    if (!formData.line2.trim()) {
      toast.error("Line 2 is required");
      return;
    }
    setFormStep("address");
  };

  const handleSubmit = async () => {
    if (!formData.deliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
    const addressLower = formData.deliveryAddress.toLowerCase();
    const isTashkentAddress = tashkentKeywords.some((keyword) =>
      addressLower.includes(keyword)
    );

    if (!isTashkentAddress) {
      toast.error(
        "Delivery address must be in Tashkent. Please provide a valid Tashkent address."
      );
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
      });

      toast.success("Order placed successfully!");
      
      // Reset form
      setFormData({
        location: "Tashkent",
        day: 26,
        month: "May",
        year: 2026,
        hour: 16,
        minute: 59,
        mainTitle: "",
        line1: "",
        line2: "",
        message: "",
        hideTime: false,
        deliveryAddress: "",
      });
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Adamant Solar
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                setTab("buy");
                setFormStep("form");
              }}
              className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                tab === "buy"
                  ? "text-foreground border-foreground"
                  : "text-subtle border-transparent hover:text-foreground"
              }`}
            >
              Купить
            </button>
            <button
              onClick={() => setTab("orders")}
              className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                tab === "orders"
                  ? "text-foreground border-foreground"
                  : "text-subtle border-transparent hover:text-foreground"
              }`}
            >
              Заказы
            </button>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-subtle">{user.email}</span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="h-9 px-4 text-sm rounded-lg"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {tab === "buy" ? (
          // "Купить" Tab - Order Form
          <div>
            <div className="mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-2">
                Create Your Order
              </h2>
              <p className="text-subtle">
                {formStep === "form"
                  ? "Step 1: Order Details"
                  : "Step 2: Delivery Address"}
              </p>
            </div>

            {formStep === "form" ? (
              // Form Step
              <div className="space-y-8 max-w-2xl">
                {/* Location */}
                <div>
                  <Label className="label-minimal mb-2 block">Location</Label>
                  <Input
                    disabled
                    value="Tashkent"
                    className="input-minimal bg-muted"
                  />
                  <p className="text-xs text-subtle mt-1">
                    Currently available in Tashkent only
                  </p>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="label-minimal mb-2 block">Day</Label>
                    <select
                      value={formData.day}
                      onChange={(e) =>
                        handleFormChange("day", parseInt(e.target.value))
                      }
                      className="input-minimal w-full"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="label-minimal mb-2 block">Month</Label>
                    <select
                      value={formData.month}
                      onChange={(e) =>
                        handleFormChange("month", e.target.value)
                      }
                      className="input-minimal w-full"
                    >
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="label-minimal mb-2 block">Year</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) =>
                        handleFormChange("year", parseInt(e.target.value))
                      }
                      className="input-minimal"
                    />
                  </div>

                  <div>
                    <Label className="label-minimal mb-2 block">
                      Hide time on output
                    </Label>
                    <div className="flex items-center h-10">
                      <Checkbox
                        checked={formData.hideTime}
                        onCheckedChange={(checked) =>
                          handleFormChange("hideTime", checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="label-minimal mb-2 block">Hour</Label>
                    <select
                      value={formData.hour}
                      onChange={(e) =>
                        handleFormChange("hour", parseInt(e.target.value))
                      }
                      className="input-minimal w-full"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="label-minimal mb-2 block">Minute</Label>
                    <select
                      value={formData.minute}
                      onChange={(e) =>
                        handleFormChange("minute", parseInt(e.target.value))
                      }
                      className="input-minimal w-full"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Title */}
                <div>
                  <Label className="label-minimal mb-2 block">
                    Main Title *
                  </Label>
                  <Input
                    placeholder="e.g., Written in the stars"
                    value={formData.mainTitle}
                    onChange={(e) =>
                      handleFormChange("mainTitle", e.target.value)
                    }
                    className="input-minimal"
                  />
                </div>

                {/* Line 1 */}
                <div>
                  <Label className="label-minimal mb-2 block">Line 1 *</Label>
                  <Input
                    placeholder="e.g., The starry sky over"
                    value={formData.line1}
                    onChange={(e) => handleFormChange("line1", e.target.value)}
                    className="input-minimal"
                  />
                </div>

                {/* Line 2 */}
                <div>
                  <Label className="label-minimal mb-2 block">Line 2 *</Label>
                  <Input
                    placeholder="e.g., Your location name"
                    value={formData.line2}
                    onChange={(e) => handleFormChange("line2", e.target.value)}
                    className="input-minimal"
                  />
                </div>

                {/* Message (Optional) */}
                <div>
                  <Label className="label-minimal mb-2 block">
                    Message{" "}
                    <span className="text-subtle text-xs">(Optional)</span>
                  </Label>
                  <textarea
                    placeholder="Add an optional message..."
                    value={formData.message}
                    onChange={(e) =>
                      handleFormChange("message", e.target.value)
                    }
                    className="input-minimal w-full resize-none"
                    rows={3}
                  />
                </div>

                {/* Next Button */}
                <Button
                  onClick={handleNext}
                  className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all"
                >
                  Continue to Address
                </Button>
              </div>
            ) : (
              // Address Step
              <div className="space-y-8 max-w-2xl">
                {/* Delivery Address */}
                <div>
                  <Label className="label-minimal mb-2 block">
                    Delivery Address *
                  </Label>
                  <textarea
                    placeholder="Enter your delivery address in Tashkent..."
                    value={formData.deliveryAddress}
                    onChange={(e) =>
                      handleFormChange("deliveryAddress", e.target.value)
                    }
                    className="input-minimal w-full resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-subtle mt-1">
                    Please provide a complete address in Tashkent for delivery
                  </p>
                </div>

                {/* Order Summary */}
                <div className="bg-secondary/30 rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-foreground">
                    Order Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-subtle">Title:</span>{" "}
                      <span className="font-medium">{formData.mainTitle}</span>
                    </p>
                    <p>
                      <span className="text-subtle">Date:</span>{" "}
                      <span className="font-medium">
                        {formData.day} {formData.month} {formData.year}
                      </span>
                    </p>
                    {!formData.hideTime && (
                      <p>
                        <span className="text-subtle">Time:</span>{" "}
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
                  <Button
                    onClick={() => setFormStep("form")}
                    variant="outline"
                    className="flex-1 h-12 font-medium text-base rounded-lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-foreground text-white hover:bg-foreground/90 font-medium text-base rounded-lg shadow-subtle transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // "Заказы" Tab - Orders List
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-semibold text-foreground mb-1">
                  Your Orders
                </h2>
                <p className="text-subtle">
                  Track and manage your solar panel orders
                </p>
              </div>
              <Button
                onClick={() => {
                  setTab("buy");
                  setFormStep("form");
                }}
                className="h-11 px-6 bg-foreground text-white hover:bg-foreground/90 font-medium rounded-lg shadow-subtle transition-all"
              >
                New Order
              </Button>
            </div>

            {/* Orders List */}
            {ordersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6" />
              </div>
            ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
              <div className="space-y-4">
                {ordersQuery.data.map((order) => (
                  <div
                    key={order.id}
                    className="border border-border rounded-lg p-6 hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {order.mainTitle}
                        </h3>
                        <p className="text-sm text-subtle mt-1">
                          Order #{order.id}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-subtle mb-1">Date</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.day} {order.month} {order.year}
                        </p>
                      </div>
                      {order.hideTime === 0 && (
                        <div>
                          <p className="text-xs text-subtle mb-1">Time</p>
                          <p className="text-sm font-medium text-foreground">
                            {String(order.hour).padStart(2, "0")}:
                            {String(order.minute).padStart(2, "0")}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-subtle mb-1">Location</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-subtle mb-1">Created</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-subtle">Line 1:</span>{" "}
                        <span className="text-foreground">{order.line1}</span>
                      </p>
                      <p>
                        <span className="text-subtle">Line 2:</span>{" "}
                        <span className="text-foreground">{order.line2}</span>
                      </p>
                      {order.message && (
                        <p>
                          <span className="text-subtle">Message:</span>{" "}
                          <span className="text-foreground">
                            {order.message}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-subtle">Delivery Address:</span>{" "}
                        <span className="text-foreground">
                          {order.deliveryAddress}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-subtle mb-4">No orders yet</p>
                <Button
                  onClick={() => {
                    setTab("buy");
                    setFormStep("form");
                  }}
                  className="h-11 px-6 bg-foreground text-white hover:bg-foreground/90 font-medium rounded-lg shadow-subtle transition-all"
                >
                  Create Your First Order
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
