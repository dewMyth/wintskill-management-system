import { CameraIcon } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { initials } from '@/lib/utils';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  name: string;
  photoUrl?: string | null;
  busy?: boolean;
  onChange: (file: File) => void;
}

/** Avatar with a button that opens the camera or gallery. JPEG, PNG or WebP up to 2 MB. */
export function PhotoPicker({ name, photoUrl, busy, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.includes(file.type))
      toast.error('Choose a JPEG, PNG or WebP image');
    else if (file.size > MAX_BYTES)
      toast.error('The photo must be 2 MB or smaller');
    else onChange(file);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {photoUrl && (
          <AvatarImage
            src={photoUrl}
            alt={`Photo of ${name || 'student'}`}
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-gold text-xl font-semibold text-[var(--forest-950)]">
          {initials(name) || '?'}
        </AvatarFallback>
      </Avatar>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Spinner /> : <CameraIcon />}
        {photoUrl ? 'Change photo' : 'Add photo'}
      </Button>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        capture="user"
        className="hidden"
        aria-label="Photo file"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
