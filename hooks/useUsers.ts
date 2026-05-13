"use client";

import { useEffect, useState } from "react";
import { fixedUsers, seedParticipantUsers, type AppUser, type PaymentProof } from "@/lib/prode";
import { migrateLegacyStorage, readStorage, storageKeys, writeStorage } from "@/lib/storage";

export function useUsers() {
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    const normalizedUsers = normalizeRegisteredUsers(readStorage<AppUser[]>(storageKeys.registeredUsers, []));
    setRegisteredUsers(normalizedUsers);
    writeStorage(storageKeys.registeredUsers, normalizedUsers);
    setIsReady(true);
  }, []);

  const registerParticipant = ({
    displayName,
    username,
    password,
  }: {
    displayName: string;
    username: string;
    password: string;
  }) => {
    const normalizedUsername = username.trim().toLowerCase();
    const allUsers = [...fixedUsers, ...seedParticipantUsers, ...registeredUsers];
    const usernameExists = allUsers.some((user) => user.username === normalizedUsername);

    if (usernameExists) {
      return { ok: false, message: "Ese usuario ya existe." };
    }

    const nextUsers = [
      ...registeredUsers,
      {
        username: normalizedUsername,
        password,
        role: "participante" as const,
        displayName: displayName.trim(),
        paymentStatus: "pending" as const,
      },
    ];
    const createdUser = nextUsers[nextUsers.length - 1];

    setRegisteredUsers(nextUsers);
    writeStorage(storageKeys.registeredUsers, nextUsers);
    window.dispatchEvent(new Event("prode-users-change"));
    return { ok: true, message: "Usuario registrado correctamente.", user: createdUser };
  };

  const updatePaymentStatus = (
    username: string,
    paymentStatus: AppUser["paymentStatus"],
    paymentData?: Partial<Pick<AppUser, "paidAt" | "rejectedAt" | "paymentProof">>,
  ) => {
    const nextUsers = registeredUsers.map((user) =>
      user.username === username
        ? {
            ...user,
            ...paymentData,
            paymentStatus,
            paymentProof: paymentData?.paymentProof ?? (user.paymentProof ? { ...user.paymentProof, status: paymentStatus } : undefined),
          }
        : user,
    );

    setRegisteredUsers(nextUsers);
    writeStorage(storageKeys.registeredUsers, nextUsers);
    window.dispatchEvent(new Event("prode-users-change"));
  };

  const submitPaymentProof = (username: string, paymentProof: PaymentProof) => {
    const nextUsers = registeredUsers.map((user) =>
      user.username === username
        ? {
            ...user,
            paymentProof,
            paymentStatus: "pending_review" as const,
            paidAt: undefined,
            rejectedAt: undefined,
          }
        : user,
    );

    setRegisteredUsers(nextUsers);
    writeStorage(storageKeys.registeredUsers, nextUsers);
    window.dispatchEvent(new Event("prode-users-change"));
  };

  useEffect(() => {
    const handleUsersChange = () => {
      const normalizedUsers = normalizeRegisteredUsers(readStorage<AppUser[]>(storageKeys.registeredUsers, []));
      setRegisteredUsers(normalizedUsers);
      writeStorage(storageKeys.registeredUsers, normalizedUsers);
    };

    window.addEventListener("prode-users-change", handleUsersChange);
    window.addEventListener("storage", handleUsersChange);

    return () => {
      window.removeEventListener("prode-users-change", handleUsersChange);
      window.removeEventListener("storage", handleUsersChange);
    };
  }, []);

  return { registeredUsers, isReady, registerParticipant, submitPaymentProof, updatePaymentStatus };
}

function normalizeRegisteredUsers(users: AppUser[]) {
  return users.map((user) => ({
    ...user,
    paymentStatus: normalizePaymentStatus(user.paymentStatus),
    paymentProof: normalizePaymentProof(user.paymentProof, normalizePaymentStatus(user.paymentStatus)),
  }));
}

function normalizePaymentProof(
  paymentProof: (PaymentProof & { dataUrl?: string; submittedAt?: string }) | undefined,
  paymentStatus: AppUser["paymentStatus"],
) {
  if (!paymentProof) {
    return undefined;
  }

  return {
    fileName: paymentProof.fileName,
    fileType: paymentProof.fileType,
    fileSize: paymentProof.fileSize ?? 0,
    uploadedAt: paymentProof.uploadedAt ?? paymentProof.submittedAt ?? new Date().toISOString(),
    status: paymentProof.status ?? paymentStatus,
  };
}

function normalizePaymentStatus(status: AppUser["paymentStatus"] | "pendiente" | "confirmado") {
  if (status === "confirmado") {
    return "approved";
  }

  if (status === "pendiente") {
    return "pending";
  }

  return status ?? "pending";
}
