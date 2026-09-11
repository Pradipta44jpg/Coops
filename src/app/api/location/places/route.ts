import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ input: z.string().trim().min(2).max(300) });

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

type PlacesResponse = {
  status: string;
  error_message?: string;
  predictions?: PlacePrediction[];
};

/**
 * GET /api/location/places?input=<query>
 * Proxies Google Places Autocomplete so the API key never reaches the browser.
 * Returns a trimmed list of address suggestions.
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
  const parsed = schema.safeParse({ input: searchParams.get("input") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "A query of at least 2 characters is required." }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", parsed.data.input);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:in"); // restrict to India — change as needed
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const result = (await response.json()) as PlacesResponse;

  if (!response.ok || (result.status !== "OK" && result.status !== "ZERO_RESULTS")) {
    return NextResponse.json(
      { error: result.error_message ?? "Places lookup failed." },
      { status: 502 }
    );
  }

  const suggestions = (result.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting.main_text,
    secondaryText: p.structured_formatting.secondary_text,
  }));

  return NextResponse.json({ suggestions });
}
