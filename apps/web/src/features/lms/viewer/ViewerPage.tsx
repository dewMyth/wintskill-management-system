import { ArrowLeftIcon, EyeOffIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { LoadError } from '@/components/LoadState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useViewFileQuery } from '../lms-api';
import { ImageCanvas, PdfCanvas } from './CanvasViews';
import { useViewerProtection } from './use-viewer-protection';
import { Watermark } from './Watermark';

/** View-only material viewer: watermarked, no download, blurred when the app loses focus. */
export function ViewerPage() {
  const { type, id } = useParams() as {
    type: 'material' | 'assignment';
    id: string;
  };
  const navigate = useNavigate();
  const {
    currentData: file,
    error,
    refetch,
  } = useViewFileQuery({ type, id }, { refetchOnMountOrArgChange: true });
  const { hidden } = useViewerProtection();
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="min-h-11 -ml-3"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {file?.title}
        </h1>
      </div>

      {error || failed ? (
        <LoadError
          onRetry={() => {
            setFailed(false);
            void refetch();
          }}
        />
      ) : !file ? (
        <Skeleton className="aspect-[3/4] w-full" />
      ) : (
        <div
          data-testid="protected-content"
          className="relative overflow-hidden rounded-xl border bg-muted p-2 select-none [-webkit-touch-callout:none]"
          onContextMenu={block}
          onDragStart={block}
          onCopy={block}
        >
          <div className={cn('transition-[filter]', hidden && 'blur-xl')}>
            {file.kind === 'PDF' && (
              <PdfCanvas url={file.url} onError={onError} />
            )}
            {file.kind === 'IMAGE' && (
              <ImageCanvas url={file.url} onError={onError} />
            )}
            {file.kind === 'VIDEO' && (
              <video
                src={file.url}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                playsInline
                className="w-full rounded-md bg-black"
                onError={onError}
              />
            )}
          </div>
          <Watermark {...file.watermark} />
          {hidden && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/70 text-center">
              <EyeOffIcon className="size-8" />
              <p className="font-medium">
                Paused while the app is in the background
              </p>
            </div>
          )}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        For study at the academy only. Copies are traceable to your account.
      </p>
    </div>
  );
}
