"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, ExternalLink } from "lucide-react";
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
  const [templateOptions, setTemplateOptions] = useState<
    { id: string; name: string; content: string; imageUrl: string | null }[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const valid = Boolean(normalizeMobile(mobile));
  const selectedTemplate = templateOptions.find(
    (t) => t.id === selectedTemplateId,
  );
  const selectedImageUrl = selectedTemplate?.imageUrl ?? null;

  useEffect(() => {
    if (!open) return;
    void loadWhatsAppTemplateOptionsAction().then((result) => {
      if (result.templates) setTemplateOptions(result.templates);
    });
  }, [open]);

  function handleOpen() {
    setMessage(defaultMessage);
    setSelectedTemplateId("");
    setError(undefined);
    setOpen(true);
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setMessage(defaultMessage);
      return;
    }
    const picked = templateOptions.find((t) => t.id === templateId);
    if (picked) setMessage(picked.content);
  }

  function openTemplateImage() {
    if (!selectedImageUrl) return;
    window.open(selectedImageUrl, "_blank", "noopener,noreferrer");
  }

  function downloadTemplateImage() {
    if (!selectedImageUrl) return;
    const link = document.createElement("a");
    link.href = selectedImageUrl;
    link.download = `${selectedTemplate?.name?.trim() || "whatsapp-template"}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
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

      // Small-team flow: wa.me sends text only — open image so staff can attach it in WhatsApp.
      if (selectedImageUrl) {
        window.setTimeout(() => {
          window.open(selectedImageUrl, "_blank", "noopener,noreferrer");
        }, 400);
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
            {templateOptions.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor={`wa-tpl-${customerId ?? inquiryId ?? "new"}`}>
                  Template
                </Label>
                <select
                  id={`wa-tpl-${customerId ?? inquiryId ?? "new"}`}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                >
                  <option value="">Custom message</option>
                  {templateOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {selectedImageUrl ? (
                  <div className="overflow-hidden rounded-md border bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImageUrl}
                      alt=""
                      className="max-h-[min(28vh,9rem)] w-full object-contain sm:max-h-36"
                    />
                    <div className="space-y-2 px-2.5 py-2">
                      <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-snug text-muted-foreground">
                        <li>
                          <span className="font-medium text-foreground">Send</span>{" "}
                          opens WhatsApp with the text filled in.
                        </li>
                        <li>
                          In WhatsApp, tap attach / paperclip and pick this image
                          (image tab also opens after Send).
                        </li>
                      </ol>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs"
                          onClick={openTemplateImage}
                        >
                          <ExternalLink className="size-3.5" />
                          Open image
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs"
                          onClick={downloadTemplateImage}
                        >
                          <Download className="size-3.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`wa-msg-${customerId ?? inquiryId ?? "new"}`}>
                Message
              </Label>
              <Textarea
                id={`wa-msg-${customerId ?? inquiryId ?? "new"}`}
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
              {pending
                ? "Opening…"
                : selectedImageUrl
                  ? "Send text + open image"
                  : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
