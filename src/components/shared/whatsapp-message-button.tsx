"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadWhatsAppTemplateOptionsAction } from "@/actions/templates";
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

const ADD_TEMPLATE_VALUE = "__add_template__";

type TemplateOption = {
  id: string;
  name: string;
  content: string;
  imageUrl: string | null;
};

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const valid = Boolean(normalizeMobile(mobile));
  const fieldId = customerId ?? inquiryId ?? "new";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTemplatesLoading(true);
    void loadWhatsAppTemplateOptionsAction()
      .then((result) => {
        if (cancelled) return;
        setTemplateOptions(result.templates ?? []);
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpen() {
    setMessage(defaultMessage);
    setSelectedTemplateId("");
    setError(undefined);
    setOpen(true);
  }

  function onTemplateChange(value: string) {
    if (value === ADD_TEMPLATE_VALUE) {
      setOpen(false);
      router.push("/templates");
      return;
    }
    setSelectedTemplateId(value);
    if (!value) {
      setMessage(defaultMessage);
      return;
    }
    const picked = templateOptions.find((t) => t.id === value);
    if (picked) setMessage(picked.content);
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
        variant="ghost"
        className={cn(
          "shrink-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-300",
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
        <DialogContent
          className={cn(
            "flex max-h-[min(92dvh,calc(100dvh-1rem))] w-[calc(100%-0.75rem)] max-w-lg flex-col gap-0 overflow-hidden p-0",
            "top-[max(0.5rem,env(safe-area-inset-top,0px))] translate-y-0 sm:top-1/2 sm:max-h-[min(90dvh,40rem)] sm:-translate-y-1/2",
          )}
        >
          <DialogHeader className="shrink-0 gap-1.5 border-b px-4 py-3 pr-11">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-sm">
              <WhatsAppIcon className="shrink-0 text-emerald-600" />
              <span className="truncate">WhatsApp message</span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs sm:text-sm">
              {customerName ? (
                <>
                  To{" "}
                  <span className="font-medium text-foreground">{customerName}</span>
                  {" · "}
                </>
              ) : null}
              <span className="tabular-nums">{mobile || "No mobile"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`wa-tpl-${fieldId}`}>Template</Label>
              <select
                id={`wa-tpl-${fieldId}`}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-70"
                value={selectedTemplateId}
                disabled={templatesLoading}
                onChange={(e) => onTemplateChange(e.target.value)}
              >
                {templatesLoading ? (
                  <option value="">Loading templates…</option>
                ) : (
                  <>
                    <option value="">Custom message</option>
                    {templateOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {templateOptions.length === 0 ? (
                      <option value={ADD_TEMPLATE_VALUE}>
                        + Add template…
                      </option>
                    ) : null}
                  </>
                )}
              </select>
              {!templatesLoading && templateOptions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No templates yet. Choose &quot;+ Add template…&quot; to create
                  one.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`wa-msg-${fieldId}`}>Message</Label>
              <Textarea
                id={`wa-msg-${fieldId}`}
                rows={4}
                value={message}
                placeholder="Type your message…"
                className="max-h-[min(36vh,16rem)] min-h-[5.5rem] resize-y text-sm leading-relaxed"
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              disabled={pending || !message.trim()}
              onClick={handleSend}
            >
              {pending ? "Opening…" : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
