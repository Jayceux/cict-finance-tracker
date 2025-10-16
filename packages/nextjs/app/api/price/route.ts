import { NextResponse } from "next/server";

type PriceResponse = {
  ethToPhp: number | null;
  source: string;
  updatedAt: string;
  ttlSeconds: number;
};

const TTL = 300; // seconds

// simple in-memory cache (per-node instance)
let cache: { ethToPhp: number | null; updatedAt: number; source: string } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.updatedAt < TTL * 1000) {
      const body: PriceResponse = {
        ethToPhp: cache.ethToPhp,
        source: cache.source,
        updatedAt: new Date(cache.updatedAt).toISOString(),
        ttlSeconds: TTL,
      };
      return NextResponse.json(body, { status: 200 });
    }

    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=php");
    if (!res.ok) {
      // upstream failed — return cached value if available
      if (cache) {
        const body: PriceResponse = {
          ethToPhp: cache.ethToPhp,
          source: cache.source,
          updatedAt: new Date(cache.updatedAt).toISOString(),
          ttlSeconds: TTL,
        };
        return NextResponse.json(body, { status: 200 });
      }
      return NextResponse.json(
        { ethToPhp: null, source: "coingecko", updatedAt: new Date().toISOString(), ttlSeconds: TTL },
        { status: 502 },
      );
    }

    const data = await res.json();
    const rate = data?.ethereum?.php ?? null;
    cache = { ethToPhp: rate, updatedAt: Date.now(), source: "coingecko" };

    const body: PriceResponse = {
      ethToPhp: rate,
      source: "coingecko",
      updatedAt: new Date(cache.updatedAt).toISOString(),
      ttlSeconds: TTL,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.warn("/api/price fetch failed", error);
    // on error return cached value if present
    if (cache) {
      const body: PriceResponse = {
        ethToPhp: cache.ethToPhp,
        source: cache.source,
        updatedAt: new Date(cache.updatedAt).toISOString(),
        ttlSeconds: TTL,
      };
      return NextResponse.json(body, { status: 200 });
    }
    return NextResponse.json(
      { ethToPhp: null, source: "coingecko", updatedAt: new Date().toISOString(), ttlSeconds: TTL },
      { status: 500 },
    );
  }
}
