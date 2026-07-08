import { PageHeaderSkeleton, KpiGridSkeleton, CardSkeleton } from "@/components/shared/Skeletons";

export default function DistrictLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={3} />
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton height={420} className="lg:col-span-2" />
        <CardSkeleton height={420} />
      </div>
    </div>
  );
}
