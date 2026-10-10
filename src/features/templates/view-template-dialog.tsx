"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WhatsAppTemplate } from "@/lib/db/templates";
import { cn } from "@/lib/utils";

export function ViewTemplateDialog({
  template,
}: {
  template: WhatsAppTemplate;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:hover:text-sky-200"
        onClick={() => setOpen(true)}
        title="View"
        aria-label="View template"
      >
        <Eye className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(92dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-8">{template.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                  template.is_active
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {template.is_active ? "Active" : "Inactive"}
              </span>
              <span>WhatsApp message template</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Content</p>
            <div className="max-h-[min(50vh,22rem)] overflow-y-auto rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {template.content}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
