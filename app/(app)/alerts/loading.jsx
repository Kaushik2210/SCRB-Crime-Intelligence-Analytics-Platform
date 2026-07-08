import { PageHeaderSkeleton } from "@/components/shared/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ol className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
