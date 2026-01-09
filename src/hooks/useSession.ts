"use client";

import { useEffect, useState } from "react";
import { client } from "@/lib/orpc";

type SessionResponse = {
  user: {
    id: string;
    name?: string | null;
    email: string;
    emailVerified?: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date | string;
  };
};

export function useSession() {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.auth
      .getSession()
      .then((res) => {
        if (!cancelled) setData(res as unknown as SessionResponse);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
