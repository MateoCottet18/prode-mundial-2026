"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser, PaymentStatus, PaymentProof } from "@/lib/prode";
import { registerWithSupabase, type RegisterInput } from "@/lib/services/authService";
import { fetchProfiles, updateProfilePaymentStatus } from "@/lib/services/profileService";

/**
 * Hook de gestión de usuarios.
 *
 * Fuente única de verdad: `public.profiles` en Supabase.
 * - `registerParticipant` crea auth.user + profile.
 * - `updatePaymentStatus` actualiza el profile y refresca la lista.
 * - `submitPaymentProof` sólo refresca la lista; el insert real del comprobante
 *    lo hace `lib/services/paymentService.ts > submitPaymentToSupabase`
 *    desde la página /pago (que también sube el archivo a Storage).
 */
export function useUsers() {
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const profiles = await fetchProfiles();
      setRegisteredUsers(profiles ?? []);
    } catch (err) {
      console.error("[useUsers] error cargando profiles", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios.");
      setRegisteredUsers([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  useEffect(() => {
    const refresh = () => void loadUsers();
    window.addEventListener("prode-users-change", refresh);
    return () => window.removeEventListener("prode-users-change", refresh);
  }, [loadUsers]);

  const registerParticipant = async ({
    displayName,
    username,
    password,
    email,
  }: RegisterInput & { displayName?: string }) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const supabaseUser = await registerWithSupabase({
        name: (displayName ?? "").trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        password,
      });

      if (!supabaseUser) {
        return {
          ok: false,
          message:
            "Supabase no está configurado. Verificá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        };
      }

      window.dispatchEvent(new Event("prode-users-change"));
      return {
        ok: true,
        message: "Usuario registrado correctamente.",
        session: supabaseUser,
        requiresEmailConfirmation: supabaseUser.requiresEmailConfirmation,
        debug: supabaseUser.debug,
      };
    } catch (err) {
      const debug =
        typeof err === "object" && err && "debug" in err
          ? (err as { debug: unknown }).debug
          : undefined;
      return {
        ok: false,
        message: err instanceof Error ? err.message : "No se pudo registrar el usuario.",
        debug,
      };
    }
  };

  const updatePaymentStatus = async (
    userIdOrUsername: string,
    paymentStatus: PaymentStatus,
  ) => {
    setError(null);
    try {
      await updateProfilePaymentStatus(userIdOrUsername, paymentStatus);
      await loadUsers();
      window.dispatchEvent(new Event("prode-users-change"));
    } catch (err) {
      console.error("[useUsers] error actualizando payment_status", err);
      setError(err instanceof Error ? err.message : "No se pudo actualizar el pago.");
    }
  };

  /**
   * Marca localmente que el usuario subió un comprobante; el insert real ya
   * lo hizo `submitPaymentToSupabase` desde /pago. Acá sólo refrescamos.
   */
  const submitPaymentProof = async (_username: string, _proof: PaymentProof) => {
    // El insert real se hace desde `paymentService.submitPaymentToSupabase`.
    // Acá sólo refrescamos la lista para que la UI vea el cambio de estado.
    void _username;
    void _proof;
    await loadUsers();
    window.dispatchEvent(new Event("prode-users-change"));
  };

  return {
    registeredUsers,
    isReady,
    error,
    refreshUsers: loadUsers,
    registerParticipant,
    submitPaymentProof,
    updatePaymentStatus,
  };
}
