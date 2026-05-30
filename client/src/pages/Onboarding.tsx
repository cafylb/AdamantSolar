import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "address">("form");

  // Form state
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
    hideTime: false,
    contactNumber: "",
    deliveryAddress: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const createOrderMutation = trpc.orders.create.useMutation();

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    // Validate form fields
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
    setStep("address");
  };

  const handleSubmit = async () => {
    // Validate address
    if (!formData.deliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    // Validate Tashkent address
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
        contactNumber: formData.contactNumber || "",
        message: formData.message || undefined,
        hideTime: formData.hideTime,
        deliveryAddress: formData.deliveryAddress,
      });

      toast.success("Order placed successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Create Your Order
          </h1>
          <p className="text-subtle">
            {step === "form"
              ? "Step 1: Order Details"
              : "Step 2: Delivery Address"}
          </p>
        </div>

        {step === "form" ? (
          // Form Step
          <div className="space-y-8">
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
                  onChange={(e) => handleFormChange("month", e.target.value)}
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
              <Label className="label-minimal mb-2 block">Main Title *</Label>
              <Input
                placeholder="e.g., Written in the stars"
                value={formData.mainTitle}
                onChange={(e) => handleFormChange("mainTitle", e.target.value)}
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
                Message <span className="text-subtle text-xs">(Optional)</span>
              </Label>
              <textarea
                placeholder="Add an optional message..."
                value={formData.message}
                onChange={(e) => handleFormChange("message", e.target.value)}
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
          <div className="space-y-8">
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
              <h3 className="font-semibold text-foreground">Order Summary</h3>
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
                onClick={() => setStep("form")}
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
    </div>
  );
}
