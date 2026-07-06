"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "@/lib/auth-context";
import { generateAvailableJoinCode } from "@/lib/classrooms";
import { DEFAULT_APK_DOWNLOAD_URL } from "@/lib/constants";
import type { Classroom, ClassroomInput } from "@/types";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

type Props =
  | {
      mode: "create";
      onClose: () => void;
      onSubmit: (input: ClassroomInput, code: string) => Promise<void>;
    }
  | {
      mode: "edit";
      classroom: Classroom;
      onClose: () => void;
      onSubmit: (input: ClassroomInput) => Promise<void>;
    };

export function ClassroomFormModal(props: Props) {
  const { role } = useAuth();
  const { mode, onClose, onSubmit } = props;
  const classroom = mode === "edit" ? props.classroom : undefined;

  const [name, setName] = useState(classroom?.name ?? "");
  const [description, setDescription] = useState(classroom?.description ?? "");
  const downloadUrl = DEFAULT_APK_DOWNLOAD_URL;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [preparingCode, setPreparingCode] = useState(mode === "create");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (mode !== "create") return;
    let cancelled = false;
    generateAvailableJoinCode()
      .then((generated) => {
        if (!cancelled) setCode(generated);
      })
      .catch(() => {
        if (!cancelled) setError("Could not generate a join code. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setPreparingCode(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      setCode(await generateAvailableJoinCode());
    } catch {
      setError("Could not generate a join code. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await onSubmit({ name, description, downloadUrl }, code);
      } else {
        await onSubmit({ name, description, downloadUrl });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === "create" ? "New Classroom" : "Edit Classroom"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "create" && (
          <div>
            <label className={labelClass}>Join code</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
              <span className="flex-1 font-mono text-sm font-semibold text-primary">
                {preparingCode ? "Generating..." : code}
              </span>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={preparingCode || regenerating}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface disabled:opacity-50 transition-colors"
              >
                {regenerating ? "..." : "Regenerate"}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Students use this code to join. It can&apos;t be changed once the classroom is
              saved.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass}>Classroom name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="CSS NC2 - Batch 2026A"
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={3}
            placeholder="Optional notes about this classroom"
          />
        </div>
        {role === "admin" && (
          <div>
            <label className={labelClass}>App download link</label>
            <div className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-primary hover:underline"
              >
                {downloadUrl}
              </a>
            </div>
            <p className="mt-1 text-xs text-muted">
              Shown on the join page. Fixed for now — every classroom shares this same link.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (mode === "create" && (preparingCode || !code))}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
