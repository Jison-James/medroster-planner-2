import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { settingsService, authService, staffService } from "@/services";

const pwdSchema = z.object({
  current: z.string().min(1, "Required"),
  next: z.string().min(8, "Use at least 8 characters"),
  confirm: z.string().min(1, "Required"),
}).refine((d) => d.next === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export function ProfileTabs({ scope = "manager" }: { scope?: "manager" | "staff" }) {
  const { staff, currentUserId, setStaff } = useApp();
  const me = staff.find((s) => s.id === currentUserId) ?? staff[0];

  const [info, setInfo] = useState({ name: me?.name || "", email: me?.email || "", phone: me?.phone || "", department: me?.department || "" });
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem(`prefs_${currentUserId}`);
    return saved ? JSON.parse(saved) : { email: true, inApp: true, weeklyDigest: false };
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof pwdSchema>>({ resolver: zodResolver(pwdSchema) });

  const savePersonal = async () => {
    if (!me?.id) return;
    try {
      const updatedUser = await staffService.save({ id: me.id, ...info });
      // Update global context state
      setStaff((arr) => arr.map((s) => s.id === me.id ? { ...s, name: info.name, email: info.email, phone: info.phone, department: info.department } : s));
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    }
  };
  const savePrefs = async () => {
    localStorage.setItem(`prefs_${currentUserId}`, JSON.stringify(prefs));
    toast.success("Preferences saved");
  };
  const submitPwd = handleSubmit(async (data) => {
    try {
      await authService.changePassword(data);
      toast.success("Password changed");
      reset();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    }
  });

  return (
    <Tabs defaultValue="personal">
      <TabsList><TabsTrigger value="personal">Personal information</TabsTrigger><TabsTrigger value="password">Password</TabsTrigger><TabsTrigger value="preferences">Preferences</TabsTrigger></TabsList>

      <TabsContent value="personal" className="mt-4">
        <Card className="rounded-2xl"><CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16"><AvatarFallback style={{ backgroundColor: me.avatarColor, color: "#fff" }} className="text-lg">{me.name.split(" ").map((n)=>n[0]).join("")}</AvatarFallback></Avatar>
            <div><p className="font-display text-lg font-semibold">{me.name}</p><p className="text-sm text-muted-foreground">{scope === "manager" ? "Manager" : me.role} · {me.department}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={info.department} onChange={(e) => setInfo({ ...info, department: e.target.value })} /></div>
          </div>
          <Button onClick={savePersonal}>Save changes</Button>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="password" className="mt-4">
        <Card className="rounded-2xl"><CardContent className="p-6">
          <form onSubmit={submitPwd} className="max-w-md space-y-4">
            <div className="space-y-1.5"><Label>Current password</Label><Input type="password" {...register("current")} />{errors.current && <p className="text-xs text-destructive">{errors.current.message}</p>}</div>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" {...register("next")} />{errors.next && <p className="text-xs text-destructive">{errors.next.message}</p>}</div>
            <div className="space-y-1.5"><Label>Confirm new password</Label><Input type="password" {...register("confirm")} />{errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}</div>
            <Button type="submit">Change password</Button>
          </form>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="preferences" className="mt-4">
        <Card className="rounded-2xl"><CardContent className="p-6 space-y-4">
          {[
            { key: "email" as const, label: "Email notifications", desc: "Updates about your shifts and requests." },
            { key: "inApp" as const, label: "In-app notifications", desc: "See the latest activity in the bell." },
            { key: "weeklyDigest" as const, label: "Weekly digest", desc: "A summary of your week, every Monday." },
          ].map((p) => (
            <div key={p.key} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div><p className="font-medium">{p.label}</p><p className="text-sm text-muted-foreground">{p.desc}</p></div>
              <Switch checked={prefs[p.key]} onCheckedChange={(v) => setPrefs({ ...prefs, [p.key]: v })} />
            </div>
          ))}
          <Button onClick={savePrefs}>Save preferences</Button>
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}
