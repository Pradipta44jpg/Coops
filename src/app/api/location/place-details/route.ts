import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ placeId: z.string().trim().min(5).max(300) });

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: AddressComponent[];
  };
};

function extractComponent(components: AddressComponent[], type: string) {
  return components.find((c) => c.types.includes(type))?.long_name ?? "";
}

/**
 * GET /api/location/place-details?placeId=<id>
 * Resolves a Google Place ID to lat/lng + structured address parts.
 */
export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps is not configured on the server." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({ placeId: searchParams.get("placeId") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid place_id is required." }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", parsed.data.placeId);
  url.searchParams.set("fields", "formatted_address,geometry,address_components");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const result = (await response.json()) as PlaceDetailsResponse;

  if (!response.ok || result.status !== "OK" || !result.result) {
    return NextResponse.json(
      { error: result.error_message ?? "Place details lookup failed." },
      { status: 502 }
    );
  }

  const comps = result.result.address_components;

  // Extract human-readable parts for the booking form
  const line1 = [
    extractComponent(comps, "street_number"),
    extractComponent(comps, "route"),
  ]
    .filter(Boolean)
    .join(" ") || result.result.formatted_address.split(",")[0];

  const city =
    extractComponent(comps, "locality") ||
    extractComponent(comps, "administrative_area_level_2");

  const state = extractComponent(comps, "administrative_area_level_1");
  const postalCode = extractComponent(comps, "postal_code");

  return NextResponse.json({
    formattedAddress: result.result.formatted_address,
    latitude: result.result.geometry.location.lat,
    longitude: result.result.geometry.location.lng,
    line1,
    city,
    state,
    postalCode,
  });
}
