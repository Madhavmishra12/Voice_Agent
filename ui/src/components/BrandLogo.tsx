import { cn } from "@/lib/utils";

// Shared GrowQR wordmark. Height is controlled by the caller; width follows
// the logo's aspect ratio.
export function BrandLogo({
  className,
  inverse = false,
  mark = false,
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
}) {
  void inverse;
  void mark;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/growqr-logo.png" alt="GrowQR Agentic AI" className={cn("w-auto select-none", className)} />
  );
}
