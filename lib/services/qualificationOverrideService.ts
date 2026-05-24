import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Servicio de overrides de clasificación.
 *
 * Fuente de verdad: tabla `public.qualification_overrides` en Supabase.
 * Ver `supabase/qualification_overrides.sql` para el schema y RLS.
 *
 * Convenciones de slot:
 *   * '1A'..'2L'                 (24 slots de grupo)
 *   * 'BEST_THIRD_1'..'BEST_THIRD_8'  (mejores terceros)
 *   * '<stage>-<index>-<home|away>'   (ej '16avos-3-home')
 */

export type QualificationOverride = {
  id: string;
  stage: string;
  slot: string;
  teamName: string;
  reason: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export async function fetchQualificationOverrides(): Promise<QualificationOverride[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("qualification_overrides")
    .select("id,stage,slot,team_name,reason,updated_by,updated_at")
    .order("slot", { ascending: true });

  if (error) {
    console.error("[qualificationOverrideService] error leyendo overrides", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    stage: row.stage,
    slot: row.slot,
    teamName: row.team_name,
    reason: row.reason,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  }));
}

export type SaveOverrideInput = {
  slot: string;
  stage?: string;
  teamName: string;
  reason?: string | null;
  updatedBy?: string | null;
};

/**
 * Inserta o reemplaza un override (UPSERT por `slot`).
 * Devuelve `false` si Supabase no está configurado.
 */
export async function saveQualificationOverride(input: SaveOverrideInput): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const stage = input.stage ?? inferStageFromSlot(input.slot);

  const { error } = await supabase
    .from("qualification_overrides")
    .upsert(
      {
        slot: input.slot,
        stage,
        team_name: input.teamName,
        reason: input.reason ?? null,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot" },
    );

  if (error) {
    console.error("[qualificationOverrideService] error guardando override", error.message);
    throw new Error(error.message);
  }

  console.log(`[overrides] guardado override slot=${input.slot} team=${input.teamName}`);
  return true;
}

export async function deleteQualificationOverride(slot: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("qualification_overrides")
    .delete()
    .eq("slot", slot);

  if (error) {
    console.error("[qualificationOverrideService] error borrando override", error.message);
    throw new Error(error.message);
  }

  console.log(`[overrides] eliminado override slot=${slot}`);
  return true;
}

function inferStageFromSlot(slot: string): string {
  if (slot.startsWith("octavos-")) return "octavos";
  if (slot.startsWith("cuartos-")) return "cuartos";
  if (slot.startsWith("semifinal-")) return "semifinal";
  if (slot.startsWith("final-")) return "final";
  return "16avos";
}
