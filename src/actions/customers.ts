"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import {
  findCustomerByNormalizedMobile,
  getCustomerById,
} from "@/lib/db/customers";
import { createClient } from "@/lib/supabase/server";
import { customerFormSchema } from "@/validations/customer";

export type CustomerActionState = {
  error?: string;
  success?: string;
  customerId?: string;
  duplicate?: {
    id: string;
    name: string;
    mobile: string;
  };
};

function parseCustomerForm(formData: FormData) {
  const customerTypeRaw = String(formData.get("customer_type") || "").trim();
  const productIdRaw = String(formData.get("primary_product_id") || "").trim();

  return customerFormSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    customer_type: customerTypeRaw === "" ? null : customerTypeRaw,
    primary_product_id: productIdRaw === "" ? null : productIdRaw,
    product_purchased:
      formData.get("product_purchased") === "on" ||
      formData.get("product_purchased") === "true",
    follow_up_required:
      formData.get("follow_up_required") === "on" ||
      formData.get("follow_up_required") === "true",
    notes: formData.get("notes") || "",
  });
}

function customerPayload(
  parsed: {
    name: string;
    mobile: string;
    customer_type?: string | null;
    primary_product_id?: string | null;
    product_purchased: boolean;
    follow_up_required: boolean;
    notes?: string;
  },
  mobileNormalized: string,
) {
  return {
    name: parsed.name,
    mobile: parsed.mobile.trim(),
    mobile_normalized: mobileNormalized,
    customer_type: parsed.customer_type ?? null,
    primary_product_id: parsed.primary_product_id ?? null,
    product_purchased: parsed.product_purchased,
    follow_up_required: parsed.follow_up_required,
    notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
  };
}

export async function createCustomerAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const ctx = await authorize("customer.create");
    const updateExisting = formData.get("updateExisting") === "true";
    const existingId = String(formData.get("existingCustomerId") || "");

    const parsed = parseCustomerForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid customer" };
    }

    const mobileNormalized = normalizeMobile(parsed.data.mobile);
    if (!mobileNormalized) {
      return { error: "Enter a valid mobile number" };
    }

    // Explicit update-existing path from duplicate warning UI
    if (updateExisting && existingId) {
      await authorize("customer.update");
      const supabase = await createClient();
      const { error } = await supabase
        .from("customers")
        .update(customerPayload(parsed.data, mobileNormalized))
        .eq("id", existingId)
        .is("deleted_at", null);

      if (error) {
        if (error.code === "23505") {
          return { error: "Another customer already uses this mobile number." };
        }
        throw new Error(error.message);
      }

      revalidatePath("/customers");
      revalidatePath(`/customers/${existingId}`);
      await logActivity({
        actorId: ctx.userId,
        action: "CUSTOMER_UPDATED",
        module: "customers",
        entityType: "customer",
        entityId: existingId,
        customerId: existingId,
        metadata: { via: "duplicate_merge" },
      });
      return {
        success: "Existing customer updated.",
        customerId: existingId,
      };
    }

    const duplicate = await findCustomerByNormalizedMobile(mobileNormalized);
    if (duplicate) {
      return {
        error: "A customer with this mobile number already exists.",
        duplicate: {
          id: duplicate.id,
          name: duplicate.name,
          mobile: duplicate.mobile,
        },
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        ...customerPayload(parsed.data, mobileNormalized),
        created_by: ctx.userId,
        assigned_user_id: ctx.userId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        const again = await findCustomerByNormalizedMobile(mobileNormalized);
        if (again) {
          return {
            error: "A customer with this mobile number already exists.",
            duplicate: {
              id: again.id,
              name: again.name,
              mobile: again.mobile,
            },
          };
        }
        return { error: "A customer with this mobile number already exists." };
      }
      throw new Error(error.message);
    }

    revalidatePath("/customers");
    await logActivity({
      actorId: ctx.userId,
      action: "CUSTOMER_CREATED",
      module: "customers",
      entityType: "customer",
      entityId: data.id,
      customerId: data.id,
    });
    return { success: "Customer created.", customerId: data.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCustomerAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const ctx = await authorize("customer.update");

    const customerId = String(formData.get("customerId") || "");
    if (!customerId) return { error: "Missing customer id" };

    const parsed = parseCustomerForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid customer" };
    }

    const mobileNormalized = normalizeMobile(parsed.data.mobile);
    if (!mobileNormalized) {
      return { error: "Enter a valid mobile number" };
    }

    const duplicate = await findCustomerByNormalizedMobile(
      mobileNormalized,
      customerId,
    );
    if (duplicate) {
      return {
        error: "Another customer already uses this mobile number.",
        duplicate: {
          id: duplicate.id,
          name: duplicate.name,
          mobile: duplicate.mobile,
        },
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update(customerPayload(parsed.data, mobileNormalized))
      .eq("id", customerId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "Another customer already uses this mobile number." };
      }
      throw new Error(error.message);
    }

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    await logActivity({
      actorId: ctx.userId,
      action: "CUSTOMER_UPDATED",
      module: "customers",
      entityType: "customer",
      entityId: customerId,
      customerId,
    });
    return { success: "Customer updated.", customerId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCustomerAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const ctx = await authorize("customer.delete");

    const customerId = String(formData.get("customerId") || "");
    if (!customerId) return { error: "Missing customer id" };

    const existing = await getCustomerById(customerId);
    if (!existing) return { error: "Customer not found." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", customerId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    revalidatePath("/customers");
    await logActivity({
      actorId: ctx.userId,
      action: "CUSTOMER_DELETED",
      module: "customers",
      entityType: "customer",
      entityId: customerId,
      customerId,
    });
    return { success: "Customer deleted." };
  } catch (error) {
    return toActionError(error);
  }
}
