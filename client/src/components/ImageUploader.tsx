import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const MAX_SIDE = 1600;
const MAX_IMAGES = 10;

/** Resize large photos in the browser before upload (keeps uploads small and fast). */
async function compressImage(file: File): Promise<{ base64: string; contentType: string; filename: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  if (file.type === "image/gif") return { base64: dataUrl, contentType: file.type, filename: file.name };

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return { base64: dataUrl, contentType: file.type, filename: file.name };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const base64 = canvas.toDataURL("image/jpeg", 0.85);
  return { base64, contentType: "image/jpeg", filename: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
}

export function ImageUploader({
  images,
  onChange,
  disabled,
  className,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const upload = trpc.upload.image.useMutation();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images`);
      return;
    }
    const selected = Array.from(files).filter(file => file.type.startsWith("image/")).slice(0, room);
    setUploading(count => count + selected.length);
    const uploaded: string[] = [];
    for (const file of selected) {
      try {
        const payload = await compressImage(file);
        const result = await upload.mutateAsync(payload);
        uploaded.push(result.url);
      } catch (error) {
        toast.error((error as Error).message || `Could not upload ${file.name}`);
      } finally {
        setUploading(count => count - 1);
      }
    }
    if (uploaded.length) onChange([...images, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {images.map(url => (
        <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Item" className="h-full w-full object-cover" />
          </a>
          {!disabled && (
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(images.filter(image => image !== url))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, index) => (
        <div key={`uploading-${index}`} className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ))}
      {!disabled && images.length + uploading < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="text-[10px]">Add photo</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={event => handleFiles(event.target.files)}
      />
    </div>
  );
}

export default ImageUploader;
