import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, FolderOpen, Loader2, Merge, Pause, Play, Sparkles, Star, TriangleAlert, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { analysePhoto, readCaptureTime } from "@/lib/photoFeatures";
import { heicToJpeg, isHeic } from "@/lib/imageFiles";
import { groupPhotos, type PhotoFeatures } from "@/lib/photoGrouping";

/**
 * Import products from photo folders, e.g. "Shaikha Jewellers/Diamond Rings/*.jpeg".
 * Each sub-folder becomes a category + collection. Photos of the same piece are
 * grouped automatically (capture time + look-alike), the user reviews the groups,
 * then each group becomes ONE product with all its photos. Claude names each product
 * from its photos when ANTHROPIC_API_KEY is set on the server.
 */

const FULL_SIDE = 1600;
const THUMB_SIDE = 480;
const ANALYSE_CONCURRENCY = 4;
const IMPORT_CONCURRENCY = 2;
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

type Photo = { key: string; file: File; folder: string; time: number | null; preview: string; features: PhotoFeatures | null };
type Group = { id: string; folder: string; keys: string[]; name: string };
type Stage = "pick" | "analysing" | "review" | "importing" | "done";

/** "Diamond sets" -> "Diamond Sets" so categories/collections look consistent. */
function titleCase(name: string): string {
  return name
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map(word => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function folderOf(file: File): string | null {
  const parts = (file.webkitRelativePath || file.name).split("/").filter(Boolean);
  return parts.length >= 2 ? titleCase(parts[parts.length - 2]!) : null;
}

/** Unique key: the path below the chosen top folder, e.g. "Diamond Rings/IMG_0001.jpeg". */
function photoKeyOf(file: File): string {
  const parts = (file.webkitRelativePath || file.name).split("/").filter(Boolean);
  return (parts.length > 2 ? parts.slice(1) : parts.slice(-2)).join("/");
}

async function resizeToDataUrl(file: File, maxSide: number, quality: number): Promise<string> {
  const probe = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSide / Math.max(probe.width, probe.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(probe.width * scale));
    canvas.height = Math.max(1, Math.round(probe.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");
    context.drawImage(probe, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    probe.close();
  }
}

/** Run tasks with limited parallelism. */
async function pool<T>(items: T[], limit: number, task: (item: T, index: number) => Promise<void>, shouldStop?: () => boolean) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!shouldStop?.()) {
        const index = next++;
        if (index >= items.length) return;
        await task(items[index]!, index);
      }
    })
  );
}

let groupCounter = 0;
const newGroupId = () => `g${++groupCounter}`;

export default function ImportProducts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: importedKeys, isLoading: keysLoading } = trpc.products.importedKeys.useQuery();
  const aiStatus = trpc.products.aiNamingStatus.useQuery(undefined, { refetchOnWindowFocus: false });
  const uploadImage = trpc.upload.image.useMutation();
  const importGroup = trpc.products.importGroup.useMutation();

  const [stage, setStage] = useState<Stage>("pick");
  const [photos, setPhotos] = useState<Map<string, Photo>>(new Map());
  const [groups, setGroups] = useState<Group[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState({ hidden: 0, unsupported: [] as string[], alreadyImported: 0 });
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [activeFolder, setActiveFolder] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [created, setCreated] = useState<Array<{ name: string; folder: string }>>([]);
  const [failed, setFailed] = useState<Array<{ label: string; message: string }>>([]);
  const stopRef = useRef(false);
  const doneGroups = useRef(new Set<string>());
  const [paused, setPaused] = useState(false);

  // Free preview object URLs when leaving the page.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach(photo => photo.preview && URL.revokeObjectURL(photo.preview)), []);

  useEffect(() => {
    if (stage !== "importing" && stage !== "analysing") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  const liveGroups = useMemo(
    () => groups.map(group => ({ ...group, keys: group.keys.filter(key => !excluded.has(key)) })).filter(group => group.keys.length),
    [groups, excluded]
  );

  const folders = useMemo(() => {
    const map = new Map<string, { products: number; photos: number }>();
    for (const group of liveGroups) {
      const row = map.get(group.folder) ?? { products: 0, photos: 0 };
      row.products++;
      row.photos += group.keys.length;
      map.set(group.folder, row);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [liveGroups]);

  const folderGroups = liveGroups.filter(group => group.folder === activeFolder);

  // ---------- 1. Pick + analyse ----------
  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    const imported = new Set(importedKeys ?? []);
    let hidden = 0;
    let alreadyImported = 0;
    const unsupported: string[] = [];
    const list: Array<{ file: File; folder: string; key: string }> = [];
    for (const file of Array.from(files)) {
      if (file.name.startsWith(".")) {
        hidden++; // macOS "._name.jpeg" metadata files
        continue;
      }
      if (!IMAGE_EXT.test(file.name)) continue;
      const folder = folderOf(file);
      if (!folder) continue;
      const key = photoKeyOf(file);
      if (imported.has(key)) {
        alreadyImported++;
        continue;
      }
      list.push({ file, folder, key });
    }
    setSkipped({ hidden, unsupported, alreadyImported });
    if (!list.length) {
      toast.message(alreadyImported ? "Every photo in this folder is already imported." : "No photos (JPG, PNG, HEIC) found inside sub-folders.");
      return;
    }

    setStage("analysing");
    setProgress({ done: 0, total: list.length });
    const result = new Map<string, Photo>();
    const unreadable: string[] = [];
    await pool(list, ANALYSE_CONCURRENCY, async item => {
      let photo: Photo = { ...item, time: null, preview: "", features: null };
      try {
        // Mac / iPhone HEIC photos are converted to JPG here; the JPG is what gets uploaded.
        const file = isHeic(item.file) ? await heicToJpeg(item.file, FULL_SIDE) : item.file;
        const [time, fingerprint] = await Promise.all([readCaptureTime(item.file), analysePhoto(file)]);
        photo = {
          ...item,
          file,
          time,
          preview: fingerprint.preview,
          features: { key: item.key, time, shape: fingerprint.shape, aspect: fingerprint.aspect },
        };
      } catch {
        // Unreadable photo: it still gets its own group so nothing is lost.
        if (isHeic(item.file)) unreadable.push(item.file.webkitRelativePath || item.file.name);
      }
      result.set(item.key, photo);
      setProgress(p => ({ ...p, done: p.done + 1 }));
    });

    if (unreadable.length) setSkipped(current => ({ ...current, unsupported: unreadable }));

    // Group per folder.
    const byFolder = new Map<string, Photo[]>();
    for (const photo of Array.from(result.values())) byFolder.set(photo.folder, [...(byFolder.get(photo.folder) ?? []), photo]);
    const nextGroups: Group[] = [];
    for (const [folder, items] of Array.from(byFolder.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const readable = items.filter(photo => photo.features);
      for (const keys of groupPhotos(readable.map(photo => photo.features!))) nextGroups.push({ id: newGroupId(), folder, keys, name: "" });
      for (const photo of items.filter(photo => !photo.features)) nextGroups.push({ id: newGroupId(), folder, keys: [photo.key], name: "" });
    }

    doneGroups.current = new Set();
    setCreated([]);
    setPhotos(result);
    setGroups(nextGroups);
    setExcluded(new Set());
    setSelected(new Set());
    setActiveFolder(nextGroups[0]?.folder ?? "");
    setStage("review");
  };

  // ---------- 2. Review actions ----------
  const toggle = (key: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const moveSelected = (target: string) => {
    if (!selected.size) return;
    const keys = Array.from(selected);
    setGroups(current => {
      let next = current.map(group => ({ ...group, keys: group.keys.filter(key => !selected.has(key)) }));
      if (target === "new") {
        next.push({ id: newGroupId(), folder: activeFolder, keys, name: "" });
      } else {
        next = next.map(group => (group.id === target ? { ...group, keys: [...group.keys, ...keys] } : group));
      }
      return next.filter(group => group.keys.length);
    });
    setSelected(new Set());
  };

  const removeSelected = () => {
    setExcluded(current => new Set([...Array.from(current), ...Array.from(selected)]));
    setSelected(new Set());
  };

  const makeCover = (groupId: string, key: string) =>
    setGroups(current => current.map(group => (group.id === groupId ? { ...group, keys: [key, ...group.keys.filter(k => k !== key)] } : group)));

  /** Join this product's photos into the product shown above it (same folder). */
  const mergeWithPrevious = (groupId: string) =>
    setGroups(current => {
      const index = current.findIndex(group => group.id === groupId);
      const group = current[index];
      if (!group) return current;
      let previousIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (current[i]!.folder === group.folder && current[i]!.keys.some(key => !excluded.has(key))) {
          previousIndex = i;
          break;
        }
      }
      if (previousIndex < 0) return current;
      const next = [...current];
      next[previousIndex] = { ...next[previousIndex]!, keys: [...next[previousIndex]!.keys, ...group.keys] };
      next.splice(index, 1);
      return next;
    });

  const rename = (groupId: string, name: string) =>
    setGroups(current => current.map(group => (group.id === groupId ? { ...group, name } : group)));

  // ---------- 3. Import ----------
  const runImport = async () => {
    // On resume, groups already finished are not uploaded again.
    const queue = liveGroups.filter(group => !doneGroups.current.has(group.id));
    if (!queue.length) {
      setStage("done");
      return;
    }
    stopRef.current = false;
    setPaused(false);
    setStage("importing");
    setProgress({ done: 0, total: queue.length });
    setFailed([]);

    await pool(
      queue,
      IMPORT_CONCURRENCY,
      async group => {
        try {
          const imageUrls: string[] = [];
          let thumbnailUrl = "";
          for (const [index, key] of group.keys.entries()) {
            const photo = photos.get(key)!;
            const full = await resizeToDataUrl(photo.file, FULL_SIDE, 0.85);
            imageUrls.push((await uploadImage.mutateAsync({ base64: full, filename: `${index}.jpg`, contentType: "image/jpeg" })).url);
            if (index === 0) {
              const thumb = await resizeToDataUrl(photo.file, THUMB_SIDE, 0.78);
              thumbnailUrl = (await uploadImage.mutateAsync({ base64: thumb, filename: "thumb.jpg", contentType: "image/jpeg" })).url;
            }
          }
          const result = await importGroup.mutateAsync({
            folder: group.folder,
            sourceKey: group.keys[0]!,
            photoKeys: group.keys,
            imageUrls,
            thumbnailUrl,
            name: group.name.trim() || undefined,
          });
          doneGroups.current.add(group.id);
          if (result.status === "created") setCreated(list => [...list, { name: result.name, folder: group.folder }]);
        } catch (error) {
          const message = (error as Error)?.message || "Upload failed";
          setFailed(list => [...list, { label: `${group.folder} · ${group.keys[0]}`, message }]);
          if (/UPLOAD_DIR|permission|FORBIDDEN|login/i.test(message)) {
            stopRef.current = true;
            setPaused(true);
            toast.error(message);
          }
        } finally {
          setProgress(p => ({ ...p, done: p.done + 1 }));
        }
      },
      () => stopRef.current
    );

    utils.products.invalidate();
    utils.collections.invalidate();
    utils.categories.invalidate();
    aiStatus.refetch();
    if (stopRef.current) {
      setPaused(true);
      return;
    }
    setStage("done");
    toast.success("Import finished");
  };

  const stopImport = () => {
    stopRef.current = true;
    setPaused(true);
  };

  // Resume: products already created are skipped on the server by their sourceKey.
  const resumeImport = () => {
    runImport();
  };

  // ---------- UI ----------
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/products")} aria-label="Back to products">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import products from photos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each sub-folder becomes a category and collection. Photos of the same piece are grouped into one product — check the groups before importing.
          </p>
        </div>
      </div>

      {aiStatus.data && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            aiStatus.data.configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
          )}
        >
          <Sparkles className={cn("mt-0.5 h-4 w-4 shrink-0", aiStatus.data.configured ? "text-emerald-500" : "text-amber-500")} />
          <p className="text-foreground">
            {aiStatus.data.configured
              ? "Claude looks at each product's photos and names it (e.g. “Emerald Tennis Bracelet”) with a short description. Type a name yourself to override."
              : "AI naming is off: products get folder-based names (e.g. “Diamond Ring 0001”). Add ANTHROPIC_API_KEY on Railway to name products from their photos."}
          </p>
        </div>
      )}

      {stage === "pick" && (
        <>
          <AiRenamePanel configured={!!aiStatus.data?.configured} pending={aiStatus.data?.pending ?? 0} onChanged={() => aiStatus.refetch()} />
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 font-medium text-foreground">Select your main photo folder (e.g. “Shaikha Jewellers”)</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing is uploaded yet — photos are first checked and grouped on this computer.</p>
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
            <Button className="mt-5 gold-gradient text-primary-foreground border-0" onClick={() => inputRef.current?.click()} disabled={keysLoading}>
              <FolderOpen className="mr-2 h-4 w-4" />
              {keysLoading ? "Checking imported photos…" : "Choose folder"}
            </Button>
          </div>
        </>
      )}

      {stage === "analysing" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading photos and grouping them into products…
          </p>
          <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {progress.done.toLocaleString()} / {progress.total.toLocaleString()} photos
          </p>
        </div>
      )}

      {stage === "review" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
            <div>
              <p className="font-medium text-foreground">
                {liveGroups.length.toLocaleString()} products from {liveGroups.reduce((n, g) => n + g.keys.length, 0).toLocaleString()} photos
              </p>
              <p className="text-sm text-muted-foreground">
                Click photos to select them, then move them to another product. The first photo of each product is its cover.
                {skipped.alreadyImported ? ` ${skipped.alreadyImported.toLocaleString()} photos already imported were left out.` : ""}
                {skipped.hidden ? ` ${skipped.hidden.toLocaleString()} hidden macOS files skipped.` : ""}
              </p>
              {skipped.unsupported.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {skipped.unsupported.length} HEIC photo(s) could not be converted (no internet or damaged file) — export them as JPG and import again.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage("pick")}>
                Start over
              </Button>
              <Button onClick={runImport} disabled={!liveGroups.length} className="gold-gradient text-primary-foreground border-0">
                <Upload className="mr-2 h-4 w-4" /> Import {liveGroups.length.toLocaleString()} products
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav className="space-y-1 lg:sticky lg:top-20 lg:self-start">
              {folders.map(([folder, row]) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder);
                    setSelected(new Set());
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                    folder === activeFolder ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="truncate">{folder}</span>
                  <span className="ml-2 shrink-0 text-xs tabular-nums">{row.products}</span>
                </button>
              ))}
            </nav>

            <div className="space-y-4 pb-24">
              {folderGroups.map((group, index) => (
                <div key={group.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Product {index + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.keys.length} photo{group.keys.length > 1 ? "s" : ""}
                    </span>
                    <Input
                      value={group.name}
                      onChange={event => rename(group.id, event.target.value)}
                      placeholder={aiStatus.data?.configured ? "Name (leave empty — Claude names it)" : "Name (optional)"}
                      className="h-8 max-w-xs flex-1 bg-background text-sm"
                    />
                    {index > 0 && (
                      <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={() => mergeWithPrevious(group.id)}>
                        <Merge className="mr-1.5 h-3.5 w-3.5" /> Same as previous
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.keys.map((key, photoIndex) => {
                      const photo = photos.get(key);
                      const on = selected.has(key);
                      return (
                        <div key={key} className="group/photo relative">
                          <button
                            type="button"
                            onClick={() => toggle(key)}
                            className={cn(
                              "block overflow-hidden rounded-lg bg-muted outline-none transition",
                              photoIndex === 0 ? "h-28 w-28" : "h-24 w-24",
                              on ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:opacity-90"
                            )}
                            title={key}
                          >
                            {photo?.preview ? (
                              <img src={photo.preview} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">no preview</span>
                            )}
                          </button>
                          {photoIndex === 0 ? (
                            <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Cover</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => makeCover(group.id, key)}
                              className="absolute left-1 top-1 hidden rounded bg-black/60 p-1 text-white group-hover/photo:block"
                              title="Make cover"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-border bg-popover px-4 py-3 shadow-2xl">
              <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
              <Select value="" onValueChange={moveSelected}>
                <SelectTrigger className="h-9 w-[220px] bg-background">
                  <SelectValue placeholder="Move to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">A new product</SelectItem>
                  {folderGroups.map((group, index) => (
                    <SelectItem key={group.id} value={group.id}>
                      Product {index + 1}
                      {group.name ? ` — ${group.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={removeSelected}>
                Don’t import
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(new Set())} aria-label="Clear selection">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {(stage === "importing" || stage === "done") && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {stage === "done" ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{created.length.toLocaleString()} products created</p>
                <p className="text-sm text-muted-foreground">Open a product to add its gold weight, karat and stones — its price then follows today's rate.</p>
              </div>
              <Button onClick={() => setLocation("/products")} className="gold-gradient text-primary-foreground border-0">
                View products
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-foreground tabular-nums">
                  {progress.done.toLocaleString()} / {progress.total.toLocaleString()} products · {created.length.toLocaleString()} created
                  {failed.length ? ` · ${failed.length} failed` : ""}
                </p>
                {paused ? (
                  <Button variant="outline" onClick={resumeImport}>
                    <Play className="mr-2 h-4 w-4" /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" onClick={stopImport}>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </Button>
                )}
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {!paused && <Loader2 className="h-3 w-3 animate-spin" />}
                {paused ? "Paused — resume any time; products already created are skipped." : "Uploading photos and creating products. Keep this tab open."}
              </p>
            </>
          )}

          {created.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              {created
                .slice(-12)
                .reverse()
                .map((item, i) => (
                  <li key={`${item.name}-${i}`} className="flex justify-between gap-3">
                    <span className="text-foreground truncate">{item.name}</span>
                    <span className="text-muted-foreground shrink-0">{item.folder}</span>
                  </li>
                ))}
            </ul>
          )}

          {failed.length > 0 && (
            <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-medium text-foreground">
                <TriangleAlert className="h-4 w-4 text-amber-500" /> {failed.length} product(s) failed — press Resume to retry them
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {failed.slice(0, 200).map((item, i) => (
                  <li key={`${item.label}-${i}`}>
                    <span className="text-foreground">{item.label}</span> — {item.message}
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

/** Gives already-imported products names that match their photos, a few at a time. */
function AiRenamePanel({ configured, pending, onChanged }: { configured: boolean; pending: number; onChanged: () => void }) {
  const utils = trpc.useUtils();
  const batch = trpc.products.aiNameBatch.useMutation();
  const [running, setRunning] = useState(false);
  const [named, setNamed] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const stop = useRef(false);

  if (!configured || (!pending && !running && !named)) return null;

  const start = async () => {
    stop.current = false;
    setRunning(true);
    try {
      for (;;) {
        if (stop.current) break;
        const result = await batch.mutateAsync({ size: 5 });
        setNamed(n => n + result.named);
        setLeft(result.remaining);
        if (!result.remaining) break;
        // Every photo in the batch failed (e.g. key or quota problem): stop instead of looping.
        if (result.named === 0 && result.failed.length) {
          toast.error(result.failed[0] ?? "AI naming failed");
          break;
        }
      }
    } catch (error) {
      toast.error((error as Error).message || "AI naming failed");
    } finally {
      setRunning(false);
      utils.products.invalidate();
      onChanged();
    }
  };

  const remaining = left ?? pending;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <div>
        <p className="font-medium text-foreground">
          {remaining ? `${remaining.toLocaleString()} imported products still have folder names` : "All imported products are named"}
        </p>
        <p className="text-sm text-muted-foreground">
          {running ? `Naming from photos… ${named.toLocaleString()} done` : named ? `${named.toLocaleString()} renamed from their photos` : "Claude can rename them from their photos."}
        </p>
      </div>
      {running ? (
        <Button variant="outline" onClick={() => (stop.current = true)}>
          <Pause className="mr-2 h-4 w-4" /> Stop
        </Button>
      ) : remaining ? (
        <Button onClick={start} className="gold-gradient text-primary-foreground border-0">
          <Sparkles className="mr-2 h-4 w-4" /> Name with AI
        </Button>
      ) : null}
    </div>
  );
}
