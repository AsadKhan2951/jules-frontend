import { useRef, useState } from "react";
import { AlertTriangle, DatabaseBackup, Download, FileUp, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Backup = { name: string; kind: "manual" | "auto" | "pre-restore"; size: number; createdAt: string };

const KIND: Record<Backup["kind"], { label: string; className: string }> = {
  auto: { label: "Daily (automatic)", className: "bg-sky-500/10 text-sky-600" },
  manual: { label: "Manual", className: "bg-emerald-500/10 text-emerald-600" },
  "pre-restore": { label: "Before a restore", className: "bg-amber-500/10 text-amber-600" },
};

const size = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Super Admin: daily automatic backups, back up now, download, and restore (from the list or a file). */
export default function Backups() {
  const utils = trpc.useUtils();
  const list = trpc.backups.list.useQuery();
  const [restoring, setRestoring] = useState<{ name?: string; file?: File; label: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const create = trpc.backups.create.useMutation({
    onSuccess: async backup => {
      toast.success(`Backup saved (${size(backup.size)})`);
      await utils.backups.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.backups.delete.useMutation({
    onSuccess: () => utils.backups.list.invalidate(),
    onError: error => toast.error(error.message),
  });
  const restore = trpc.backups.restore.useMutation({
    onSuccess: result => done(result.backupDate),
    onError: error => toast.error(error.message),
  });

  const done = (date: string) => {
    toast.success(`Data restored to ${when(date)}. Reloading…`);
    setRestoring(null);
    // Everything changed: reload so every page shows the restored data.
    setTimeout(() => window.location.reload(), 1200);
  };

  const runRestore = async () => {
    if (!restoring || confirmText !== "RESTORE") return;
    if (restoring.name) return restore.mutate({ name: restoring.name, confirm: "RESTORE" });
    if (!restoring.file) return;
    setUploading(true);
    try {
      const response = await fetch("/api/backups/restore-upload?confirm=RESTORE", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: restoring.file,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || `Restore failed (${response.status})`);
      done(body.backupDate);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const backups = (list.data?.backups ?? []) as Backup[];
  const busy = restore.isPending || uploading;

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary"><ShieldCheck className="h-4 w-4" />Super Admin</div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Backup & Restore</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A full backup of products, collections, catalogs, customers, orders, invoices and finance is taken automatically every day (last 14 kept).
            Take one yourself before big changes, download copies to keep, or restore any of them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp className="mr-2 h-4 w-4" />Restore from file</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || list.data?.enabled === false} className="gold-gradient text-primary-foreground border-0">
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}Back up now
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".gz,.json,application/gzip,application/json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                setConfirmText("");
                setRestoring({ file, label: file.name });
              }
            }}
          />
        </div>
      </div>

      {list.data?.enabled === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-foreground">Backups are saved on the server's storage volume, but <code>UPLOAD_DIR</code> is not set on Railway. Set it to the volume path (e.g. <code>/data/uploads</code>) to turn backups on. Restoring from a file still works.</p>
        </div>
      )}

      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Saved backups</CardTitle></CardHeader>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : backups.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No backups yet. The first automatic one runs a few minutes after the server starts, or click “Back up now”.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="px-5 py-3 text-left">Taken</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-right">Size</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(item => (
                    <tr key={item.name} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-5 py-3 text-foreground">{when(item.createdAt)}</td>
                      <td className="px-5 py-3"><Badge className={KIND[item.kind]?.className}>{KIND[item.kind]?.label ?? item.kind}</Badge></td>
                      <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">{size(item.size)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/api/backups/${encodeURIComponent(item.name)}/download`} download><Download className="mr-1 h-3.5 w-3.5" />Download</a>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setConfirmText(""); setRestoring({ name: item.name, label: when(item.createdAt) }); }}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={remove.isPending}
                          onClick={() => window.confirm(`Delete the backup from ${when(item.createdAt)}?`) && remove.mutate({ name: item.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Photos are not inside the backup file — they stay on the server's storage volume, so a restore keeps every photo that was uploaded.
      </p>

      <Dialog open={!!restoring} onOpenChange={open => !open && !busy && setRestoring(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-500" />Restore backup</DialogTitle>
            <DialogDescription>
              All data will go back to <span className="font-medium text-foreground">{restoring?.label}</span>. Anything added or changed after that
              (orders, products, payments…) will be replaced. A safety backup of the current data is taken first, so this can be undone. If anything goes wrong while loading, nothing is changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Type <span className="font-mono font-semibold text-foreground">RESTORE</span> to confirm.</p>
            <Input value={confirmText} onChange={event => setConfirmText(event.target.value.toUpperCase())} placeholder="RESTORE" autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRestoring(null)} disabled={busy}>Cancel</Button>
            <Button onClick={runRestore} disabled={confirmText !== "RESTORE" || busy} className="bg-amber-600 text-white hover:bg-amber-600/90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restore now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
