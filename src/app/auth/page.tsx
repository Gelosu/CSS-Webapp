"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token || !isFirebaseConfigured) {
      router.replace("/login");
      return;
    }
    signInWithCustomToken(getFirebaseAuth(), token)
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login"));
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <p className="text-white text-lg animate-pulse">Signing you in…</p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthHandler />
    </Suspense>
  );
}
