import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-primary text-primary-foreground",
  shipped: "bg-warning text-foreground",
  delivered: "bg-success text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span data-testid="order-status" className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", styles[status])}>
      {status}
    </span>
  );
}
