import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

export type ProfileWithRole = Profile & {
  roles: Pick<Tables<"roles">, "id" | "name" | "is_system"> | null;
};

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
