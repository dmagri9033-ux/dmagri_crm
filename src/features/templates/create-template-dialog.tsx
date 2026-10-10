"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="template.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(92dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add WhatsApp template</DialogTitle>
            <DialogDescription>
              Saved templates appear in the WhatsApp message dialog.
            </DialogDescription>
          </DialogHeader>
          <TemplateForm mode="create" onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
