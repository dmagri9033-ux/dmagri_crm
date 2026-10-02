"use client";

import { useState, useTransition } from "react";
import { sendWhatsAppMessageAction } from "@/actions/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-4 fill-current", className)}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsAppMessageButton({
  mobile,
  customerName,
  customerId,
  inquiryId,
  defaultMessage = "",
  className,
}: {
  mobile: string;
  customerName?: string;
  customerId?: string;
  inquiryId?: string;
  defaultMessage?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const valid = Boolean(normalizeMobile(mobile));

  function handleOpen() {
    setMessage(defaultMessage);
    setError(undefined);
    setOpen(true);
  }

  function handleSend() {
    setError(undefined);
    startTransition(async () => {
      const result = await sendWhatsAppMessageAction({
        mobile,
        message,
        customerId,
        inquiryId,
        customerName,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.openUrl) {
        window.open(result.openUrl, "_blank", "noopener,noreferrer");
      }

      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className={cn(
          "shrink-0 border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400",
          className,
        )}
        disabled={!valid}
        title={
          valid
            ? "Send WhatsApp message"
            : "Add a valid mobile number to message on WhatsApp"
        }
        aria-label="Send WhatsApp message"
        onClick={handleOpen}
      >
        <WhatsAppIcon />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WhatsAppIcon className="text-emerald-600" />
              WhatsApp message
            </DialogTitle>
            <DialogDescription>
              {customerName ? (
                <>
                  To <span className="font-medium text-foreground">{customerName}</span>
                  {" · "}
                </>
              ) : null}
              {mobile || "No mobile"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`wa-msg-${customerId ?? inquiryId ?? "new"}`}>
                Message
              </Label>
              <Textarea
                id={`wa-msg-${customerId ?? inquiryId ?? "new"}`}
                rows={5}
                value={message}
                placeholder="Type your message…"
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={pending || !message.trim()}
                onClick={handleSend}
              >
                {pending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
