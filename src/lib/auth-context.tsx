"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { bootstrapRole } from "./staff";
import type { StaffRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  role: StaffRole | null;
  // The one classroom this user (if a teacher) is scoped to. Null for admins.
  classCode: string | null;
  roleLoading: boolean;
  configured: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  // Re-fetches role/classCode without a full reload — used right after a
  // teacher claims a newly-created classroom as their own.
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED_MESSAGE =
  "Firebase is not configured yet. Add your project keys to .env.local.";

const REMEMBER_KEY = "admin-css-remember-me";

function isRemembered() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [classCode, setClassCode] = useState<string | null>(null);
  // Tracks which uid `role` was last resolved for, so loading state can be
  // derived (role stale/absent for the current user = still loading) rather
  // than toggled synchronously inside the effect.
  const [roleResolvedForUid, setRoleResolvedForUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    bootstrapRole()
      .then((profile) => {
        if (cancelled) return;
        setRole(profile.role);
        setClassCode(profile.classCode);
        setRoleResolvedForUid(user.uid);
      })
      .catch(() => {
        if (cancelled) return;
        setRole(null);
        setClassCode(null);
        setRoleResolvedForUid(user.uid);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const roleLoading = Boolean(user) && roleResolvedForUid !== user?.uid;

  async function refreshRole() {
    if (!user) return;
    const profile = await bootstrapRole();
    setRole(profile.role);
    setClassCode(profile.classCode);
  }

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const remembered = isRemembered();

    // Session-only persistence by default: clears when the tab/browser is
    // closed. "Remember me" opts into surviving browser restarts instead.
    setPersistence(
      getFirebaseAuth(),
      remembered ? browserLocalPersistence : browserSessionPersistence
    ).catch(() => {});

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Explicit sign-out on tab close / navigation away as a belt-and-suspenders
    // measure, skipped when the admin opted into "remember me".
    let handlePageHide: (() => void) | undefined;
    if (!remembered) {
      handlePageHide = () => {
        signOut(getFirebaseAuth()).catch(() => {});
      };
      window.addEventListener("pagehide", handlePageHide);
    }

    return () => {
      unsubscribe();
      if (handlePageHide) window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  async function login(email: string, password: string, remember = false) {
    if (!isFirebaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE);
    await setPersistence(
      getFirebaseAuth(),
      remember ? browserLocalPersistence : browserSessionPersistence
    );
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    try {
      window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    } catch {}
  }

  async function logout() {
    if (!isFirebaseConfigured) return;
    await signOut(getFirebaseAuth());
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role: user ? role : null,
        classCode: user ? classCode : null,
        roleLoading,
        configured: isFirebaseConfigured,
        login,
        logout,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
