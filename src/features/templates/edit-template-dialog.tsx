"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Can } from "@/components/shared/can";
import { TemplateForm } from "@/features/templates/template-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WhatsAppTemplate } from "@/lib/db/templates";

export function EditTemplateDialog({
  template,
}: {
  template: WhatsAppTemplate;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="template.update">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 hover:text-violet-800 dark:bg-violet-500/20 dark:text-violet-300"
        onClick={() => setOpen(true)}
        title="Edit"
        aria-label="Edit template"
      >
        <Pencil className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(92dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit WhatsApp template</DialogTitle>
            <DialogDescription>
              Changes apply the next time someone picks this template.
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            mode="edit"
            templateId={template.id}
            initialName={template.name}
            initialContent={template.content}
            initialActive={template.is_active}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
