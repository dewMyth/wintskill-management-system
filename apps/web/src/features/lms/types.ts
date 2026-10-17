export type MaterialKind = 'PDF' | 'VIDEO' | 'IMAGE';

export interface LmsCourse {
  courseId: string;
  code: string;
  name: string;
  /** For students: their registration number in this course. */
  registrationNo: string | null;
}

export interface Material {
  id: string;
  title: string;
  kind: MaterialKind;
  createdAt: string;
  uploadedBy: string;
  canEdit: boolean;
  viewed: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  hasFile: boolean;
  createdAt: string;
  uploadedBy: string;
  canEdit: boolean;
}

export interface CourseContent {
  id: string;
  code: string;
  name: string;
  modules: {
    id: string;
    code: string;
    title: string;
    materials: Material[];
    assignments: Assignment[];
  }[];
}

export interface ViewInfo {
  title: string;
  kind: MaterialKind;
  url: string;
  watermark: { name: string; reference: string; date: string };
}

export const kindLabels: Record<MaterialKind, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  IMAGE: 'Image',
};

export const MAX_UPLOAD_MB = 100;
export const materialTypes = [
  'application/pdf',
  'video/mp4',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const assignmentTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
