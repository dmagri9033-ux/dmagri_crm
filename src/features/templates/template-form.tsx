"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createTemplateAction,
  updateTemplateAction,
  type TemplateActionState,
} from "@/actions/templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type TemplateFormProps = {
  mode: "create" | "edit";
  templateId?: string;
  initialName?: string;
  initialContent?: string;
  initialActive?: boolean;
  onSuccess?: () => void;
};

export function TemplateForm({
  mode,
  templateId,
  initialName = "",
  initialContent = "",
  initialActive = true,
  onSuccess,
}: TemplateFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createTemplateAction : updateTemplateAction;
  const [state, formAction] = useActionState<TemplateActionState, FormData>(
    action,
    {},
  );
  const [isActive, setIsActive] = useState(initialActive);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  return (
    <form action={formAction} className="space-y-4">
      {templateId ? (
        <input type="hidden" name="templateId" value={templateId} />
      ) : null}
      <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="template-name">Name</Label>
        <Input
          id="template-name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initialName}
          placeholder="e.g. Vitara Green intro"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-content">Message content</Label>
        <Textarea
          id="template-content"
          name="content"
          required
          rows={8}
          maxLength={4096}
          defaultValue={initialContent}
          placeholder="Type the WhatsApp message…"
          className="min-h-40 resize-y"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <span>Active (available in WhatsApp send dialog)</span>
      </label>

      <div className="flex justify-end gap-2">
        <SubmitButton
          label={mode === "create" ? "Add template" : "Save changes"}
        />
      </div>
    </form>
  );
}
