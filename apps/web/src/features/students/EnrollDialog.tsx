import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/FormDialog';
import { IntakePicker } from '@/features/courses/IntakePicker';
import { errorMessage } from '@/services/api';
import { useEnrollStudentMutation } from './students-api';
import type { StudentDetail } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentDetail;
}

/** Enrolls the student in another intake: new registration number, same login. */
export function EnrollDialog({ open, onOpenChange, student }: Props) {
  const [batchId, setBatchId] = useState('');
  const [error, setError] = useState<string>();
  const [enroll, { isLoading }] = useEnrollStudentMutation();

  const close = (next: boolean) => {
    if (!next) {
      setBatchId('');
      setError(undefined);
    }
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      setError('Choose a course intake');
      return;
    }
    const result = await enroll({ id: student.id, batchId });
    if (result.error) {
      setError(errorMessage(result.error));
      return;
    }
    toast.success(`Enrolled as ${result.data.registrationNo}`);
    close(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title="Add a course"
      description={`${student.fullName} gets a new registration number and keeps signing in as ${student.username}.`}
      submitLabel="Enroll"
      onSubmit={submit}
      submitting={isLoading}
      error={error}
    >
      <IntakePicker
        id="enroll-batch"
        value={batchId}
        onChange={(v) => {
          setBatchId(v);
          setError(undefined);
        }}
        exclude={student.enrollments.map((e) => e.batch.id)}
      />
    </FormDialog>
  );
}
