import { getAdminDb } from "./firebase-admin";
import { DEFAULT_APK_DOWNLOAD_URL } from "./constants";

export interface PublicClassroom {
  id: string;
  name: string;
  description: string;
  downloadUrl: string;
  code: string;
}

export async function getClassroomByCode(code: string): Promise<PublicClassroom | null> {
  const key = code.toUpperCase();
  const snapshot = await getAdminDb().ref(`classrooms/${key}`).get();
  if (!snapshot.exists()) return null;

  const data = snapshot.val() as {
    name: string;
    description?: string;
    downloadUrl?: string;
  };

  return {
    id: key,
    name: data.name,
    description: data.description ?? "",
    downloadUrl: data.downloadUrl ?? DEFAULT_APK_DOWNLOAD_URL,
    code: key,
  };
}
