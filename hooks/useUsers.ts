"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppUser, PaymentStatus, PaymentProof } from "@/lib/prode";
import { registerWithSupabase, type RegisterInput } from "@/lib/services/authService";
import {
  fetchLatestPaymentsByUserIds,
  notifyPaymentApproved,
  updateLatestPaymentStatus,
} from "@/lib/services/paymentService";
import { fetchProfiles, updateProfilePaymentStatus } from "@/lib/services/profileService";

/**
 * Hook de gestión de usuarios.
 *
 * Fuente única de verdad: `public.profiles` + `public.payments` en Supabase.
 *
 * - `registerParticipant` crea auth.user + profile.
 * - `updatePaymentStatus` actualiza el profile + el payment más reciente.
 * - Después de cargar profiles, mergeamos el último `payments.payer_name` de
 *   cada uno (para que el admin vea quién hizo la transferencia).
 * - `submitPaymentProof` queda sólo como notifier: el insert real lo hace
 *   `paymentService.submitPaymentDeclaration` desde la página /pago.
 */
export function useUsers() {
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita que múltiples dispatches de `prode-users-change` lancen N fetches
  // en paralelo (pasaba con admin: aprobar pago → loadUsers + dispatch →
  // listener → loadUsers de nuevo).
  const isLoadingRef = useRef(false);

  const loadUsers = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    console.log("[perf] fetch users");
    setError(null);
    try {
      const profiles = await fetchProfiles();
      const profileList = profiles ?? [];
      const userIds = profileList
        .map((p) => p.id)
        .filter((id): id is string => Boolean(id));
      const latestPayments = await fetchLatestPaymentsByUserIds(userIds);

      const merged: AppUser[] = profileList.map((profile) => {
        const payment = profile.id ? latestPayments[profile.id] : undefined;
        if (!payment) {
          return profile;
        }
        const proof: PaymentProof = {
          payerName: payment.payerName,
          uploadedAt: payment.uploadedAt,
          status: payment.status,
          fileName: payment.fileName,
          fileSize: payment.fileSize,
          fileType: payment.fileType,
        };
        return { ...profile, paymentProof: proof };
      });

      setRegisteredUsers(merged);
    } catch (err) {
      console.error("[useUsers] error cargando profiles", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios.");
      setRegisteredUsers([]);
    } finally {
      setIsReady(true);
      isLoadingRef.current = false;
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
      const userId = await updateProfilePaymentStatus(userIdOrUsername, paymentStatus);
      if (userId) {
        await updateLatestPaymentStatus(userId, paymentStatus);
        // Email best-effort: si falla NO rompe la aprobación.
        if (paymentStatus === "approved") {
          void notifyPaymentApproved(userId);
        }
      }
      window.dispatchEvent(new Event("prode-users-change"));
    } catch (err) {
      console.error("[useUsers] error actualizando payment_status", err);
      setError(err instanceof Error ? err.message : "No se pudo actualizar el pago.");
    }
  };

  /**
   * Notifica al resto de la app que el usuario declaró un pago. El insert
   * real ya lo hizo `paymentService.submitPaymentDeclaration` desde /pago.
   */
  const submitPaymentProof = async (_username: string, _proof: PaymentProof) => {
    void _username;
    void _proof;
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
