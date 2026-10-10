"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { loadCustomersGridAction } from "@/actions/customers";
import { usePermissions } from "@/components/providers/permissions-provider";
import { formatMobileDisplay } from "@/lib/customers/normalize-mobile";
import type { CustomerWithProduct } from "@/lib/db/customers";
import { cn } from "@/lib/utils";

type SearchHit = Pick<
  CustomerWithProduct,
  "id" | "name" | "mobile" | "mobile_normalized" | "customer_type"
>;

const MIN_QUERY = 2;
const DEBOUNCE_MS = 280;
const RESULT_LIMIT = 8;

export function GlobalCustomerSearch() {
  const router = useRouter();
  const { can } = usePermissions();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const canSearch = can("customer.view");

  useEffect(() => {
    if (!canSearch) return;

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setHits([]);
      setError(undefined);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await loadCustomersGridAction({
          search: trimmed,
          page: 1,
          pageSize: RESULT_LIMIT,
        });
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          setHits([]);
        } else {
          setHits(
            (result.customers ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              mobile: c.mobile,
              mobile_normalized: c.mobile_normalized,
              customer_type: c.customer_type,
            })),
          );
        }
        setActiveIndex(-1);
        setLoading(false);
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, canSearch]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToCustomer(id: string) {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(-1);
    router.push(`/customers/${id}`);
  }

  function goToCustomersList() {
    const trimmed = query.trim();
    setOpen(false);
    if (trimmed) {
      router.push(`/customers?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/customers");
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && hits[activeIndex]) {
        goToCustomer(hits[activeIndex].id);
      } else if (hits.length === 1) {
        goToCustomer(hits[0].id);
      } else {
        goToCustomersList();
      }
    }
  }

  if (!canSearch) return null;

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= MIN_QUERY;

  return (
    <div ref={rootRef} className="relative w-full max-w-44 min-[400px]:w-44 sm:max-w-none sm:w-56 lg:w-64">
      <div className="flex h-8 items-center gap-1.5 rounded-md border bg-muted/40 px-2 focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/30">
        {loading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoComplete="off"
          spellCheck={false}
          placeholder="Name or mobile…"
          aria-label="Search customers by name or mobile"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md"
        >
          {error ? (
            <p className="px-3 py-2 text-xs text-destructive">{error}</p>
          ) : loading && hits.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">No customers found</p>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                onClick={goToCustomersList}
              >
                Open Customers
              </button>
            </div>
          ) : (
            <ul className="py-1">
              {hits.map((hit, index) => {
                const mobile = formatMobileDisplay(
                  hit.mobile,
                  hit.mobile_normalized,
                );
                return (
                  <li key={hit.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-accent",
                        index === activeIndex && "bg-accent",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToCustomer(hit.id)}
                    >
                      <span className="truncate text-xs font-medium">{hit.name}</span>
                      <span className="truncate text-[11px] font-medium tabular-nums text-blue-700 dark:text-blue-300">
                        {mobile}
                        {hit.customer_type ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            · {hit.customer_type}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="border-t">
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-sky-700 hover:bg-accent dark:text-sky-300"
                  onClick={goToCustomersList}
                >
                  View all matches in Customers
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
