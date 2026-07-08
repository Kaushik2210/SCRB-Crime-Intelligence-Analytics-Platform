import { PageHeaderSkeleton, KpiGridSkeleton, CardSkeleton } from "@/components/shared/Skeletons";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton height={340} className="lg:col-span-2" />
        <CardSkeleton height={340} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
      </div>
      <CardSkeleton height={160} />
      <CardSkeleton height={300} />
    </div>
  );
}
