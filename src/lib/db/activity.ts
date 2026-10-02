import { createClient } from "@/lib/supabase/server";
import { administratorCreatorOrFilter } from "@/lib/rbac/administrator";
import type { Tables } from "@/types/database.types";
import {
  activityFilterSchema,
  type ActivityFilterInput,
} from "@/validations/activity";

export type ProfileLite = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
export type CustomerLite = Pick<
  Tables<"customers">,
  "id" | "name" | "mobile" | "mobile_normalized"
>;

export type ActivityLogWithRelations = Tables<"activity_logs"> & {
  actor: ProfileLite | null;
  customers: CustomerLite | null;
};

export type ActivityListResult = {
  logs: ActivityLogWithRelations[];
  total: number;
  page: number;
  pageSize: number;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapLog(row: never): ActivityLogWithRelations {
  const r = row as Tables<"activity_logs"> & {
    actor: ProfileLite | ProfileLite[] | null;
    customers: CustomerLite | CustomerLite[] | null;
  };
  return {
    ...r,
    actor: one(r.actor),
    customers: one(r.customers),
  };
}

const ACTIVITY_SELECT = `
  *,
  actor:actor_id ( id, display_name, email ),
  customers:customer_id ( id, name, mobile, mobile_normalized )
`;

export async function listActivityLogs(
  rawFilters: Partial<ActivityFilterInput> = {},
): Promise<ActivityListResult> {
  const filters = activityFilterSchema.parse(rawFilters);
  const supabase = await createClient();

  let query = supabase
    .from("activity_logs")
    .select(ACTIVITY_SELECT, { count: "exact" });

  if (filters.module !== "all") {
    query = query.eq("module", filters.module);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }

  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00+05:30`);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999+05:30`);
  }

  if (filters.search) {
    const q = filters.search;
    query = query.or(
      `action.ilike.%${q}%,module.ilike.%${q}%,entity_type.ilike.%${q}%`,
    );
  }

  const hideAdminCreated = await administratorCreatorOrFilter("actor_id");
  if (hideAdminCreated) query = query.or(hideAdminCreated);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    logs: (data ?? []).map((row) => mapLog(row as never)),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function listDistinctActivityActions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("action")
    .order("action", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.action))];
}
