import { getSession } from "@/lib/session";
import { getCaseRecords } from "@/lib/cases";
import { PageHeader } from "@/components/shared/PageHeader";
import { CasesTable } from "@/components/cases/CasesTable";

export default async function CasesPage() {
  const session = await getSession();
  const user = session.user;
  const cases = await getCaseRecords(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Case Records"
        description={`${cases.length} case${cases.length === 1 ? "" : "s"} in your current scope — sortable, filterable, and linked back to district context.`}
      />
      <CasesTable data={cases} />
    </div>
  );
}
