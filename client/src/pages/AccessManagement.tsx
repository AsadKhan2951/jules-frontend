import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { History, KeyRound, LockKeyhole, Power, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";

type Role = "admin" | "operations_finance" | "user";

type Member = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  lastSignedIn: string | Date | null;
};

type AuditRow = {
  log: { id: number; action: string; entityType: string; entityId: string | null; details: string | null; createdAt: string | Date };
  actorName: string | null;
};

const roleDetails: Record<Role, { label: string; badge: string; description: string }> = {
  admin: { label: "Super Admin", badge: "bg-purple-500/10 text-purple-600 border-purple-500/20", description: "Complete visibility and control across JULES." },
  operations_finance: { label: "Operations & Finance", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", description: "Customers, orders, vendors in order flow, invoices, and finance." },
  user: { label: "Awaiting Access", badge: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", description: "Can sign in, but has no business data access until a role is assigned." },
};

const auditLabels: Record<string, string> = {
  "user.created": "Staff account created",
  "user.role_updated": "Role changed",
  "user.activated": "Account activated",
  "user.deactivated": "Account deactivated",
  "user.password_reset": "Password reset",
  "journal.posted": "Journal posted",
  "journal.reversed": "Journal reversed",
  "ledger.created": "Ledger created",
  "ledger.updated": "Ledger updated",
  "ledger.deleted": "Empty ledger removed",
  "vendor.deactivated": "Vendor deactivated",
};

const emptyNewUser = { name: "", email: "", password: "", role: "operations_finance" as Role };

export default function AccessManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [pendingRole, setPendingRole] = useState<Record<number, Role>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const usersQuery = trpc.access.users.useQuery();
  const auditQuery = trpc.access.auditLog.useQuery({ limit: 25 });
  const members = (usersQuery.data ?? []) as Member[];
  const auditRows = (auditQuery.data ?? []) as AuditRow[];

  const refresh = async () => {
    await Promise.all([utils.access.users.invalidate(), utils.access.auditLog.invalidate()]);
  };

  const createUser = trpc.access.createUser.useMutation({
    onSuccess: async (created: Member) => {
      toast.success(`${created.name || created.email} can now sign in as ${roleDetails[created.role].label}`);
      setShowCreate(false);
      setNewUser(emptyNewUser);
      await refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const updateRole = trpc.access.updateRole.useMutation({
    onSuccess: async (changed: Member) => {
      toast.success(`${changed.name || changed.email || "User"} is now ${roleDetails[changed.role].label}`);
      setPendingRole(state => {
        const next = { ...state };
        delete next[changed.id];
        return next;
      });
      await refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const setActive = trpc.access.setActive.useMutation({
    onSuccess: async (changed: Member | null) => {
      if (changed) toast.success(`${changed.name || changed.email} ${changed.isActive ? "reactivated" : "deactivated"}`);
      await refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const resetUserPassword = trpc.access.resetPassword.useMutation({
    onSuccess: async () => {
      toast.success("Password updated. Share the new password with the staff member securely.");
      setResetTarget(null);
      setResetPassword("");
      await refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const canCreate = newUser.name.trim() && newUser.email.trim() && newUser.password.length >= 8;

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-2"><ShieldCheck className="h-4 w-4" />Super Admin</div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Users & Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Create staff logins and control exactly which JULES workspaces they can use.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gold-gradient text-primary-foreground border-0">
          <UserPlus className="h-4 w-4 mr-2" />Add staff member
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AccessCard icon={ShieldCheck} title="Super Admin" text="Sees every product, catalog, customer, order, finance record, user, and audit event." />
        <AccessCard icon={UserCog} title="Operations & Finance" text="Works with customers, sales orders, production vendors, invoices, cash book, journals, and reports." />
        <AccessCard icon={LockKeyhole} title="Personal staff logins" text="Every staff member signs in with their own email and password. Passwords are stored only as secure hashes and are never shown again." />
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Team Members</CardTitle><p className="text-sm text-muted-foreground mt-1">Assign a role to activate access. Deactivated accounts cannot sign in.</p></div>
            <Badge variant="outline">{members.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30"><th className="px-5 py-3 text-left">User</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Last Signed In</th><th className="px-5 py-3 text-left">Current Access</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {members.map(member => {
                const selected = pendingRole[member.id] || member.role;
                const isSelf = member.id === user?.id;
                return (
                  <tr key={member.id} className={`border-b border-border/60 hover:bg-muted/20 ${member.isActive ? "" : "opacity-60"}`}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">{(member.name || member.email || "U").charAt(0).toUpperCase()}</div><div><p className="font-medium text-foreground">{member.name || "Unnamed user"}{isSelf && <span className="text-xs text-muted-foreground ml-2">You</span>}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div></td>
                    <td className="px-5 py-4">{member.isActive ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Deactivated</Badge>}</td>
                    <td className="px-5 py-4 text-muted-foreground">{member.lastSignedIn ? new Date(member.lastSignedIn).toLocaleString() : "Never"}</td>
                    <td className="px-5 py-4"><Badge variant="outline" className={roleDetails[member.role].badge}>{roleDetails[member.role].label}</Badge><p className="text-xs text-muted-foreground mt-1.5 max-w-xs">{roleDetails[member.role].description}</p></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Select disabled={isSelf} value={selected} onValueChange={(value: Role) => setPendingRole(state => ({ ...state, [member.id]: value }))}>
                          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="user">Awaiting Access</SelectItem><SelectItem value="operations_finance">Operations & Finance</SelectItem><SelectItem value="admin">Super Admin</SelectItem></SelectContent>
                        </Select>
                        <Button disabled={isSelf || selected === member.role || updateRole.isPending} onClick={() => updateRole.mutate({ userId: member.id, role: selected })}>Save</Button>
                        <Button variant="outline" size="icon" title="Reset password" onClick={() => { setResetTarget(member); setResetPassword(""); }}><KeyRound className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" disabled={isSelf || setActive.isPending} title={member.isActive ? "Deactivate account" : "Reactivate account"} onClick={() => setActive.mutate({ userId: member.id, isActive: !member.isActive })}><Power className={`h-4 w-4 ${member.isActive ? "text-rose-500" : "text-emerald-500"}`} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!usersQuery.isLoading && !members.length && <div className="py-12 text-center text-sm text-muted-foreground">No users yet.</div>}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" />Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Audit trail of access-management and accounting actions.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30"><th className="px-5 py-3 text-left">When</th><th className="px-5 py-3 text-left">Action</th><th className="px-5 py-3 text-left">Record</th><th className="px-5 py-3 text-left">By</th></tr></thead>
            <tbody>
              {auditRows.map(({ log, actorName }) => (
                <tr key={log.id} className="border-b border-border/60">
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-foreground">{auditLabels[log.action] || log.action}</td>
                  <td className="px-5 py-3 text-muted-foreground">{log.entityType.replace(/_/g, " ")}{log.entityId ? ` #${log.entityId}` : ""}</td>
                  <td className="px-5 py-3 text-muted-foreground">{actorName || "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!auditQuery.isLoading && !auditRows.length && <div className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</div>}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) setNewUser(emptyNewUser); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
            <DialogDescription>Create a personal login. Share the temporary password privately and ask them to keep it safe.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={event => {
              event.preventDefault();
              if (!canCreate) return;
              createUser.mutate({ ...newUser, name: newUser.name.trim(), email: newUser.email.trim() });
            }}
          >
            <div className="grid gap-2"><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" value={newUser.name} onChange={event => setNewUser(state => ({ ...state, name: event.target.value }))} placeholder="e.g. Ahmed Raza" required /></div>
            <div className="grid gap-2"><Label htmlFor="staff-email">Email</Label><Input id="staff-email" type="email" autoComplete="off" value={newUser.email} onChange={event => setNewUser(state => ({ ...state, email: event.target.value }))} placeholder="name@company.com" required /></div>
            <div className="grid gap-2"><Label htmlFor="staff-password">Temporary password</Label><Input id="staff-password" type="password" autoComplete="new-password" value={newUser.password} onChange={event => setNewUser(state => ({ ...state, password: event.target.value }))} placeholder="At least 8 characters" minLength={8} required /></div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value: Role) => setNewUser(state => ({ ...state, role: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="operations_finance">Operations & Finance</SelectItem><SelectItem value="admin">Super Admin</SelectItem><SelectItem value="user">Awaiting Access</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleDetails[newUser.role].description}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={!canCreate || createUser.isPending}>{createUser.isPending ? "Creating..." : "Create login"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) { setResetTarget(null); setResetPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {resetTarget?.name || resetTarget?.email}.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={event => {
              event.preventDefault();
              if (!resetTarget || resetPassword.length < 8) return;
              resetUserPassword.mutate({ userId: resetTarget.id, password: resetPassword });
            }}
          >
            <div className="grid gap-2"><Label htmlFor="reset-password">New password</Label><Input id="reset-password" type="password" autoComplete="new-password" value={resetPassword} onChange={event => setResetPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={resetPassword.length < 8 || resetUserPassword.isPending}>{resetUserPassword.isPending ? "Saving..." : "Update password"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccessCard({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <Card className="border-border bg-card/80"><CardContent className="p-5"><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4"><Icon className="h-5 w-5 text-primary" /></div><h2 className="font-semibold text-foreground">{title}</h2><p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{text}</p></CardContent></Card>;
}
