import { NextResponse } from 'next/server';

/**
 * The transport-neutral result every `src/server` module returns.
 *
 * A server module does the work - device auth, validation, database, models -
 * and hands back a status plus a body. The route handler under `src/app/api` is
 * the only place that knows this is HTTP, which is what keeps a route down to a
 * three-line adapter and lets the logic be exercised without a request object.
 *
 * The status codes travel with the body because they are part of the API's
 * contract with the Android companion (401/429/400/404/500 are all meaningful
 * to it), and moving them here is what makes them reviewable in one file
 * instead of scattered through the app router.
 */
export interface ServiceResult<T = unknown> {
  status: number;
  body: T;
  /**
   * Set only for payloads that are not a JSON document - today the NDJSON
   * training exports, which need their own Content-Type and a download filename.
   */
  headers?: Record<string, string>;
}

/** A 200 carrying `body`. */
export function ok<T>(body: T): ServiceResult<T> {
  return { status: 200, body };
}

/** Any non-200 result, including the 201 of a create and the 503s. */
export function fail<T = unknown>(status: number, body: T): ServiceResult<T> {
  return { status, body };
}

/** A downloadable NDJSON stream (the training-data exports). */
export function ndjson(body: string, filename: string): ServiceResult<string> {
  return {
    status: 200,
    body,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  };
}

/**
 * The one place a `ServiceResult` becomes a concrete HTTP response. Keeping the
 * JSON-vs-file branch here is what lets every route handler stay a single
 * `return toResponse(await ...)` line.
 */
export function toResponse({ status, body, headers }: ServiceResult): Response {
  if (headers) {
    return new Response(body as BodyInit, { status, headers });
  }
  return NextResponse.json(body, { status });
}
