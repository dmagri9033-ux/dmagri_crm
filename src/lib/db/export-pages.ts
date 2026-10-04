/**
 * Walks paginated list helpers and collects rows for Excel export (capped).
 */
export async function collectPagesForExport<TFilters, TItem>(options: {
  list: (
    filters: TFilters & { page: number; pageSize: number },
  ) => Promise<{
    items: TItem[];
    total: number;
    pageSize: number;
  }>;
  filters: TFilters;
  limit?: number;
  pageSize?: number;
}): Promise<TItem[]> {
  const limit = options.limit ?? 5000;
  const pageSize = Math.min(Math.max(options.pageSize ?? 100, 5), 100);

  const first = await options.list({
    ...options.filters,
    page: 1,
    pageSize,
  });

  if (first.total <= first.pageSize) {
    return first.items.slice(0, limit);
  }

  const all = [...first.items];
  const pages = Math.ceil(Math.min(first.total, limit) / first.pageSize);
  for (let page = 2; page <= pages; page += 1) {
    const chunk = await options.list({
      ...options.filters,
      page,
      pageSize: first.pageSize,
    });
    all.push(...chunk.items);
  }
  return all.slice(0, limit);
}
