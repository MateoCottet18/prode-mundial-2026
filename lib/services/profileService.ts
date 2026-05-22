import { getSupabaseClient } from "@/lib/supabase/client";
import type { AppUser, PaymentStatus, UserRole } from "@/lib/prode";

export type CreateProfileInput = {
  id: string;
  name: string;
  email: string;
  username: string;
};

export async function createProfile(input: CreateProfileInput) {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as {
    error?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  if (!response.ok) {
    console.error("error insertando profile", {
      status: response.status,
      ...data,
    });
    throw new Error(
      [
        `POST /api/profiles status ${response.status}`,
        data.error,
        data.details ? `details: ${data.details}` : "",
        data.hint ? `hint: ${data.hint}` : "",
        data.code ? `code: ${data.code}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return { status: response.status };
}

export async function fetchProfiles() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,username,role,payment_status,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data.map((profile) => ({
    id: profile.id,
    username: profile.username,
    password: "",
    role: mapProfileRole(String(profile.role)),
    displayName: profile.name,
    email: profile.email,
    paymentStatus: profile.payment_status,
    createdAt: profile.created_at,
  })) satisfies AppUser[];
}

export async function updateProfilePaymentStatus(userIdOrUsername: string, paymentStatus: PaymentStatus) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const query = supabase.from("profiles").update({ payment_status: paymentStatus });
  const { error } = isUuid(userIdOrUsername)
    ? await query.eq("id", userIdOrUsername)
    : await query.eq("username", userIdOrUsername);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export function mapProfileRole(role: string): UserRole {
  return role === "admin" ? "admin" : "participante";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
