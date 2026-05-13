"use client";

import { useEffect, useState } from "react";
import { authenticate, getAllUsers, type AppUser, type SessionUser } from "@/lib/prode";
import { migrateLegacyStorage, readStorage, removeStorage, storageKeys, writeStorage } from "@/lib/storage";

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    setUser(resolveStoredSession());
    setIsReady(true);
  }, []);

  const login = (username: string, password: string) => {
    const registeredUsers = readStorage<AppUser[]>(storageKeys.registeredUsers, []);
    const authenticatedUser = authenticate(username.trim().toLowerCase(), password, registeredUsers);

    if (!authenticatedUser) {
      return false;
    }

    writeStorage(storageKeys.session, toStoredSession(authenticatedUser));
    setUser(authenticatedUser);
    window.dispatchEvent(new Event("prode-session-change"));
    return true;
  };

  const logout = () => {
    removeStorage(storageKeys.session);
    setUser(null);
    window.dispatchEvent(new Event("prode-session-change"));
  };

  useEffect(() => {
    const handleSessionChange = () => {
      setUser(resolveStoredSession());
    };

    window.addEventListener("prode-session-change", handleSessionChange);
    window.addEventListener("prode-users-change", handleSessionChange);
    window.addEventListener("storage", handleSessionChange);

    return () => {
      window.removeEventListener("prode-session-change", handleSessionChange);
      window.removeEventListener("prode-users-change", handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

  return { user, isReady, login, logout };
}

function resolveStoredSession() {
  const session = readStorage<SessionUser | null>(storageKeys.session, null);

  if (!session) {
    return null;
  }

  const registeredUsers = readStorage<AppUser[]>(storageKeys.registeredUsers, []);
  const latestUser = getAllUsers(registeredUsers).find(
    (candidate) => candidate.username === session.username,
  );

  if (!latestUser) {
    removeStorage(storageKeys.session);
    return null;
  }

  const nextSession = {
    userId: latestUser.username,
    username: latestUser.username,
    name: latestUser.displayName,
    role: latestUser.role,
    paymentStatus: normalizePaymentStatus(latestUser.paymentStatus),
  };

  writeStorage(storageKeys.session, toStoredSession(nextSession));
  return nextSession;
}

function toStoredSession(user: SessionUser) {
  return {
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    paymentStatus: user.paymentStatus,
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
