export interface Classroom {
  id: string;
  name: string;
  description: string;
  code: string;
  downloadUrl: string;
  createdAt: number;
}

export interface LessonProgress {
  lesson: { completed: number; total: number };
  activity: { activityCompleted: boolean; score: number };
}

export interface Student {
  id: string; // Firebase Auth uid, also the users/{uid} key
  fullName: string;
  username: string;
  email: string;
  classCode: string | null;
  learningProgress: Record<string, LessonProgress>;
}

export type ClassroomInput = Omit<Classroom, "id" | "createdAt" | "code">;

export interface StudentInput {
  fullName: string;
  username: string;
  email: string;
  classCode: string | null;
}

export interface CreateStudentInput extends StudentInput {
  password: string;
}

export type InviteStatus = "pending" | "used";

export interface DownloadInvite {
  id: string; // the single-use token, also the download-invites/{id} key
  classroomId: string;
  email: string;
  status: InviteStatus;
  createdAt: number;
  usedAt: number | null;
}

export type StaffRole = "admin" | "teacher";

export interface StaffMember {
  uid: string; // Firebase Auth uid, also the staff/{uid} key
  fullName: string;
  email: string;
  role: StaffRole;
  // The one classroom this teacher is scoped to (adviser-style: one teacher,
  // one section). Null for admins and for teachers not yet assigned one.
  classCode: string | null;
  createdAt: number;
}

export type TicketStatus = "open" | "resolved";

export interface SupportTicket {
  id: string; // supportTickets/{id} key
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  description: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
}

export interface SupportMessage {
  id: string;
  from: StaffRole;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}
