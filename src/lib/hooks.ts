"use client";

import { useEffect, useState } from "react";
import type { Classroom, DownloadInvite, Student, StaffMember, SupportMessage, SupportTicket } from "@/types";
import { subscribeToClassrooms } from "./classrooms";
import { fetchStudentsOnce, subscribeToStudents } from "./students";
import { subscribeToInvites } from "./download-invites";
import { subscribeToStaff } from "./staff";
import { subscribeToAllTickets, subscribeToOwnTickets, subscribeToMessages } from "./support-tickets";

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStudents(
      (data) => {
        setStudents(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { students, loading, error };
}

// Polls instead of subscribing live — used by analytics views where
// second-by-second freshness isn't needed and a standing realtime listener
// would be unnecessary load.
export function useStudentsPolling(intervalMs = 15000) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const data = await fetchStudentsOnce();
        if (cancelled) return;
        setStudents(data);
        setLastUpdated(Date.now());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load students.");
        setLoading(false);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { students, loading, error, lastUpdated };
}

export function useDownloadInvites(classroomId: string) {
  const [invites, setInvites] = useState<DownloadInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInvites(
      classroomId,
      (data) => {
        setInvites(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [classroomId]);

  return { invites, loading, error };
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStaff(
      (data) => {
        setStaff(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { staff, loading, error };
}

export function useAllTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllTickets(
      (data) => {
        setTickets(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { tickets, loading, error };
}

export function useOwnTickets(teacherId: string | null) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) return;
    const unsubscribe = subscribeToOwnTickets(
      teacherId,
      (data) => {
        setTickets(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [teacherId]);

  return teacherId ? { tickets, loading, error } : { tickets: [], loading: false, error: null };
}

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    const unsubscribe = subscribeToMessages(
      ticketId,
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [ticketId]);

  return ticketId ? { messages, loading } : { messages: [], loading: false };
}

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToClassrooms(
      (data) => {
        setClassrooms(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { classrooms, loading, error };
}
