import { describe, expect, it } from "vitest";
import {
  mapRowByHeaders,
  parseYesNo,
} from "@/lib/excel/workbook";
import {
  validateCustomerImportRows,
  validateInquiryImportRows,
} from "@/lib/excel/import-validate";
import { validateXlsxUpload } from "@/lib/security/upload";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("parseYesNo", () => {
  it("parses common yes/no forms", () => {
    expect(parseYesNo("Yes")).toBe(true);
    expect(parseYesNo("y")).toBe(true);
    expect(parseYesNo("1")).toBe(true);
    expect(parseYesNo("No")).toBe(false);
    expect(parseYesNo("")).toBe(false);
    expect(parseYesNo("maybe")).toBeNull();
  });
});

describe("mapRowByHeaders", () => {
  it("maps template headers to keys", () => {
    const mapped = mapRowByHeaders(
      { "Customer Name": "Ram", "Mobile Number": "9876543210" },
      { name: "Customer Name", mobile: "Mobile Number" },
    );
    expect(mapped).toEqual({ name: "Ram", mobile: "9876543210" });
  });
});

describe("validateInquiryImportRows", () => {
  const productNames = new Map([["urea", "prod-1"]]);
  const existingMobiles = new Set(["919876543210"]);

  it("marks invalid product and flags duplicate mobile", () => {
    const [row] = validateInquiryImportRows(
      [
        {
          "Date (YYYY-MM-DD)": "2026-10-01",
          "Customer Name": "Ram Kumar",
          "Mobile Number": "9876543210",
          "Customer Type": "farmer",
          "Product Name": "Unknown",
          "Product Purchased (Yes/No)": "No",
          Remarks: "",
        },
      ],
      { productNames, existingMobiles },
    );
    expect(row.isValid).toBe(false);
    expect(row.isDuplicate).toBe(true);
    expect(row.errors.some((e) => e.includes("Product not found"))).toBe(true);
  });

  it("accepts a valid row", () => {
    const [row] = validateInquiryImportRows(
      [
        {
          "Date (YYYY-MM-DD)": "2026-10-01",
          "Customer Name": "Ram Kumar",
          "Mobile Number": "9123456780",
          "Customer Type": "dealer",
          "Product Name": "Urea",
          "Product Purchased (Yes/No)": "Yes",
          Remarks: "Demo",
        },
      ],
      { productNames, existingMobiles },
    );
    expect(row.isValid).toBe(true);
    expect(row.isDuplicate).toBe(false);
    expect(row.payload.product_id).toBe("prod-1");
    expect(row.payload.product_purchased).toBe(true);
  });
});

describe("validateCustomerImportRows", () => {
  it("reports invalid mobile by row", () => {
    const [row] = validateCustomerImportRows(
      [
        {
          "Customer Name": "X",
          "Mobile Number": "123",
          "Customer Type": "farmer",
          "Primary Product Name": "",
          "Product Purchased (Yes/No)": "No",
          "Follow-up Required (Yes/No)": "No",
          Notes: "",
        },
      ],
      { productNames: new Map(), existingMobiles: new Set() },
    );
    expect(row.isValid).toBe(false);
    expect(row.errors.length).toBeGreaterThan(0);
  });
});

describe("validateXlsxUpload", () => {
  it("rejects non-xlsx extension and non-zip payloads", async () => {
    const badName = new File([new Uint8Array([1, 2, 3])], "data.txt", {
      type: "text/plain",
    });
    const badExt = await validateXlsxUpload(badName);
    expect(badExt.ok).toBe(false);

    const fakeXlsx = new File([new Uint8Array([1, 2, 3, 4])], "data.xlsx", {
      type: "application/octet-stream",
    });
    const badMagic = await validateXlsxUpload(fakeXlsx);
    expect(badMagic.ok).toBe(false);
    if (!badMagic.ok) {
      expect(badMagic.error).toMatch(/signature|format/i);
    }
  });

  it("accepts zip magic with .xlsx name", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    const file = new File([bytes], "ok.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = await validateXlsxUpload(file);
    expect(result.ok).toBe(true);
  });
});

describe("checkRateLimit", () => {
  it("blocks after limit within window", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.retryAfterSec).toBeGreaterThan(0);
  });
});
