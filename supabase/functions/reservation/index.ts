const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Fixed listing ID */
const LISTING_ID = "463607";

/* ── In-memory cache ── */
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

interface CachedReservations {
  data: any[];
  fetchedAt: number;
}
let cachedReservations: CachedReservations | null = null;
const RESERVATION_CACHE_TTL = 30_000; // 30s

interface CachedListing {
  doorCode: string;
  wifiPassword: string;
  fetchedAt: number;
}
let cachedListing: CachedListing | null = null;
const LISTING_CACHE_TTL = 120_000; // 2min

async function getHostawayToken(accountId: string, apiKey: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: accountId,
    client_secret: apiKey,
    scope: "general",
  });

  const res = await fetch("https://api.hostaway.com/v1/accessTokens", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + 3500_000; // ~58min
  return data.access_token;
}

async function getActiveReservations(accessToken: string): Promise<any[]> {
  const now = Date.now();
  if (cachedReservations && (now - cachedReservations.fetchedAt) < RESERVATION_CACHE_TTL) {
    return cachedReservations.data;
  }

  const today = todayUTC();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const threeDaysAhead = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const reservationsRes = await fetch(
    `https://api.hostaway.com/v1/reservations?listingId=${LISTING_ID}&arrivalStartDate=${thirtyDaysAgo}&arrivalEndDate=${threeDaysAhead}&departureStartDate=${today}&limit=5&sortOrder=arrivalDate&sortDirection=desc&includeResources=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!reservationsRes.ok) {
    const text = await reservationsRes.text();
    throw new Error(`Hostaway error: ${reservationsRes.status} ${text}`);
  }

  const reservationsData = await reservationsRes.json();
  const all = reservationsData.result || [];

  const active = all.filter((r: any) => {
    const status = r.status;
    if (status === "cancelled" || status === "declined") return false;
    const arrival = r.arrivalDate?.slice(0, 10);
    const departure = r.departureDate?.slice(0, 10);
    if (!arrival || !departure) return false;
    // Active now OR arriving within 3 days
    return (today >= arrival && today <= departure) || (arrival > today && arrival <= threeDaysAhead);
  });

  cachedReservations = { data: active, fetchedAt: now };
  return active;
}

async function getListingDetails(accessToken: string): Promise<{ doorCode: string; wifiPassword: string }> {
  const now = Date.now();
  if (cachedListing && (now - cachedListing.fetchedAt) < LISTING_CACHE_TTL) {
    return cachedListing;
  }

  try {
    const res = await fetch(
      `https://api.hostaway.com/v1/listings/${LISTING_ID}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.ok) {
      const data = await res.json();
      const l = data.result;
      const result = {
        doorCode: l.doorCode || l.doorSecurityCode || "",
        wifiPassword: l.wifiPassword || "",
        fetchedAt: now,
      };
      cachedListing = result;
      return result;
    }
  } catch (e) {
    console.error("Failed to fetch listing:", e);
  }
  return { doorCode: "", wifiPassword: "" };
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fixed token for now – will be replaced with dynamic HMAC later */
const FIXED_TOKEN = "ABC321";

function isValidToken(reservationId: string, token: string): boolean {
  return token === FIXED_TOKEN;
}

function extractCustomField(reservation: any, fieldId: number): string {
  const cfv = reservation.customFieldValues;
  if (!Array.isArray(cfv)) return "";
  const field = cfv.find((f: any) => f.customFieldId === fieldId || f.id === fieldId);
  return field?.value || "";
}

function buildGuestResponse(reservation: any, doorCode: string, wifiPassword: string) {
  const guestName =
    reservation.guestName ||
    [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(" ") ||
    "Gast";

  // Extract guest language from Hostaway reservation
  const guestLanguage = reservation.guestLanguage || reservation.language || "de";

  // Extract Allgäu Walser Pass link (custom field 89486)
  const awpassLink = extractCustomField(reservation, 89486);

  return {
    status: "ok",
    guestName,
    guestLanguage,
    checkin: reservation.arrivalDate || "",
    checkout: reservation.departureDate || "",
    numberOfGuests: reservation.numberOfGuests || 0,
    doorCode,
    wifiPassword,
    awpassLink,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    const pin = url.searchParams.get("pin");
    const reservationId = url.searchParams.get("reservationId");
    const token = url.searchParams.get("token");
    const listingId = LISTING_ID;

    const accountId = Deno.env.get("HOSTAWAY_ACCOUNT_ID");
    const apiKey = Deno.env.get("HOSTAWAY_API_KEY");
    if (!accountId || !apiKey) {
      return json({ error: "Missing Hostaway credentials" }, 500);
    }

    const accessToken = await getHostawayToken(accountId, apiKey);

    // ── MODE 1: Direct access via reservationId + token ──
    if (reservationId && token) {
      if (!isValidToken(reservationId, token)) {
        return json({ error: "invalid_token", message: "Ungültiger Zugangslink." }, 403);
      }

      const resRes = await fetch(
        `https://api.hostaway.com/v1/reservations/${reservationId}?includeResources=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!resRes.ok) {
        return json({ error: "reservation_not_found" }, 404);
      }

      const resData = await resRes.json();
      const reservation = resData.result;

      if (String(reservation.listingMapId) !== listingId && String(reservation.listingId) !== listingId) {
        return json({ error: "reservation_not_found" }, 404);
      }

      const listing = await getListingDetails(accessToken);
      const doorCode = reservation.doorCode || reservation.doorSecurityCode || listing.doorCode;
      const wifiPassword = listing.wifiPassword;

      const resp = buildGuestResponse(reservation, doorCode, wifiPassword);
      return json({ ...resp, reservationId, token });
    }

    // ── MODE 2: Date-based lookup with PIN ──
    // Always pre-fetch reservations + listing in parallel (warmup populates cache)
    const [activeReservations, listing] = await Promise.all([
      getActiveReservations(accessToken),
      getListingDetails(accessToken),
    ]);

    if (activeReservations.length === 0) {
      return json({ error: "no_active_reservation", message: "Aktuell kein aktiver Aufenthalt." }, 404);
    }

    if (!pin) {
      return json({ status: "pin_required" });
    }

    // Try to match PIN
    const matched = activeReservations.find((r: any) => {
      const guestPhone = r.guestPhone || r.phone || "";
      const digits = guestPhone.replace(/\D/g, "");
      const expectedPin = digits.slice(-4);
      return expectedPin && pin === expectedPin;
    });

    if (!matched) {
      return json({ error: "invalid_pin", message: "Ungültige PIN." }, 403);
    }

    const doorCode = matched.doorCode || matched.doorSecurityCode || listing.doorCode;
    const resp = buildGuestResponse(matched, doorCode, listing.wifiPassword);
    const matchedId = String(matched.id);
    return json({ ...resp, reservationId: matchedId, token: FIXED_TOKEN });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
