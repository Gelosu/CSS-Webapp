import { equalTo, onValue, orderByChild, push, query, ref, set, update } from "firebase/database";
import { getFirebaseDb } from "./firebase";
import type { StaffRole, SupportMessage, SupportTicket, TicketStatus } from "@/types";

function ticketsRef() {
  return ref(getFirebaseDb(), "supportTickets");
}

function ticketRef(ticketId: string) {
  return ref(getFirebaseDb(), `supportTickets/${ticketId}`);
}

function messagesRef(ticketId: string) {
  return ref(getFirebaseDb(), `supportTickets/${ticketId}/messages`);
}

type RawTicket = Omit<SupportTicket, "id">;

function mapTicket(id: string, data: RawTicket): SupportTicket {
  return {
    id,
    teacherId: data.teacherId,
    teacherName: data.teacherName,
    teacherEmail: data.teacherEmail,
    description: data.description,
    status: data.status ?? "open",
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

// Admin view: every report, most recently active first.
export function subscribeToAllTickets(
  onData: (tickets: SupportTicket[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    ticketsRef(),
    (snapshot) => {
      const value = snapshot.val() as Record<string, RawTicket> | null;
      const tickets = Object.entries(value ?? {}).map(([id, data]) => mapTicket(id, data));
      tickets.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(tickets);
    },
    onError
  );
}

// Teacher view: only their own reports.
export function subscribeToOwnTickets(
  teacherId: string,
  onData: (tickets: SupportTicket[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    query(ticketsRef(), orderByChild("teacherId"), equalTo(teacherId)),
    (snapshot) => {
      const value = snapshot.val() as Record<string, RawTicket> | null;
      const tickets = Object.entries(value ?? {}).map(([id, data]) => mapTicket(id, data));
      tickets.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(tickets);
    },
    onError
  );
}

export function subscribeToMessages(
  ticketId: string,
  onData: (messages: SupportMessage[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    messagesRef(ticketId),
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<SupportMessage, "id">> | null;
      const messages = Object.entries(value ?? {}).map(([id, data]) => ({
        id,
        from: data.from,
        authorId: data.authorId,
        authorName: data.authorName,
        text: data.text,
        createdAt: data.createdAt ?? 0,
      } satisfies SupportMessage));
      messages.sort((a, b) => a.createdAt - b.createdAt);
      onData(messages);
    },
    onError
  );
}

export async function createTicket(input: {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  description: string;
}): Promise<string> {
  const newRef = push(ticketsRef());
  if (!newRef.key) throw new Error("Failed to send report.");
  const now = Date.now();
  await set(newRef, {
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    teacherEmail: input.teacherEmail,
    description: input.description,
    status: "open" as TicketStatus,
    createdAt: now,
    updatedAt: now,
  });
  return newRef.key;
}

// Sending a message reopens a resolved ticket when the teacher is the one
// replying — a Gmail/Zendesk-style thread, never a dead end the teacher can't
// continue.
export async function sendMessage(
  ticketId: string,
  message: { from: StaffRole; authorId: string; authorName: string; text: string },
  currentStatus: TicketStatus
) {
  const newMsgRef = push(messagesRef(ticketId));
  if (!newMsgRef.key) throw new Error("Failed to send message.");
  const now = Date.now();
  await set(newMsgRef, { ...message, createdAt: now });

  const nextStatus: TicketStatus =
    message.from === "teacher" && currentStatus === "resolved" ? "open" : currentStatus;
  await update(ticketRef(ticketId), { updatedAt: now, status: nextStatus });
}

export async function resolveTicket(ticketId: string) {
  await update(ticketRef(ticketId), { status: "resolved" as TicketStatus, updatedAt: Date.now() });
}
