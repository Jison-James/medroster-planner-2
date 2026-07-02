import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { availabilityService } from "@/services";
import { apiCall } from "@/api/api";
import type { ShiftType } from "@/types";

export const Route = createFileRoute("/staff/availability")({ component: Availability });

const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function Availability() {
  const { staff, currentUserId, setStaff } = useApp();
  const me = staff.find((s) => s.id === currentUserId) ?? staff[0];
  
  const [avail, setAvail] = useState<string[]>(me?.availableDays || []);
  const [pref, setPref] = useState<ShiftType | "none">(me?.preferredShift || "none");
  const [off, setOff] = useState<string[]>(me?.preferredDaysOff || []);
  const [notes, setNotes] = useState("");
  const [availabilityId, setAvailabilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current availability from the backend
  useEffect(() => {
    if (me?.id) {
      setLoading(true);
      apiCall('/roster/availability/')
        .then(data => {
          if (data && data.length > 0) {
            const record = data[0];
            setAvailabilityId(record.id);
            setAvail(record.availableDays || []);
            setPref(record.preferredShift || "none");
            setOff(record.preferredDaysOff || []);
            setNotes(record.notes || "");
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load availability from database");
        })
        .finally(() => setLoading(false));
    }
  }, [me?.id]);

  const save = async () => {
    if (!me?.id) return;
    setSaving(true);

    const payload = {
      availableDays: avail,
      preferredShift: pref,
      preferredDaysOff: off,
      notes: notes,
      staffId: me.id
    };

    try {
      if (availabilityId) {
        // Update existing
        await availabilityService.save({ id: availabilityId, ...payload });
        toast.success("Availability updated successfully");
      } else {
        // Create new
        const res = await apiCall('/roster/availability/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res?.id) setAvailabilityId(res.id);
        toast.success("Availability created successfully");
      }
      // Update global context state
      setStaff((arr) => arr.map((s) => s.id === me.id ? { ...s, availableDays: avail, preferredShift: pref, preferredDaysOff: off } : s));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (list: string[], setter: (v: string[]) => void, day: string) =>
    setter(list.includes(day) ? list.filter((d) => d !== day) : [...list, day]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Availability" description="Tell us when you're available and what shifts you prefer." />
        <Card className="rounded-2xl"><CardContent className="p-12 text-center text-sm text-muted-foreground animate-pulse">Loading availability details...</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Availability" description="Tell us when you're available and what shifts you prefer." />
      <Card className="rounded-2xl"><CardContent className="p-6 space-y-6">
        <div>
          <Label className="mb-3 block">Available days</Label>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 hover:bg-muted">
                <Checkbox checked={avail.includes(d)} onCheckedChange={() => toggle(avail, setAvail, d)} /> <span className="text-sm">{d}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Preferred shift</Label>
            <Select value={pref} onValueChange={(v) => setPref(v as ShiftType | "none")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="night">Night</SelectItem><SelectItem value="none">No preference</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-3 block">Preferred days off</Label>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 hover:bg-muted">
                  <Checkbox checked={off.includes(d)} onCheckedChange={() => toggle(off, setOff, d)} /> <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything your manager should know?" /></div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save availability"}</Button>
      </CardContent></Card>
    </div>
  );
}
