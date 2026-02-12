import type { CSSProperties } from "react";
import type { BookingStatus, FulfillmentMethod } from "~/domains/booking/presentation/calendar/utils/types";

export function bookingMethodLabel(status: BookingStatus, fulfillmentMethod: FulfillmentMethod): string | null {
  if (status === "RETURNED") return "Returned";
  if (status !== "CONFIRMED") return null;
  if (fulfillmentMethod === "PICKUP") return "Pickup";
  if (fulfillmentMethod === "SHIP") return "Shipping";
  return "Unknown";
}

export function bookingTheme(
  status: BookingStatus,
  fulfillmentMethod: FulfillmentMethod,
): { background: string; border: string; color: string } {
  if (status === "RESERVED") {
    return {
      background: "#FFFBEB",
      border: "1px solid #F59E0B",
      color: "#92400E",
    };
  }
  if (status === "RETURNED") {
    return {
      background: "#F5F5F5",
      border: "1px solid #A3A3A3",
      color: "#525252",
    };
  }
  if (fulfillmentMethod === "PICKUP") {
    return {
      background: "#ECFDF5",
      border: "1px solid #10B981",
      color: "#065F46",
    };
  }
  if (fulfillmentMethod === "SHIP") {
    return {
      background: "#EFF6FF",
      border: "1px solid #60A5FA",
      color: "#1E3A8A",
    };
  }
  return {
    background: "#F3F4F6",
    border: "1px solid #9CA3AF",
    color: "#374151",
  };
}

export function bookingBarStyle(status: BookingStatus, fulfillmentMethod: FulfillmentMethod): CSSProperties {
  return bookingTheme(status, fulfillmentMethod);
}

