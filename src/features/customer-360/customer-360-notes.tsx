"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  addCustomerNoteAction,
  type Customer360ActionState,
} from "@/actions/customer-360";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIstDateTime } from "@/lib/datetime/ist";
import type { Customer360Note } from "@/lib/db/customer-360";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Add note"}
    </Button>
  );
}

export function Customer360Notes({
  customerId,
  notes,
}: {
  customerId: string;
  notes: Customer360Note[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<Customer360ActionState, FormData>(
    addCustomerNoteAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-4">
      <Can permission="customer.update">
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="customerId" value={customerId} />
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.success ? (
            <Alert>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="body">Add a note</Label>
            <Textarea id="body" name="body" rows={3} required placeholder="Write a note…" />
          </div>
          <SubmitButton />
        </form>
      </Can>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No threaded notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{note.created_by_profile?.display_name ?? "Unknown"}</span>
                <span>·</span>
                <span>{formatIstDateTime(note.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap">{note.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
