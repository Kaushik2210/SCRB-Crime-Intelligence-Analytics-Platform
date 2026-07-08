import { getSession } from "@/lib/session";
import { getAlertsFeed } from "@/lib/alerts";
import { PageHeader } from "@/components/shared/PageHeader";
import { AlertsFeedView } from "@/components/alerts/AlertsFeedView";

export default async function AlertsPage() {
  const session = await getSession();
  const user = session.user;
  const items = await getAlertsFeed(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts & Trend Feed"
        description="Emerging trend alerts and case status updates, filterable by district."
      />
      <AlertsFeedView items={items} />
    </div>
  );
}
