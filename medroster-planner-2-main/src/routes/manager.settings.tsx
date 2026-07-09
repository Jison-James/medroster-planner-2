import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sliders, Heart } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services";

export const Route = createFileRoute("/manager/settings")({ component: SettingsPage });

function SettingsPage() {
  const [general, setGeneral] = useState({ name: "Riverside Health", timezone: "America/New_York" });
  const [notif, setNotif] = useState({ email: true, inApp: true });
  const save = async (label: string, data: unknown) => { await settingsService.save(data); toast.success(`${label} saved`); };

  return (
    <div>
      <PageHeader title="Settings" description="Configure how MedRoster works for your hospital." />
      <div className="space-y-4">
        <Card className="rounded-2xl"><CardContent className="p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">General</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Hospital name</Label><Input value={general.name} onChange={(e) => setGeneral({ ...general, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Time zone</Label>
              <Select value={general.timezone} onValueChange={(v) => setGeneral({ ...general, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">America/New York</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los Angeles</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart className="h-6 w-6" fill="currentColor" /></div>
                <Button variant="outline" onClick={() => toast("Logo upload is simulated in this demo")}>Upload logo</Button>
              </div>
            </div>
          </div>
          <Button onClick={() => save("General settings", general)}>Save changes</Button>
        </CardContent></Card>

        <Card className="rounded-2xl"><CardContent className="p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Roster settings</h3>
          <p className="text-sm text-muted-foreground">Quick links to fine-tune your rostering rules.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/manager/rules"><Sliders className="mr-1 h-4 w-4" />Work limits & fairness</Link></Button>
            <Button asChild variant="outline"><Link to="/manager/shift-templates">Shift templates</Link></Button>
          </div>
        </CardContent></Card>

        <Card className="rounded-2xl"><CardContent className="p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Notifications</h3>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div><p className="font-medium">Email notifications</p><p className="text-sm text-muted-foreground">Send updates by email.</p></div>
            <Switch checked={notif.email} onCheckedChange={(v) => setNotif({ ...notif, email: v })} />
          </div>

          <Button onClick={() => save("Notification preferences", notif)}>Save preferences</Button>
        </CardContent></Card>
      </div>
    </div>
  );
}
