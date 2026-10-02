"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  addReminderQuickAction,
  type Customer360ActionState,
} from "@/actions/customer-360";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Add reminder"}
    </Button>
  );
}

export function AddReminderDialog({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction] = useActionState<Customer360ActionState, FormData>(
    addReminderQuickAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add reminder
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add reminder</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="customerId" value={customerId} />
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Call customer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remindAt">Date & time (IST)</Label>
              <Input id="remindAt" name="remindAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
