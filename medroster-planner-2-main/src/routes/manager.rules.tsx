import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { settingsService } from "@/services";
import type { RosterRules } from "@/types";

export const Route = createFileRoute("/manager/rules")({ component: Rules });

function Rules() {
  const { rules, setRules } = useApp();
  const [draft, setDraft] = useState<RosterRules>(rules);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);

  const update = <K extends keyof RosterRules>(k: K, v: RosterRules[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await settingsService.save(draft); setRules(draft); toast.success("Rules saved"); }
    catch { toast.error("Couldn't save changes — try again."); }
    finally { setSaving(false); }
  };

  const Section = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="font-display">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  const NumField = ({ k, label }: { k: keyof RosterRules; label: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" value={draft[k] as number} onChange={(e) => update(k, Number(e.target.value) as never)} />
    </div>
  );
  const ToggleField = ({ k, label }: { k: keyof RosterRules; label: string }) => (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <Label>{label}</Label>
      <Switch checked={draft[k] as boolean} onCheckedChange={(v) => update(k, v as never)} />
    </div>
  );

  return (
    <div className="pb-24">
      <PageHeader title="Roster rules" description="Set the limits and fairness rules that keep your team well rested." />

      <div className="space-y-5">
        <Section title="Work limits" description="The maximum hours your team should work.">
          <div className="grid gap-3 sm:grid-cols-3">
            <NumField k="maxHoursPerDay" label="Max hours/day" />
            <NumField k="maxHoursPerWeek" label="Max hours/week" />
            <NumField k="maxHoursPerMonth" label="Max hours/month" />
          </div>
        </Section>
        <Section title="Consecutive rules" description="How many days in a row someone can work.">
          <div className="grid gap-3 sm:grid-cols-2"><NumField k="maxConsecutiveDays" label="Max consecutive working days" /></div>
        </Section>
        <Section title="Rest rules" description="Minimum rest between shifts.">
          <div className="grid gap-3 sm:grid-cols-2"><NumField k="minRestHours" label="Minimum rest hours between shifts" /></div>
        </Section>
        <Section title="Night shift rules" description="Limit how often someone works nights.">
          <div className="grid gap-3 sm:grid-cols-2"><NumField k="maxNightsPerWeek" label="Max night shifts/week" /><NumField k="maxNightsPerMonth" label="Max night shifts/month" /></div>
        </Section>
        <Section title="Fairness rules" description="Spread the load evenly across the team.">
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField k="equalShiftDistribution" label="Equal shift distribution" />
            <ToggleField k="equalWeekendDistribution" label="Equal weekend distribution" />
            <ToggleField k="equalNightDistribution" label="Equal night distribution" />
            <ToggleField k="balanceWorkload" label="Balance workload" />
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
            <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(rules)}>Discard</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
