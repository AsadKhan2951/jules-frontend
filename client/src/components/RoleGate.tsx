import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LockKeyhole, ShieldAlert, UserRoundCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function RoleGate({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: Array<"admin" | "operations_finance">;
}) {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (loading || !user) {
    return <div className="min-h-[40vh] flex items-center justify-center"><div className="h-9 w-9 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (user.role === "user") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5"><UserRoundCheck className="h-7 w-7 text-amber-500" /></div>
          <h1 className="text-2xl font-semibold text-foreground">Access awaiting approval</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">Your login is active, but a JULES Super Admin must assign your business role before customer, order, or finance data becomes available.</p>
          <div className="rounded-xl bg-muted/40 border border-border p-4 mt-5 text-left text-sm"><p className="font-medium text-foreground">Signed in as</p><p className="text-muted-foreground mt-1">{user.name || "Unnamed user"}</p><p className="text-muted-foreground">{user.email}</p></div>
          <Button variant="outline" onClick={logout} className="mt-5">Sign out</Button>
        </div>
      </div>
    );
  }

  if (!allow.includes(user.role as "admin" | "operations_finance")) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-5"><ShieldAlert className="h-7 w-7 text-rose-500" /></div>
          <h1 className="text-2xl font-semibold text-foreground">Restricted workspace</h1>
          <p className="text-sm text-muted-foreground mt-3">Your role does not include access to this area.</p>
          <Button onClick={() => setLocation("/orders")} className="mt-5"><LockKeyhole className="h-4 w-4 mr-2" />Go to Operations</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
