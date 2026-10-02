import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database.types";
import type { ValidatedImportRow } from "@/lib/excel/import-validate";

export type ImportModule = "inquiries" | "customers";
export type ImportBatch = Tables<"import_batches">;
export type ImportBatchRow = Tables<"import_batch_rows">;

export type ImportBatchWithRows = ImportBatch & {
  rows: ImportBatchRow[];
};

export async function createImportBatch(input: {
  module: ImportModule;
  fileName: string;
  userId: string;
  validatedRows: ValidatedImportRow[];
}): Promise<ImportBatchWithRows> {
  const supabase = await createClient();
  const validRows = input.validatedRows.filter((r) => r.isValid).length;
  const errorRows = input.validatedRows.length - validRows;

  const { data: batch, error } = await supabase
    .from("import_batches")
    .insert({
      module: input.module,
      file_name: input.fileName,
      status: "validated",
      total_rows: input.validatedRows.length,
      valid_rows: validRows,
      error_rows: errorRows,
      created_by: input.userId,
      summary: {
        duplicate_rows: input.validatedRows.filter((r) => r.isDuplicate).length,
      },
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (input.validatedRows.length > 0) {
    const { error: rowsError } = await supabase.from("import_batch_rows").insert(
      input.validatedRows.map((row) => ({
        batch_id: batch.id,
        row_number: row.rowNumber,
        payload: row.payload as Json,
        is_valid: row.isValid,
        errors: row.errors as Json,
        is_duplicate: row.isDuplicate,
      })),
    );
    if (rowsError) throw new Error(rowsError.message);
  }

  return getImportBatch(batch.id) as Promise<ImportBatchWithRows>;
}

export async function getImportBatch(
  batchId: string,
): Promise<ImportBatchWithRows | null> {
  const supabase = await createClient();
  const [{ data: batch, error }, { data: rows, error: rowsError }] =
    await Promise.all([
      supabase.from("import_batches").select("*").eq("id", batchId).maybeSingle(),
      supabase
        .from("import_batch_rows")
        .select("*")
        .eq("batch_id", batchId)
        .order("row_number", { ascending: true }),
    ]);

  if (error) throw new Error(error.message);
  if (rowsError) throw new Error(rowsError.message);
  if (!batch) return null;

  return { ...batch, rows: rows ?? [] };
}

export async function markImportBatchCommitted(
  batchId: string,
  summary: Record<string, unknown>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_batches")
    .update({
      status: "committed",
      committed_at: new Date().toISOString(),
      summary: summary as Json,
    })
    .eq("id", batchId);

  if (error) throw new Error(error.message);
}

export async function loadProductNameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const product of data ?? []) {
    map.set(product.name.trim().toLowerCase(), product.id);
  }
  return map;
}

export async function loadExistingMobileSet(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("mobile_normalized")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((c) => c.mobile_normalized));
}
