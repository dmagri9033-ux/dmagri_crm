"use client";

import { useEffect, useState } from "react";

/**
 * Keep local grid rows in sync with RSC props.
 * Avoids a second server-action round-trip on every page load.
 */
export function useServerSyncedRows<T>(initialRows: T[]) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  return [rows, setRows] as const;
}
