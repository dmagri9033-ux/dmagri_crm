"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PERMISSION_MODULES, type PermissionCode } from "@/lib/rbac/permissions";

type PermissionCheckboxGroupProps = {
  name?: string;
  value: PermissionCode[];
  onChange: (next: PermissionCode[]) => void;
  disabled?: boolean;
};

export function PermissionCheckboxGroup({
  name = "permissionCodes",
  value,
  onChange,
  disabled,
}: PermissionCheckboxGroupProps) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(code: PermissionCode, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    onChange([...next]);
  }

  function toggleModule(moduleCodes: PermissionCode[], checked: boolean) {
    const next = new Set(selected);
    for (const code of moduleCodes) {
      if (checked) next.add(code);
      else next.delete(code);
    }
    onChange([...next]);
  }

  function selectAll() {
    onChange(PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.code)));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{value.length} selected</Badge>
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={disabled}>
          Select all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={disabled}>
          Clear
        </Button>
      </div>

      <div className="space-y-4">
        {PERMISSION_MODULES.map((module) => {
          const codes = module.permissions.map((p) => p.code);
          const selectedCount = codes.filter((c) => selected.has(c)).length;
          const allSelected = selectedCount === codes.length;

          return (
            <div key={module.module} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      toggleModule(codes, checked === true)
                    }
                    aria-label={`Select all ${module.label}`}
                  />
                  <Label className="font-medium">{module.label}</Label>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedCount}/{codes.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {module.permissions.map((permission) => (
                  <label
                    key={permission.code}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(permission.code)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        toggle(permission.code, checked === true)
                      }
                    />
                    <span>{permission.label}</span>
                    <input
                      type="checkbox"
                      name={name}
                      value={permission.code}
                      checked={selected.has(permission.code)}
                      readOnly
                      className="sr-only"
                      tabIndex={-1}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
