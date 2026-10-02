"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { createInquiryRecord } from "@/lib/db/inquiries";
import { findCustomerByNormalizedMobile } from "@/lib/db/customers";
import {
  createImportBatch,
  getImportBatch,
  loadExistingMobileSet,
  loadProductNameMap,
  markImportBatchCommitted,
  type ImportModule,
} from "@/lib/db/import-batches";
import {
  validateCustomerImportRows,
  validateInquiryImportRows,
} from "@/lib/excel/import-validate";
import { parseWorkbookFirstSheet } from "@/lib/excel/workbook";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  checkRateLimit,
  getClientRateLimitKey,
} from "@/lib/security/rate-limit";
import { validateXlsxUpload } from "@/lib/security/upload";
import { createClient } from "@/lib/supabase/server";

export type ExcelImportActionState = {
  error?: string;
  success?: string;
  batchId?: string;
  summary?: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    created?: number;
    updated?: number;
    skipped?: number;
  };
};

export async function uploadImportAction(
  _prev: ExcelImportActionState,
  formData: FormData,
): Promise<ExcelImportActionState> {
  try {
    const rateKey = await getClientRateLimitKey("excel-import");
    const limited = checkRateLimit(rateKey, 10, 15 * 60_000);
    if (!limited.ok) {
      return {
        error: `Too many import uploads. Try again in ${limited.retryAfterSec}s.`,
      };
    }

    const module = String(formData.get("module") || "") as ImportModule;
    if (module !== "inquiries" && module !== "customers") {
      return { error: "Invalid import module" };
    }

    const permission =
      module === "inquiries" ? "inquiry.import" : "customer.import";
    const ctx = await authorize(permission);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { error: "Choose an Excel (.xlsx) file" };
    }

    const validatedFile = await validateXlsxUpload(file);
    if (!validatedFile.ok) {
      return { error: validatedFile.error };
    }

    const { rows } = await parseWorkbookFirstSheet(validatedFile.buffer);
    if (rows.length === 0) {
      return { error: "No data rows found in the sheet" };
    }

    const [productNames, existingMobiles] = await Promise.all([
      loadProductNameMap(),
      loadExistingMobileSet(),
    ]);

    const validated =
      module === "inquiries"
        ? validateInquiryImportRows(rows, { productNames, existingMobiles })
        : validateCustomerImportRows(rows, { productNames, existingMobiles });

    const batch = await createImportBatch({
      module,
      fileName: file.name,
      userId: ctx.userId,
      validatedRows: validated,
    });

    return {
      success: "File validated. Review the preview before committing.",
      batchId: batch.id,
      summary: {
        total: batch.total_rows,
        valid: batch.valid_rows,
        invalid: batch.error_rows,
        duplicates: validated.filter((r) => r.isDuplicate).length,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function commitImportAction(
  _prev: ExcelImportActionState,
  formData: FormData,
): Promise<ExcelImportActionState> {
  try {
    const batchId = String(formData.get("batchId") || "");
    const duplicateMode = String(formData.get("duplicateMode") || "skip") as
      | "skip"
      | "update";
    if (!batchId) return { error: "Missing batch id" };

    const batch = await getImportBatch(batchId);
    if (!batch) return { error: "Import batch not found" };
    if (batch.status === "committed") {
      return { error: "This batch was already committed" };
    }

    const permission =
      batch.module === "inquiries" ? "inquiry.import" : "customer.import";
    const ctx = await authorize(permission);

    if (batch.created_by !== ctx.userId) {
      return { error: "You can only commit your own import batches" };
    }

    const supabase = await createClient();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const validRows = batch.rows.filter((r) => r.is_valid);

    if (batch.module === "customers") {
      for (const row of validRows) {
        const payload = row.payload as {
          name: string;
          mobile: string;
          mobile_normalized: string;
          customer_type: string | null;
          primary_product_id: string | null;
          product_purchased: boolean;
          follow_up_required: boolean;
          notes: string;
        };

        const existing = await findCustomerByNormalizedMobile(
          payload.mobile_normalized,
        );

        if (existing) {
          if (duplicateMode === "skip") {
            skipped += 1;
            continue;
          }
          await authorize("customer.update");
          const { error } = await supabase
            .from("customers")
            .update({
              name: payload.name,
              mobile: payload.mobile.trim(),
              mobile_normalized: payload.mobile_normalized,
              customer_type: payload.customer_type,
              primary_product_id: payload.primary_product_id,
              product_purchased: payload.product_purchased,
              follow_up_required: payload.follow_up_required,
              notes: payload.notes?.trim() || null,
            })
            .eq("id", existing.id)
            .is("deleted_at", null);
          if (error) throw new Error(`Row ${row.row_number}: ${error.message}`);
          updated += 1;
          continue;
        }

        const { data, error } = await supabase
          .from("customers")
          .insert({
            name: payload.name,
            mobile: payload.mobile.trim(),
            mobile_normalized: payload.mobile_normalized,
            customer_type: payload.customer_type,
            primary_product_id: payload.primary_product_id,
            product_purchased: payload.product_purchased,
            follow_up_required: payload.follow_up_required,
            notes: payload.notes?.trim() || null,
            created_by: ctx.userId,
            assigned_user_id: ctx.userId,
          })
          .select("id")
          .single();
        if (error) throw new Error(`Row ${row.row_number}: ${error.message}`);
        created += 1;
        await logActivity({
          actorId: ctx.userId,
          action: "CUSTOMER_CREATED",
          module: "customers",
          entityType: "customer",
          entityId: data.id,
          customerId: data.id,
          metadata: { via: "excel_import", batchId },
        });
      }
    } else {
      for (const row of validRows) {
        const payload = row.payload as {
          inquiry_date: string;
          customer_name: string;
          mobile: string;
          mobile_normalized: string;
          customer_type: string | null;
          product_id: string;
          product_purchased: boolean;
          remarks: string;
        };

        let customer = await findCustomerByNormalizedMobile(
          payload.mobile_normalized,
        );

        if (!customer) {
          const { data, error } = await supabase
            .from("customers")
            .insert({
              name: payload.customer_name,
              mobile: payload.mobile.trim(),
              mobile_normalized: payload.mobile_normalized,
              customer_type: payload.customer_type,
              product_purchased: payload.product_purchased,
              created_by: ctx.userId,
              assigned_user_id: ctx.userId,
            })
            .select("*")
            .single();
          if (error) throw new Error(`Row ${row.row_number}: ${error.message}`);
          customer = data;
        } else if (duplicateMode === "update") {
          await authorize("customer.update");
          await supabase
            .from("customers")
            .update({
              name: payload.customer_name,
              customer_type: payload.customer_type ?? customer.customer_type,
            })
            .eq("id", customer.id);
          updated += 1;
        }

        await createInquiryRecord({
          userId: ctx.userId,
          inquiry_date: payload.inquiry_date,
          customer_id: customer.id,
          product_id: payload.product_id,
          customer_type: payload.customer_type,
          product_purchased: payload.product_purchased,
          remarks: payload.remarks || null,
        });
        created += 1;
      }
    }

    const summary = {
      created,
      updated,
      skipped,
      invalid_skipped: batch.error_rows,
      duplicate_mode: duplicateMode,
    };

    await markImportBatchCommitted(batchId, summary);

    await logActivity({
      actorId: ctx.userId,
      action:
        batch.module === "inquiries"
          ? "EXCEL_IMPORT_INQUIRIES"
          : "EXCEL_IMPORT_CUSTOMERS",
      module: batch.module,
      entityType: "import_batch",
      entityId: batchId,
      metadata: summary,
    });

    if (batch.module === "inquiries") {
      revalidatePath("/inquiries");
      revalidatePath("/customers");
    } else {
      revalidatePath("/customers");
    }

    return {
      success: `Import committed: ${created} created, ${updated} updated, ${skipped} skipped.`,
      batchId,
      summary: {
        total: batch.total_rows,
        valid: batch.valid_rows,
        invalid: batch.error_rows,
        duplicates: batch.rows.filter((r) => r.is_duplicate).length,
        created,
        updated,
        skipped,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getImportBatchAction(batchId: string) {
  const batch = await getImportBatch(batchId);
  if (!batch) return null;
  const permission =
    batch.module === "inquiries" ? "inquiry.import" : "customer.import";
  const ctx = await authorize(permission);
  if (batch.created_by !== ctx.userId) {
    return null;
  }
  return batch;
}
