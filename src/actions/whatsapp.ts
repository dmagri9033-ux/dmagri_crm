"use server";

import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { buildWhatsAppWebUrl } from "@/lib/whatsapp/wa-me-url";

export type WhatsAppSendResult = {
  error?: string;
  success?: string;
  /** When Cloud API is not configured, client opens this URL (WhatsApp Web/App). */
  openUrl?: string;
  sentViaApi?: boolean;
};

async function sendViaCloudApi(
  phoneDigits: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp API not configured" };
  }

  const version = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v21.0";
  const res = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneDigits,
        type: "text",
        text: { body: message },
      }),
    },
  );

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: payload.error?.message || `WhatsApp API error (${res.status})`,
    };
  }

  return { ok: true };
}

export async function sendWhatsAppMessageAction(input: {
  mobile: string;
  message: string;
  customerId?: string;
  inquiryId?: string;
  customerName?: string;
}): Promise<WhatsAppSendResult> {
  try {
    const ctx = input.inquiryId
      ? await authorize("inquiry.view")
      : await authorize("customer.view");

    const message = input.message.trim();
    if (!message) return { error: "Message is required." };
    if (message.length > 4096) {
      return { error: "Message is too long for WhatsApp." };
    }

    const phoneDigits = normalizeMobile(input.mobile);
    if (!phoneDigits) {
      return { error: "Enter a valid mobile number before sending WhatsApp." };
    }

    const hasApiConfig =
      Boolean(process.env.WHATSAPP_ACCESS_TOKEN) &&
      Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);

    if (hasApiConfig) {
      const apiResult = await sendViaCloudApi(phoneDigits, message);
      if (!apiResult.ok) {
        return { error: apiResult.error };
      }

      await logActivity({
        actorId: ctx.userId,
        action: "WHATSAPP_SENT",
        module: input.inquiryId ? "inquiries" : "customers",
        entityType: input.inquiryId ? "inquiry" : "customer",
        entityId: input.inquiryId || input.customerId || phoneDigits,
        customerId: input.customerId,
        metadata: {
          via: "cloud_api",
          customerName: input.customerName,
        },
      });

      return {
        success: "Message sent on WhatsApp.",
        sentViaApi: true,
      };
    }

    const openUrl = buildWhatsAppWebUrl(input.mobile, message);
    if (!openUrl) {
      return { error: "Could not build WhatsApp link for this number." };
    }

    return {
      success: "Opening WhatsApp to send your message.",
      openUrl,
      sentViaApi: false,
    };
  } catch (error) {
    return toActionError(error);
  }
}
