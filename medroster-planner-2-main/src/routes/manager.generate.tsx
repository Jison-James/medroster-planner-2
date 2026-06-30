import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { rosterService, conflictService } from "@/services";
import { toast } from "sonner";
import { ShiftBadge, shiftMeta } from "@/components/shared/ShiftBadge";
import { Check, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import type { ShiftType } from "@/types";

export const Route = createFileRoute("/manager/generate")({ component: GenerateRoster });

const steps = ["Select period", "Staff requirements", "Generate", "Preview", "Publish"];

function GenerateRoster() {
  const { staff, setRoster, setConflicts, setActiveRosterId, setRostersList, refreshRosterData } = useApp();
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + 7*864e5).toISOString().slice(0, 10));
  const [req, setReq] = useState({
    morning: { Doctors: 2, Nurses: 4, Staff: 2 },
    evening: { Doctors: 2, Nurses: 3, Staff: 2 },
    night: { Doctors: 1, Nurses: 2, Staff: 1 },
  });
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [published, setPublished] = useState(false);
  const [generatedRoster, setGeneratedRoster] = useState<any>(null);
  const [generatedRosterShifts, setGeneratedRosterShifts] = useState<any[]>([]);

  const generate = async () => {
    setGenerating(true); setProgress(0);
    const interval = setInterval(() => setProgress((p) => Math.min(95, p + 9)), 100);
    try {
      const res = await rosterService.generate({ startDate: start, endDate: end, requirements: req });
      setGeneratedRoster(res.roster);
      setGeneratedRosterShifts(res.shifts || []);
      
      // Update active roster id
      if (res.roster?.id) {
        setActiveRosterId(res.roster.id);
        
        // Update rosters list in context
        rosterService.list().then(data => {
          if (data?.length) setRostersList(data);
        });
      }
      
      clearInterval(interval); setProgress(100);
      setTimeout(() => { setGenerating(false); setStep(3); }, 300);
    } catch (err) {
      clearInterval(interval);
      setGenerating(false);
      toast.error("Generation failed");
    }
  };
  const publish = async () => {
    if (!generatedRoster) {
      toast.error("No generated roster to publish");
      return;
    }
    try {
      await rosterService.publish(generatedRoster.id);
      
      // Force-refresh all roster data (shifts, conflicts, rosters list)
      // since activeRosterId doesn't change, the useEffect won't re-trigger
      refreshRosterData();

      setPublished(true);
      toast.success("Roster published");
    } catch (err) {
      console.error(err);
      toast.error("Publishing failed");
    }
  };

  return (
    <div>
      <PageHeader title="Generate roster" description="Walk through 5 quick steps to plan the next period." />

      <Card className="mb-4 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  i < step ? "bg-success text-success-foreground" :
                  i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("hidden text-sm md:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
                {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Period</Label>
                <div className="flex rounded-xl border border-border bg-card p-1">
                  {(["daily","weekly","monthly"] as const).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize",
                        period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {(["morning","evening","night"] as ShiftType[]).map((s) => (
                <div key={s} className="rounded-2xl border border-border p-4">
                  <ShiftBadge shift={s} showTime />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["Doctors","Nurses","Staff"] as const).map((k) => (
                      <div key={k} className="space-y-1.5">
                        <Label>{k}</Label>
                        <Input type="number" min={0} value={req[s][k]} onChange={(e) => setReq({...req, [s]: { ...req[s], [k]: Number(e.target.value) }})} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div>
              <div>
                <h3 className="font-display text-xl font-semibold">Ready to generate</h3>
                <p className="mt-1 text-sm text-muted-foreground">We'll fairly assign your team across the selected period.</p>
              </div>
              {generating ? (
                <div className="mx-auto max-w-md space-y-2">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">Working on it… {progress}%</p>
                </div>
              ) : (
                <Button size="lg" onClick={generate}><Sparkles className="mr-2 h-4 w-4" />Generate roster</Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold">Preview</h3>
              <p className="text-sm text-muted-foreground">Here's the generated roster — review before publishing.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr>
                    <th className="p-2 text-left text-xs text-muted-foreground">Date</th>
                    {(["morning","evening","night"] as ShiftType[]).map((s) => <th key={s} className="p-2 text-left text-xs text-muted-foreground">{shiftMeta[s].label}</th>)}
                  </tr></thead>
                  <tbody>
                    {generatedRosterShifts.length === 0 ? (
                      Array.from({ length: 7 }).map((_, d) => (
                        <tr key={d} className="border-t border-border">
                          <td className="p-2 font-mono-data text-xs">{new Date(Date.now() + d*864e5).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</td>
                          {(["morning","evening","night"] as ShiftType[]).map((s) => (
                            <td key={s} className="p-2"><ShiftBadge shift={s} /> <span className="ml-1 text-xs text-muted-foreground">{req[s].Doctors + req[s].Nurses + req[s].Staff} assigned</span></td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      Array.from(new Set(generatedRosterShifts.map((s: any) => s.date))).sort().map((dateStr: any) => (
                        <tr key={dateStr} className="border-t border-border">
                          <td className="p-2 font-mono-data text-xs">{new Date(dateStr).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</td>
                          {(["morning","evening","night"] as ShiftType[]).map((s) => {
                            const list = generatedRosterShifts.filter((x: any) => x.date === dateStr && x.shift === s);
                            return (
                              <td key={s} className="p-2">
                                <div className="space-y-1">
                                  <ShiftBadge shift={s} />
                                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                                    {list.map((e: any) => {
                                      const member = staff.find((x) => x.id === e.staffId);
                                      if (!member) return null;
                                      return (
                                        <span key={e.id} className="inline-flex items-center rounded bg-muted/60 px-1 py-0.5 text-[9px] font-medium text-foreground">
                                          {member.name.split(" ")[0]}
                                        </span>
                                      );
                                    })}
                                    {list.length === 0 && <span className="text-[10px] text-muted-foreground">Empty</span>}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 py-8 text-center">
              {published ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success"><Check className="h-7 w-7" /></div>
                  <h3 className="font-display text-xl font-semibold">Roster published</h3>
                  <p className="text-sm text-muted-foreground">Your team will see the updated schedule.</p>
                </>
              ) : (
                <>
                  <h3 className="font-display text-xl font-semibold">Publish this roster?</h3>
                  <p className="text-sm text-muted-foreground">Staff will be notified once published.</p>
                  <Button size="lg" onClick={publish}>Publish roster</Button>
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between border-t border-border pt-4">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
            {step < 2 && <Button onClick={() => setStep((s) => s + 1)}>Continue<ArrowRight className="ml-1 h-4 w-4" /></Button>}
            {step === 3 && <Button onClick={() => setStep(4)}>Continue to publish<ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
