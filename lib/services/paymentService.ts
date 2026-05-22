import { getSupabaseClient } from "@/lib/supabase/client";
import type { PaymentProof } from "@/lib/prode";

export async function submitPaymentToSupabase(userId: string, file: File) {
  const supabase = getSupabaseClient();
  const uploadedAt = new Date().toISOString();

  if (!supabase) {
    return null;
  }

  const storagePath = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-receipts")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error } = await supabase.from("payments").insert({
    user_id: userId,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    storage_path: storagePath,
    status: "pending_review",
    uploaded_at: uploadedAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("profiles").update({ payment_status: "pending_review" }).eq("id", userId);

  return {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    uploadedAt,
    status: "pending_review",
  } satisfies PaymentProof;
}
