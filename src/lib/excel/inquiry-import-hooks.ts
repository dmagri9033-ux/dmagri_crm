/**
 * Hooks for Phase 12 Excel import/export.
 * Keep inquiry import column mapping centralized here.
 */
export const INQUIRY_IMPORT_COLUMNS = [
  "inquiry_date",
  "customer_name",
  "mobile",
  "customer_type",
  "product_name",
  "product_purchased",
  "remarks",
] as const;

export type InquiryImportColumn = (typeof INQUIRY_IMPORT_COLUMNS)[number];

export const INQUIRY_IMPORT_TEMPLATE_HEADERS: Record<InquiryImportColumn, string> = {
  inquiry_date: "Date (YYYY-MM-DD)",
  customer_name: "Customer Name",
  mobile: "Mobile Number",
  customer_type: "Customer Type",
  product_name: "Product Name",
  product_purchased: "Product Purchased (Yes/No)",
  remarks: "Remarks",
};
