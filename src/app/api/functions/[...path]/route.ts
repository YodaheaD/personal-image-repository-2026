import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError, Method } from "axios";

export const dynamic = "force-dynamic";

function functionsBaseUrl(): string {
  const base =
    process.env.FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ||
    "";
  return base.replace(/\/$/, "");
}

function functionsKey(): string {
  return (
    process.env.FUNCTIONS_KEY ||
    process.env.AZURE_FUNCTIONS_KEY ||
    process.env.NEXT_PUBLIC_FUNCTIONS_KEY ||
    ""
  );
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const base = functionsBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "FUNCTIONS_BASE_URL / NEXT_PUBLIC_FUNCTIONS_BASE_URL is not configured",
      },
      { status: 500 },
    );
  }

  const key = functionsKey();
  const path = pathParts.join("/");
  const url = new URL(`${base}/${path}`);
  req.nextUrl.searchParams.forEach((value, keyName) => {
    url.searchParams.set(keyName, value);
  });

  let body: unknown = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  try {
    const response = await axios({
      url: url.toString(),
      method: req.method as Method,
      data: body,
      headers: {
        ...(key ? { "x-functions-key": key } : {}),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
      timeout: 60_000,
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (err) {
    const ax = err as AxiosError;
    return NextResponse.json(
      {
        error: "Functions proxy request failed",
        detail: ax.message,
      },
      { status: 502 },
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
