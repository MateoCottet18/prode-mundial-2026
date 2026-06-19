import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Lee todas las filas de una query Supabase (evita el límite default de 1000).
 */
export async function fetchAllSupabaseRows<T>(
  runQuery: (
    range: { from: number; to: number },
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await runQuery({ from, to: from + pageSize - 1 });
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) {
      break;
    }
    rows.push(...data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

/** Atajo para `.from(table).select(columns)` paginado. */
export async function fetchAllFromTable<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  return fetchAllSupabaseRows<T>(async ({ from, to }) => {
    const { data, error } = await admin.from(table).select(columns).range(from, to);
    return { data: data as T[] | null, error };
  }, pageSize);
}
