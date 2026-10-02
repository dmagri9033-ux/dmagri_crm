/**
 * Customer Excel import/export column mapping.
 */
export const CUSTOMER_IMPORT_COLUMNS = [
  "name",
  "mobile",
  "customer_type",
  "product_name",
  "product_purchased",
  "follow_up_required",
  "notes",
] as const;

export type CustomerImportColumn = (typeof CUSTOMER_IMPORT_COLUMNS)[number];

export const CUSTOMER_IMPORT_TEMPLATE_HEADERS: Record<
  CustomerImportColumn,
  string
> = {
  name: "Customer Name",
  mobile: "Mobile Number",
  customer_type: "Customer Type",
  product_name: "Primary Product Name",
  product_purchased: "Product Purchased (Yes/No)",
  follow_up_required: "Follow-up Required (Yes/No)",
  notes: "Notes",
};
