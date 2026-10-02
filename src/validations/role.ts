import { z } from "zod";
import { PERMISSION_CODES, type PermissionCode } from "@/lib/rbac/permissions";

const permissionCodeSchema = z.custom<PermissionCode>(
  (value) => typeof value === "string" && (PERMISSION_CODES as readonly string[]).includes(value),
  { message: "Invalid permission code" },
);

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(80, "Role name is too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
  permissionCodes: z
    .array(permissionCodeSchema)
    .min(1, "Select at least one permission"),
});

export type RoleFormInput = z.infer<typeof roleFormSchema>;
