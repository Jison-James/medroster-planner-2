import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Heart, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

const schema = z.object({ email: z.string().email("Enter a valid email address") });

function Forgot() {
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema), defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setSent(email);
    setLoading(false);
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart className="h-4 w-4" fill="currentColor" /></div>
          <span className="font-display text-lg font-bold">MedRoster</span>
        </div>
        {!sent ? (
          <>
            <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
            <p className="mt-1 text-sm text-muted-foreground">No worries — enter your email and we'll send you a reset link.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@hospital.org" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
              <MailCheck className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-bold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account matches <span className="font-medium text-foreground">{sent}</span>, we've sent a reset link.
            </p>
            <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
