import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(4, "Password is too short"),
  remember: z.boolean().optional(),
});

function Login() {
  const navigate = useNavigate();
  const { setRole, setCurrentUserId } = useApp();
  const [show, setShow] = useState(false);
  const [pickedRole, setPickedRole] = useState<"manager" | "staff">("manager");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "demo@medroster.health", password: "demo1234", remember: true },
  });

  const onSubmit = handleSubmit(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setRole(pickedRole);
    setCurrentUserId(pickedRole === "manager" ? "s1" : "s2");
    toast.success(`Welcome back — logged in as ${pickedRole === "manager" ? "Manager" : "Staff"}`);
    navigate({ to: pickedRole === "manager" ? "/manager/dashboard" : "/staff/dashboard" });
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary/8 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart className="h-5 w-5" fill="currentColor" /></div>
          <span className="font-display text-xl font-bold">MedRoster</span>
        </div>
        <div className="space-y-6">
          <svg viewBox="0 0 400 280" className="h-56 w-full max-w-md text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="40" y="60" width="320" height="200" rx="20" fill="#fff" />
            <path d="M40 100h320" />
            <circle cx="80" cy="80" r="6" />
            <circle cx="100" cy="80" r="6" />
            <circle cx="120" cy="80" r="6" />
            <rect x="70" y="130" width="60" height="40" rx="8" className="text-warning" stroke="currentColor" />
            <rect x="150" y="130" width="60" height="40" rx="8" className="text-accent" stroke="currentColor" />
            <rect x="230" y="130" width="60" height="40" rx="8" stroke="currentColor" />
            <path d="M80 200h240" />
            <path d="M80 220h180" />
            <path d="M260 240l20 -20l-20 -20" />
          </svg>
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Calm care, organized.</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Plan rosters, manage leave, and look after your team — all from one warm, friendly place.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© MedRoster · A demo experience</p>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart className="h-4 w-4" fill="currentColor" /></div>
              <span className="font-display text-lg font-bold">MedRoster</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">Log in to manage your shifts and team.</p>

          <div className="mt-6 flex rounded-xl border border-border bg-card p-1">
            {(["manager", "staff"] as const).map((r) => (
              <button key={r} type="button"
                onClick={() => setPickedRole(r)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pickedRole === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                Log in as {r === "manager" ? "Manager" : "Staff"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@hospital.org" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} {...register("password")} aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox {...register("remember")} defaultChecked /> Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">Any email and password will sign you in — this is a demo.</p>
        </div>
      </div>
    </div>
  );
}
