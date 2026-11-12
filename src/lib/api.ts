import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse a JSON body against a schema; returns a 400 response instead of throwing. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown = {};
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { response: error('Body must be valid JSON') };
  }
  try {
    return { data: schema.parse(raw) };
  } catch (e) {
    const msg = e instanceof ZodError ? e.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') : 'Invalid body';
    return { response: error(msg) };
  }
}

/** Wrap a route so unexpected failures come back as JSON 500s with a readable message. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error(e);
      return error(e instanceof Error ? e.message : 'Something went wrong', 500);
    }
  };
}
