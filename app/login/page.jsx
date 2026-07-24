import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="size-8 text-primary" />
          <h1 className="font-heading text-lg font-semibold text-foreground">SCRB Crime Intelligence Platform</h1>
          <p className="text-xs text-muted-foreground">Karnataka State Police — Internal Access Only</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">Sign in</CardTitle>
            <CardDescription>Use your service KGID and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo login — KGID <code className="font-mono">KGID100001</code>, password{" "}
          <code className="font-mono">Demo@1234</code>.
        </p>
      </div>
    </div>
  );
}
