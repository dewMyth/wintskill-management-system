import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/FormDialog';
import { TextField } from '@/components/TextField';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { localDate } from '@/features/calendar/time';
import { errorMessage } from '@/services/api';
import {
  useCreateAssignmentMutation,
  useCreateMaterialMutation,
  useUpdateAssignmentMutation,
  useUpdateMaterialMutation,
} from './lms-api';
import {
  assignmentTypes,
  materialTypes,
  type Assignment,
  type Material,
} from './types';
import { useUpload } from './use-upload';

const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, '');

// Both dialogs are mounted only while open, so their state starts fresh each time.

interface MaterialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  /** Rename this material; leave out to upload a new one. */
  material?: Material;
}

export function MaterialDialog({
  open,
  onOpenChange,
  moduleId,
  material,
}: MaterialProps) {
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState(material?.title ?? '');
  const [error, setError] = useState<string>();
  const { upload, uploading, maxMb } = useUpload('material', materialTypes);
  const [createMaterial, { isLoading: creating }] = useCreateMaterialMutation();
  const [updateMaterial, { isLoading: updating }] = useUpdateMaterialMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Enter a title');
    if (material) {
      const result = await updateMaterial({
        id: material.id,
        title: title.trim(),
      });
      if (result.error) return setError(errorMessage(result.error));
      toast.success('Material renamed');
      return onOpenChange(false);
    }
    if (!file) return setError('Choose a file');
    try {
      const storagePath = await upload(moduleId, file);
      const result = await createMaterial({
        moduleId,
        title: title.trim(),
        storagePath,
      });
      if (result.error) return setError(errorMessage(result.error));
      toast.success('Material added');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={material ? 'Rename material' : 'Add material'}
      description={
        material
          ? undefined
          : `PDF, MP4 video or image${maxMb ? `, up to ${maxMb} MB` : ''}. Students can view it but not download it.`
      }
      submitLabel={material ? 'Save' : uploading ? 'Uploading…' : 'Upload'}
      onSubmit={submit}
      submitting={uploading || creating || updating}
      error={error}
    >
      {!material && (
        <Field>
          <FieldLabel htmlFor="material-file">File</FieldLabel>
          <Input
            id="material-file"
            type="file"
            accept={materialTypes.join(',')}
            className="h-11 py-2"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              setFile(chosen);
              if (chosen && !title) setTitle(withoutExtension(chosen.name));
            }}
          />
        </Field>
      )}
      <TextField
        id="material-title"
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </FormDialog>
  );
}

interface AssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  assignment?: Assignment;
}

/** Read-only handouts for now: title, instructions, an optional due date and file. */
export function AssignmentDialog({
  open,
  onOpenChange,
  moduleId,
  assignment,
}: AssignmentProps) {
  const [title, setTitle] = useState(assignment?.title ?? '');
  const [description, setDescription] = useState(assignment?.description ?? '');
  const [due, setDue] = useState(
    assignment?.dueAt ? localDate(new Date(assignment.dueAt)) : '',
  );
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<string>();
  const { upload, uploading } = useUpload('assignment', assignmentTypes);
  const [createAssignment, { isLoading: creating }] =
    useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: updating }] =
    useUpdateAssignmentMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Enter a title');
    // Due at the end of the chosen day.
    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      dueAt: due ? new Date(`${due}T23:59`).toISOString() : null,
    };
    try {
      const result = assignment
        ? await updateAssignment({ id: assignment.id, ...fields })
        : await createAssignment({
            moduleId,
            ...fields,
            storagePath: file ? await upload(moduleId, file) : undefined,
          });
      if (result.error) return setError(errorMessage(result.error));
      toast.success(assignment ? 'Assignment updated' : 'Assignment added');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={assignment ? 'Edit assignment' : 'Add assignment'}
      submitLabel={
        assignment ? 'Save' : uploading ? 'Uploading…' : 'Add assignment'
      }
      onSubmit={submit}
      submitting={uploading || creating || updating}
      error={error}
    >
      <TextField
        id="assignment-title"
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Field>
        <FieldLabel htmlFor="assignment-description">
          Instructions (optional)
        </FieldLabel>
        <Textarea
          id="assignment-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <TextField
        id="assignment-due"
        type="date"
        label="Due date (optional)"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      {!assignment && (
        <Field>
          <FieldLabel htmlFor="assignment-file">File (optional)</FieldLabel>
          <Input
            id="assignment-file"
            type="file"
            accept={assignmentTypes.join(',')}
            className="h-11 py-2"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
          <FieldDescription>PDF or image.</FieldDescription>
        </Field>
      )}
    </FormDialog>
  );
}
