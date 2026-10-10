"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { cn } from "@/lib/utils";

function digitsForCopy(mobile: string): string {
  const normalized = normalizeMobile(mobile);
  if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
    return normalized.slice(2);
  }
  const digits = mobile.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function CopyMobileButton({
  mobile,
  className,
}: {
  mobile: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const value = digitsForCopy(mobile);
  const canCopy = value.length >= 10;

  async function handleCopy() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older browsers / denied clipboard
      const input = document.createElement("input");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn(
        "shrink-0 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
        copied &&
          "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-300",
        className,
      )}
      disabled={!canCopy}
      title={
        canCopy
          ? copied
            ? "Copied"
            : "Copy mobile number"
          : "Enter a valid mobile number to copy"
      }
      aria-label={copied ? "Copied" : "Copy mobile number"}
      onClick={() => void handleCopy()}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
