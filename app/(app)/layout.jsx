import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAlertsFeed } from "@/lib/alerts";
import { getDistrictNavList } from "@/lib/district";
import { AppShell } from "@/components/shared/AppShell";

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const [alerts, districts] = await Promise.all([
    getAlertsFeed(session.user),
    getDistrictNavList(),
  ]);

  return (
    <AppShell user={session.user} alerts={alerts.slice(0, 5)} districts={districts}>
      {children}
    </AppShell>
  );
}
