import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Sun, Sunset, Moon, Pencil } from "lucide-react";
import { ShiftBadge } from "@/components/shared/ShiftBadge";
import { useState } from "react";
import { toast } from "sonner";
import type { ShiftTemplate, ShiftType } from "@/types";

export const Route = createFileRoute("/manager/shift-templates")({ component: Templates });

const iconFor = (t: ShiftType | "custom") => t === "morning" ? Sun : t === "evening" ? Sunset : t === "night" ? Moon : Plus;

function Templates() {
  const { templates, setTemplates } = useApp();
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", start: "", end: "", color: "#4F86C6" });

  const save = () => {
    if (editing) {
      setTemplates((arr) => arr.map((t) => t.id === editing.id ? { ...editing } : t));
      toast.success("Shift template updated");
      setEditing(null);
    }
  };
  const create = () => {
    if (!form.name || !form.start || !form.end) { toast.error("Fill all fields"); return; }
    setTemplates((arr) => [...arr, { id: `st${Date.now()}`, name: form.name, start: form.start, end: form.end, type: "custom", color: form.color }]);
    toast.success("Custom shift added");
    setAdding(false); setForm({ name: "", start: "", end: "", color: "#4F86C6" });
  };

  return (
    <div>
      <PageHeader title="Shift templates" description="The three standard shifts your team runs on, plus any custom ones you need." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {templates.map((t) => {
          const Icon = iconFor(t.type);
          return (
            <Card key={t.id} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                </div>
                <p className="mt-4 font-display text-lg font-semibold">{t.name}</p>
                <p className="font-mono-data text-sm text-muted-foreground">{t.start} – {t.end}</p>
                {(t.type === "morning" || t.type === "evening" || t.type === "night") && (
                  <div className="mt-3"><ShiftBadge shift={t.type} /></div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <button onClick={() => setAdding(true)}
          className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-5 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
          <Plus className="h-8 w-8" />
          <span className="mt-2 font-medium">Add custom shift</span>
        </button>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={editing.start} onChange={(e) => setEditing({...editing, start: e.target.value})} /></div>
                <div className="space-y-1.5"><Label>End</Label><Input type="time" value={editing.end} onChange={(e) => setEditing({...editing, end: e.target.value})} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add custom shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Twilight" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={form.start} onChange={(e) => setForm({...form, start: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={form.end} onChange={(e) => setForm({...form, end: e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Color tag</Label><Input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} className="h-10 w-20 p-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={create}>Add shift</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
