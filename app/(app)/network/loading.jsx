import { PageHeaderSkeleton, KpiGridSkeleton, CardSkeleton } from "@/components/shared/Skeletons";

export default function NetworkLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={2} />
      <CardSkeleton height={480} />
    </div>
  );
}
