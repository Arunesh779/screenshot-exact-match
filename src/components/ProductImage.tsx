import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div
        data-testid="image-fallback"
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className={cn("flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground", className)}
      >
        <ImageOff className="size-8" aria-hidden />
        <span className="text-xs">No image</span>
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("object-cover", className)} />;
}
