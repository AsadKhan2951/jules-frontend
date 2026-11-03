import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, FolderOpen, Loader2, Pause, Play, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Bulk product import from photo folders, e.g. "Shaikha Jewellers/Diamond Rings/*.jpeg".
 * Each sub-folder becomes a category + collection and every photo becomes one product.
 * Photos are resized in the browser (full size + thumbnail) and stored on the server.
 * Already-imported photos are skipped, so the import can be stopped and resumed.
 */

const FULL_SIDE = 1600;
const THUMB_SIDE = 480;
const CONCURRENCY = 3;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

type Entry = { file: File; folder: string; key: string };
type Status = "idle" | "running" | "paused" | "done";

function folderOf(file: File): string | null {
  const parts = (file.webkitRelativePath || file.name).split("/").filter(Boolean);
  // ".../<Folder>/<file>" — the folder right above the photo is the category.
  return parts.length >= 2 ? titleCase(parts[parts.length - 2]!) : null;
}

/** "Diamond sets" -> "Diamond Sets" so categories/collections and generated names look consistent. */
function titleCase(name: string): string {
  return name
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map(word => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Unique key: the path below the chosen top folder, e.g. "Diamond Rings/IMG_0001.jpeg". */
function sourceKeyOf(file: File): string {
  const parts = (file.webkitRelativePath || file.name).split("/").filter(Boolean);
  return (parts.length > 2 ? parts.slice(1) : parts.slice(-2)).join("/");
}

async function resize(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<string> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function prepare(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return {
      image: await resize(bitmap, FULL_SIDE, 0.85),
      thumbnail: await resize(bitmap, THUMB_SIDE, 0.78),
    };
  } finally {
    bitmap.close();
  }
}

export default function ImportProducts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: importedKeys, isLoading: keysLoading } = trpc.products.importedKeys.useQuery();
  const importImage = trpc.products.importImage.useMutation();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [ignored, setIgnored] = useState<{ hidden: number; unsupported: string[] }>({ hidden: 0, unsupported: [] });
  const [status, setStatus] = useState<Status>("idle");
  const [done, setDone] = useState(0);
  const [created, setCreated] = useState(0);
  const [failed, setFailed] = useState<Array<{ key: string; message: string }>>([]);
  const statusRef = useRef<Status>("idle");
  const cursor = useRef(0);
  const runId = useRef(0);
  const active = useRef<Promise<void> | null>(null);
  const [settling, setSettling] = useState(false);

  const imported = useMemo(() => new Set(importedKeys ?? []), [importedKeys]);
  const pending = useMemo(() => entries.filter(entry => !imported.has(entry.key)), [entries, imported]);

  const byFolder = useMemo(() => {
    const map = new Map<string, { total: number; pending: number }>();
    for (const entry of entries) {
      const row = map.get(entry.folder) ?? { total: 0, pending: 0 };
      row.total++;
      if (!imported.has(entry.key)) row.pending++;
      map.set(entry.folder, row);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries, imported]);

  // Warn before closing the tab mid-import.
  useEffect(() => {
    if (status !== "running") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const setRun = (next: Status) => {
    statusRef.current = next;
    setStatus(next);
  };

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
    let hidden = 0;
    const unsupported: string[] = [];
    const list: Entry[] = [];
    for (const file of Array.from(files)) {
      // macOS copies leave "._name.jpeg" metadata files next to each photo.
      if (file.name.startsWith(".")) {
        hidden++;
        continue;
      }
      if (!IMAGE_EXT.test(file.name)) {
        if (/\.(heic|heif)$/i.test(file.name)) unsupported.push(file.webkitRelativePath || file.name);
        continue;
      }
      const folder = folderOf(file);
      if (!folder) continue;
      list.push({ file, folder, key: sourceKeyOf(file) });
    }
    list.sort((a, b) => a.key.localeCompare(b.key));
    setEntries(list);
    setIgnored({ hidden, unsupported });
    setDone(0);
    setCreated(0);
    setFailed([]);
    cursor.current = 0;
    setRun("idle");
    if (!list.length) toast.error("No JPG/PNG photos found inside sub-folders.");
  };

  const processEntry = async (entry: Entry) => {
    try {
      const payload = await prepare(entry.file);
      const result = await importImage.mutateAsync({ folder: entry.folder, sourceKey: entry.key, ...payload });
      if (result.status === "created") setCreated(n => n + 1);
    } catch (error) {
      const message = (error as Error)?.message || "Upload failed";
      setFailed(list => [...list, { key: entry.key, message }]);
      // Configuration problems will fail every photo: stop instead of repeating 4,000 errors.
      if (/UPLOAD_DIR|permission|FORBIDDEN|login/i.test(message)) {
        setRun("paused");
        toast.error(message);
      }
    } finally {
      setDone(n => n + 1);
    }
  };

  const run = async () => {
    if (active.current) return;
    const queue = pending;
    if (!queue.length) return;
    const myRun = ++runId.current;
    cursor.current = 0;
    setDone(0);
    setFailed([]);
    setRun("running");
    const live = () => statusRef.current === "running" && runId.current === myRun;

    // The first photo of each folder goes alone so its category/collection is created once.
    const seen = new Set<string>();
    const firsts: Entry[] = [];
    const rest: Entry[] = [];
    for (const entry of queue) {
      if (seen.has(entry.folder)) rest.push(entry);
      else {
        seen.add(entry.folder);
        firsts.push(entry);
      }
    }

    const task = (async () => {
      for (const entry of firsts) {
        if (!live()) return;
        await processEntry(entry);
      }
      const worker = async () => {
        while (live()) {
          const index = cursor.current++;
          if (index >= rest.length) return;
          await processEntry(rest[index]!);
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    })();

    active.current = task;
    setSettling(true);
    try {
      await task;
    } finally {
      active.current = null;
      setSettling(false);
    }

    if (live()) {
      setRun("done");
      utils.products.invalidate();
      utils.collections.invalidate();
      utils.categories.invalidate();
      utils.products.importedKeys.invalidate();
      toast.success("Import finished");
    }
  };

  const pause = () => setRun("paused");
  const resume = async () => {
    // Let uploads already in flight finish, re-read what is on the server, then continue.
    if (active.current) await active.current;
    await utils.products.importedKeys.invalidate();
    setRun("idle");
  };

  const queueSize = status === "idle" ? pending.length : Math.max(done, pending.length);
  const percent = queueSize ? Math.round((done / queueSize) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/products")} aria-label="Back to products">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import products from photos</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose the main folder (e.g. “Shaikha Jewellers”). Each sub-folder becomes a category and collection; each photo becomes a product.</p>
        </div>
      </div>

      {/* Step 1: pick */}
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <FolderOpen className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-3 font-medium text-foreground">{entries.length ? `${entries.length.toLocaleString()} photos found in ${byFolder.length} folders` : "Select your photo folder"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Photos are resized on this computer before upload, so large folders upload quickly.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={event => {
            onPick(event.target.files);
            event.target.value = "";
          }}
          {...({ webkitdirectory: "", directory: "" } as any)}
        />
        <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={status === "running"}>
          <FolderOpen className="mr-2 h-4 w-4" />
          {entries.length ? "Choose a different folder" : "Choose folder"}
        </Button>
      </div>

      {/* Step 2: review */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-border px-5 py-3 text-xs font-medium text-muted-foreground">
            <span>Folder → category</span>
            <span className="text-right">Photos</span>
            <span className="text-right">New</span>
          </div>
          {byFolder.map(([folder, row]) => (
            <div key={folder} className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-border/60 px-5 py-2.5 text-sm last:border-0">
              <span className="font-medium text-foreground">{folder}</span>
              <span className="text-right tabular-nums text-muted-foreground">{row.total}</span>
              <span className={cn("text-right tabular-nums", row.pending ? "text-foreground" : "text-emerald-500")}>
                {row.pending ? row.pending : "✓ imported"}
              </span>
            </div>
          ))}
          {(ignored.hidden > 0 || ignored.unsupported.length > 0) && (
            <div className="border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground space-y-1">
              {ignored.hidden > 0 && <p>Skipped {ignored.hidden.toLocaleString()} hidden macOS files (“._…”).</p>}
              {ignored.unsupported.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  {ignored.unsupported.length} HEIC photo(s) can’t be read by the browser — convert to JPG and import again: {ignored.unsupported.slice(0, 3).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: run */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {status === "done" ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{created.toLocaleString()} products created</p>
                <p className="text-sm text-muted-foreground">Open a product to add its gold weight, karat and stones — the price is then calculated from today's rate.</p>
              </div>
              <Button onClick={() => setLocation("/products")} className="gold-gradient text-primary-foreground border-0">
                View products
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {keysLoading ? "Checking what is already imported…" : pending.length ? `${pending.length.toLocaleString()} new photos to import` : "Everything in this folder is already imported"}
                  </p>
                  {status !== "idle" && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {done.toLocaleString()} / {queueSize.toLocaleString()} processed · {created.toLocaleString()} created{failed.length ? ` · ${failed.length} failed` : ""}
                    </p>
                  )}
                </div>
                {status === "running" ? (
                  <Button variant="outline" onClick={pause}>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </Button>
                ) : status === "paused" ? (
                  <Button variant="outline" onClick={resume} disabled={settling}>
                    {settling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {settling ? "Finishing current uploads…" : "Resume"}
                  </Button>
                ) : (
                  <Button onClick={run} disabled={keysLoading || settling || !pending.length} className="gold-gradient text-primary-foreground border-0">
                    <Upload className="mr-2 h-4 w-4" /> Start import
                  </Button>
                )}
              </div>
              {status !== "idle" && (
                <div className="space-y-1.5">
                  <Progress value={percent} />
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {status === "running" ? "Keep this tab open until the import finishes." : "Paused — resume any time; finished photos are skipped."}
                  </p>
                </div>
              )}
            </>
          )}

          {failed.length > 0 && (
            <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-medium text-foreground">
                <TriangleAlert className="h-4 w-4 text-amber-500" /> {failed.length} photo(s) failed — run the import again to retry them
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {failed.slice(0, 200).map(item => (
                  <li key={item.key}>
                    <span className="text-foreground">{item.key}</span> — {item.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
