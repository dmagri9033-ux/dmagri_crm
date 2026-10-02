import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/rbac/authorize";
import type { PermissionCode } from "@/lib/rbac/permissions";

describe("hasPermission", () => {
  const codes: PermissionCode[] = [
    "dashboard.view",
    "customer.view",
    "inquiry.create",
  ];

  it("checks Set membership", () => {
    const set = new Set(codes);
    expect(hasPermission(set, "customer.view")).toBe(true);
    expect(hasPermission(set, "customer.delete")).toBe(false);
  });

  it("checks array membership", () => {
    expect(hasPermission(codes, "inquiry.create")).toBe(true);
    expect(hasPermission(codes, "role.view")).toBe(false);
  });
});
