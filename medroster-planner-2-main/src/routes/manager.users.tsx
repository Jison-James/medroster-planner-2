import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { userService } from "@/services";

export const Route = createFileRoute("/manager/users")({ component: UsersPage });

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["manager", "staff"]),
});
type FormData = z.infer<typeof schema>;

function UsersPage() {
  const { users, setUsers } = useApp();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: "staff" } });

  const onSubmit = handleSubmit(async (data) => {
    await userService.invite(data);
    setUsers((arr) => [...arr, { id: `u${arr.length + 1}`, ...data, accountStatus: "Invited" }]);
    toast.success("Invite sent");
    reset({ role: "staff", name: "", email: "" });
    setOpen(false);
  });

  const toggleStatus = async (id: string) => {
    await userService.update({ id });
    setUsers((arr) => arr.map((u) => u.id === id ? { ...u, accountStatus: u.accountStatus === "Active" ? "Disabled" : "Active" } : u));
    toast.success("Account updated");
  };
  const resend = async (id: string) => { await userService.invite({ id }); toast.success("Invite resent"); };

  return (
    <div>
      <PageHeader title="User management" description="Manage system login accounts for your team." actions={
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Invite user</Button></SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader><SheetTitle>Invite a user</SheetTitle></SheetHeader>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5"><Label>Full name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={watch("role")} onValueChange={(v) => setValue("role", v as "manager" | "staff")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full"><MailCheck className="mr-1 h-4 w-4" />Send invite</Button>
            </form>
          </SheetContent>
        </Sheet>
      } />

      <Card className="rounded-2xl"><CardContent className="p-4 sm:p-5 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="capitalize">{u.role}</TableCell>
                <TableCell><StatusBadge tone={statusToTone(u.accountStatus)} label={u.accountStatus} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {u.accountStatus === "Invited" && <Button size="sm" variant="ghost" onClick={() => resend(u.id)}>Resend invite</Button>}
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(u.id)}>{u.accountStatus === "Active" ? "Disable" : "Enable"}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
