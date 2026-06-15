// Outbound integration with the Adamant Solar Server (Go star-map renderer).
// It exposes POST /api/starmap which renders the star map and (deliver:true)
// sends it to Telegram using the server's TELEGRAM_DEFAULT_PEER.
//
// Configure via .env:
//   ADAMANT_API_URL  - full URL, e.g. http://localhost:3000/api/starmap
//   ADAMANT_API_KEY  - optional; only if the Adamant server sets API_KEY

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

function monthToNumber(month: string | number): number {
  if (typeof month === "number" && Number.isFinite(month)) {
    return month >= 1 && month <= 12 ? month : 1;
  }
  const raw = String(month ?? "").trim();
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (idx >= 0) return idx + 1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 1;
}

export async function sendStarmapForOrder(order: any): Promise<boolean> {
  const url =
    process.env.ADAMANT_API_URL || "http://localhost:3000/api/starmap";
  const apiKey = process.env.ADAMANT_API_KEY || "";

  const body = {
    city: order.location,
    day: Number(order.day),
    month: monthToNumber(order.month),
    year: Number(order.year),
    hour: Number(order.hour),
    minute: Number(order.minute),
    theme: order.theme || "black",
    title: order.mainTitle,
    line1: order.line1,
    line2: order.line2,
    hideTime: !!order.hideTime,
    // peer is intentionally omitted: Adamant uses its TELEGRAM_DEFAULT_PEER.
    deliver: true,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  // Adamant renders with headless Chrome and sends to Telegram (up to ~2 min).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[adamant] order ${order.id} failed: HTTP ${res.status} ${text}`
      );
      return false;
    }

    const data: any = await res.json().catch(() => null);
    if (data && data.ok === false) {
      console.error(`[adamant] order ${order.id} returned ok:false`, data);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[adamant] order ${order.id} dispatch error:`, e);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
