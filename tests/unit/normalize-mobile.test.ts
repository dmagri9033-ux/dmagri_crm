import { describe, expect, it } from "vitest";
import {
  formatMobileDisplay,
  normalizeMobile,
} from "@/lib/customers/normalize-mobile";

describe("normalizeMobile", () => {
  it("prefixes 10-digit Indian numbers with 91", () => {
    expect(normalizeMobile("9876543210")).toBe("919876543210");
    expect(normalizeMobile("98765-43210")).toBe("919876543210");
    expect(normalizeMobile("+91 98765 43210")).toBe("919876543210");
  });

  it("keeps 12-digit numbers already starting with 91", () => {
    expect(normalizeMobile("919876543210")).toBe("919876543210");
  });

  it("allows plausible 11–15 digit international numbers", () => {
    expect(normalizeMobile("14155552671")).toBe("14155552671");
  });

  it("rejects empty and too-short values", () => {
    expect(normalizeMobile("")).toBeNull();
    expect(normalizeMobile("abc")).toBeNull();
    expect(normalizeMobile("12345")).toBeNull();
  });
});

describe("formatMobileDisplay", () => {
  it("formats +91 groups for 12-digit India numbers", () => {
    expect(formatMobileDisplay("9876543210", "919876543210")).toBe(
      "+91 98765 43210",
    );
  });

  it("falls back to raw mobile when not India-normalized", () => {
    expect(formatMobileDisplay("14155552671")).toBe("14155552671");
  });
});
