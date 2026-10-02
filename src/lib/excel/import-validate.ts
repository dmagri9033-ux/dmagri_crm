import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import {
  CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  type CustomerImportColumn,
} from "@/lib/excel/customer-import-hooks";
import {
  INQUIRY_IMPORT_TEMPLATE_HEADERS,
  type InquiryImportColumn,
} from "@/lib/excel/inquiry-import-hooks";
import { mapRowByHeaders, parseYesNo, type SheetRow } from "@/lib/excel/workbook";
import { CUSTOMER_TYPES } from "@/validations/customer";

export type ValidatedImportRow = {
  rowNumber: number;
  payload: Record<string, unknown>;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
};

function parseCustomerType(raw: string): string | null | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if ((CUSTOMER_TYPES as readonly string[]).includes(v)) return v;
  return undefined;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateInquiryImportRows(
  rows: SheetRow[],
  context: {
    productNames: Map<string, string>; // lower name -> id
    existingMobiles: Set<string>;
  },
): ValidatedImportRow[] {
  return rows.map((row, index) => {
    const mapped = mapRowByHeaders(
      row,
      INQUIRY_IMPORT_TEMPLATE_HEADERS as Record<InquiryImportColumn, string>,
    );
    const errors: string[] = [];

    const inquiryDate = mapped.inquiry_date;
    if (!inquiryDate || !isIsoDate(inquiryDate)) {
      errors.push("Date must be YYYY-MM-DD");
    }

    const customerName = mapped.customer_name;
    if (!customerName || customerName.length < 2) {
      errors.push("Customer name is required");
    }

    const mobileNorm = normalizeMobile(mapped.mobile);
    if (!mobileNorm) {
      errors.push("Valid mobile number is required");
    }

    const customerType = parseCustomerType(mapped.customer_type);
    if (customerType === undefined) {
      errors.push("Customer type must be farmer, dealer, distributor, or other");
    }

    const productKey = mapped.product_name.trim().toLowerCase();
    const productId = productKey ? context.productNames.get(productKey) : undefined;
    if (!productKey) {
      errors.push("Product name is required");
    } else if (!productId) {
      errors.push(`Product not found: ${mapped.product_name}`);
    }

    const purchased = parseYesNo(mapped.product_purchased);
    if (purchased === null) {
      errors.push("Product Purchased must be Yes or No");
    }

    const isDuplicate = mobileNorm ? context.existingMobiles.has(mobileNorm) : false;

    return {
      rowNumber: index + 2,
      payload: {
        inquiry_date: inquiryDate,
        customer_name: customerName,
        mobile: mapped.mobile,
        mobile_normalized: mobileNorm,
        customer_type: customerType ?? null,
        product_name: mapped.product_name,
        product_id: productId ?? null,
        product_purchased: purchased ?? false,
        remarks: mapped.remarks || "",
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
    };
  });
}

export function validateCustomerImportRows(
  rows: SheetRow[],
  context: {
    productNames: Map<string, string>;
    existingMobiles: Set<string>;
  },
): ValidatedImportRow[] {
  return rows.map((row, index) => {
    const mapped = mapRowByHeaders(
      row,
      CUSTOMER_IMPORT_TEMPLATE_HEADERS as Record<CustomerImportColumn, string>,
    );
    const errors: string[] = [];

    const name = mapped.name;
    if (!name || name.length < 2) {
      errors.push("Customer name is required (min 2 characters)");
    }

    const mobileNorm = normalizeMobile(mapped.mobile);
    if (!mobileNorm) {
      errors.push("Valid mobile number is required");
    }

    const customerType = parseCustomerType(mapped.customer_type);
    if (customerType === undefined) {
      errors.push("Customer type must be farmer, dealer, distributor, or other");
    }

    let productId: string | null = null;
    if (mapped.product_name.trim()) {
      productId =
        context.productNames.get(mapped.product_name.trim().toLowerCase()) ?? null;
      if (!productId) {
        errors.push(`Product not found: ${mapped.product_name}`);
      }
    }

    const purchased = parseYesNo(mapped.product_purchased);
    if (purchased === null) {
      errors.push("Product Purchased must be Yes or No");
    }

    const followUp = parseYesNo(mapped.follow_up_required);
    if (followUp === null) {
      errors.push("Follow-up Required must be Yes or No");
    }

    const isDuplicate = mobileNorm ? context.existingMobiles.has(mobileNorm) : false;

    return {
      rowNumber: index + 2,
      payload: {
        name,
        mobile: mapped.mobile,
        mobile_normalized: mobileNorm,
        customer_type: customerType ?? null,
        product_name: mapped.product_name || "",
        primary_product_id: productId,
        product_purchased: purchased ?? false,
        follow_up_required: followUp ?? false,
        notes: mapped.notes || "",
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
    };
  });
}
