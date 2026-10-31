import { ApiError } from "./firebase-admin";
import { getClassroomByCode } from "./classroom-lookup";
import { sendClassroomAssignmentEmail } from "./mailer";

/** Normalises and validates a list of classroom codes (all must exist). Returns the unique upper-case codes. */
export async function resolveClassCodes(input: unknown): Promise<string[]> {
  const list = Array.isArray(input) ? input : input ? [input] : [];
  const codes = Array.from(new Set(list.map((c) => String(c).trim().toUpperCase()).filter(Boolean)));
  for (const code of codes) {
    if (!(await getClassroomByCode(code))) throw new ApiError(400, `Classroom ${code} was not found.`);
  }
  return codes;
}

/** E-mails a teacher the class codes of every classroom they have; the ones in `added` are marked NEW. */
export async function emailAssignment(opts: {
  to: string;
  name: string;
  classCodes: string[];
  added: string[];
  portalUrl: string;
}): Promise<{ emailed: boolean; emailError?: string }> {
  try {
    const classrooms = [];
    for (const code of opts.classCodes) {
      const c = await getClassroomByCode(code);
      if (c) classrooms.push({ name: c.name, code: c.code, isNew: opts.added.includes(code) });
    }
    if (classrooms.length === 0) return { emailed: false };
    await sendClassroomAssignmentEmail({ to: opts.to, name: opts.name, classrooms, portalUrl: opts.portalUrl });
    return { emailed: true };
  } catch (err) {
    return { emailed: false, emailError: err instanceof Error ? err.message : "Failed to send the email." };
  }
}
