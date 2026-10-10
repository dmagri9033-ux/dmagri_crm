"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import {
  findCustomerByNormalizedMobile,
  getCustomerById,
  listCustomers,
  type CustomerWithProduct,
} from "@/lib/db/customers";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMER_TYPES,
  customerFilterSchema,
  customerFormSchema,
  type CustomerFilterInput,
} from "@/validations/customer";

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

export type CustomerGridResult = {
  error?: string;
  success?: string;
  customerId?: string;
  customer?: CustomerWithProduct;
  customers?: CustomerWithProduct[];
  total?: number;
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

export async function loadCustomersGridAction(
  rawFilters: Partial<CustomerFilterInput> = {},
): Promise<CustomerGridResult> {
  try {
    await authorize("customer.view");
    const filters = customerFilterSchema.parse(rawFilters);
    const result = await listCustomers(filters);
    return {
      customers: result.customers,
      total: result.total,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchCustomerFieldAction(input: {
  customerId: string;
  field:
    | "name"
    | "mobile"
    | "customer_type"
    | "primary_product_id"
    | "product_purchased"
    | "follow_up_required"
    | "notes";
  value: string;
}): Promise<CustomerGridResult> {
  try {
    const ctx = await authorize("customer.update");
    const existing = await getCustomerById(input.customerId);
    if (!existing) return { error: "Customer not found" };

    const supabase = await createClient();
    const patch: {
      name?: string;
      mobile?: string;
      mobile_normalized?: string;
      customer_type?: string | null;
      primary_product_id?: string | null;
      product_purchased?: boolean;
      follow_up_required?: boolean;
      notes?: string | null;
    } = {};

    if (input.field === "name") {
      const name = input.value.trim();
      if (/\d/.test(name)) {
        return { error: "Customer name cannot include numbers" };
      }
      if (name.length > 120) return { error: "Name is too long" };
      // Allow blank names — do not require or auto-fill.
      patch.name = name;
    } else if (input.field === "mobile") {
      const mobileNormalized = normalizeMobile(input.value);
      if (!mobileNormalized) {
        return { error: "Enter a valid mobile number" };
      }
      const duplicate = await findCustomerByNormalizedMobile(
        mobileNormalized,
        input.customerId,
      );
      if (duplicate) {
        return { error: "Another customer already uses this mobile number." };
      }
      patch.mobile = input.value.trim();
      patch.mobile_normalized = mobileNormalized;
    } else if (input.field === "customer_type") {
      const typeRaw = input.value.trim();
      if (typeRaw === "") {
        patch.customer_type = null;
      } else if (
        !CUSTOMER_TYPES.includes(typeRaw as (typeof CUSTOMER_TYPES)[number])
      ) {
        return { error: "Invalid customer type" };
      } else {
        patch.customer_type = typeRaw;
      }
    } else if (input.field === "primary_product_id") {
      const productId = input.value.trim() || null;
      patch.primary_product_id = productId;
      if (!productId && existing.product_purchased) {
        patch.product_purchased = false;
      }
    } else if (input.field === "product_purchased") {
      const purchased = input.value === "true" || input.value === "yes";
      if (purchased && !existing.primary_product_id) {
        return { error: "Select a product before marking purchased." };
      }
      patch.product_purchased = purchased;
    } else if (input.field === "follow_up_required") {
      patch.follow_up_required =
        input.value === "true" || input.value === "yes";
    } else if (input.field === "notes") {
      patch.notes = input.value.trim() ? input.value.trim() : null;
    } else {
      return { error: "Unknown field" };
    }

    const { error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", input.customerId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "Another customer already uses this mobile number." };
      }
      throw new Error(error.message);
    }

    revalidatePath("/customers");
    revalidatePath(`/customers/${input.customerId}`);
    void logActivity({
      actorId: ctx.userId,
      action: "CUSTOMER_UPDATED",
      module: "customers",
      entityType: "customer",
      entityId: input.customerId,
      customerId: input.customerId,
      metadata: { field: input.field, via: "grid" },
    });

    // Avoid a second round-trip — merge local state for the grid.
    let products = existing.products;
    if (input.field === "primary_product_id") {
      const productId = patch.primary_product_id ?? null;
      if (!productId) {
        products = null;
      } else if (existing.products?.id === productId) {
        products = existing.products;
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("id, name, is_active")
          .eq("id", productId)
          .maybeSingle();
        products = product ?? null;
      }
    }

    const customer: CustomerWithProduct = {
      ...existing,
      ...patch,
      products,
    };
    return {
      success: "Saved",
      customerId: input.customerId,
      customer,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCustomerGridRowAction(input: {
  name?: string;
  mobile: string;
  customer_type?: string;
  primary_product_id?: string;
  product_purchased?: boolean;
  follow_up_required?: boolean;
}): Promise<CustomerGridResult> {
  try {
    const ctx = await authorize("customer.create");
    const mobile = input.mobile.trim();
    const mobileNormalized = normalizeMobile(mobile);
    if (!mobile || !mobileNormalized) {
      return { error: "Enter a valid mobile number" };
    }

    const duplicate = await findCustomerByNormalizedMobile(mobileNormalized);
    if (duplicate) {
      return {
        error: "A customer with this mobile number already exists.",
      };
    }

    // Keep name blank when not provided — never invent "Customer {mobile}".
    const name = (input.name ?? "").trim();
    if (/\d/.test(name)) {
      return { error: "Customer name cannot include numbers" };
    }

    const typeRaw = (input.customer_type || "").trim();
    let customerType: string | null = null;
    if (typeRaw) {
      if (
        !CUSTOMER_TYPES.includes(typeRaw as (typeof CUSTOMER_TYPES)[number])
      ) {
        return { error: "Invalid customer type" };
      }
      customerType = typeRaw;
    }

    const productId = input.primary_product_id?.trim() || null;
    const purchased = Boolean(input.product_purchased && productId);
    const followUp = Boolean(input.follow_up_required);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name,
        mobile,
        mobile_normalized: mobileNormalized,
        customer_type: customerType,
        primary_product_id: productId,
        product_purchased: purchased,
        follow_up_required: followUp,
        created_by: ctx.userId,
        assigned_user_id: ctx.userId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          error: "A customer with this mobile number already exists.",
        };
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
      metadata: { via: "grid", mobile: mobileNormalized },
    });

    const customer = await getCustomerById(data.id);
    return {
      success: "Row added.",
      customerId: data.id,
      customer: customer ?? undefined,
    };
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
