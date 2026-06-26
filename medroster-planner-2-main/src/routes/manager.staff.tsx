import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge, statusToTone } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { staffService } from "@/services";
import type { Staff } from "@/types";

export const Route = createFileRoute("/manager/staff")({ component: StaffMgmt });

const schema = z.object({
  name: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone number"),
  role: z.enum(["Doctor", "Nurse", "Support Staff"]),
  department: z.string().min(2, "Department required"),
  employmentType: z.enum(["Full-time", "Part-time"]),
});

function StaffMgmt() {
  const { staff, setStaff } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);

  const filtered = staff.filter((s) =>
    (roleFilter === "all" || s.role === roleFilter) &&
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const remove = async (id: string) => {
    await staffService.remove(id);
    setStaff((arr) => arr.filter((s) => s.id !== id));
    toast.success("Staff member removed");
  };

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", role: "Nurse" as const, department: "General Ward", employmentType: "Full-time" as const },
  });

  const onAdd = handleSubmit(async (vals) => {
    const newMember: Staff = {
      id: `s${Date.now()}`,
      employeeId: `EMP-${1000 + staff.length + 1}`,
      name: vals.name, email: vals.email, phone: vals.phone,
      role: vals.role, department: vals.department,
      status: "Active", joinedOn: new Date().toISOString().slice(0, 10),
      employmentType: vals.employmentType, availableDays: ["Mon","Tue","Wed","Thu","Fri"],
      preferredShift: "morning", preferredDaysOff: ["Sat","Sun"], avatarColor: "#4F86C6",
    };
    await staffService.save(newMember);
    setStaff((arr) => [newMember, ...arr]);
    toast.success("Staff member added");
    reset(); setOpenAdd(false);
  });

  return (
    <div>
      <PageHeader
        title="Staff management"
        description="View, edit, and onboard the people who make your hospital run."
        actions={
          <Sheet open={openAdd} onOpenChange={setOpenAdd}>
            <SheetTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" />Add staff</Button></SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add a staff member</SheetTitle>
                <SheetDescription>This goes straight onto your roster.</SheetDescription>
              </SheetHeader>
              <form onSubmit={onAdd} className="mt-6 space-y-4 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...register("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <select {...register("role")} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option>Doctor</option><option>Nurse</option><option>Support Staff</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <select {...register("employmentType")} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option>Full-time</option><option>Part-time</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input {...register("department")} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save staff member"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Doctor">Doctors</SelectItem>
              <SelectItem value="Nurse">Nurses</SelectItem>
              <SelectItem value="Support Staff">Support staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No staff match your filters" description="Try clearing them to see the full team." actionLabel="Clear filters" onAction={() => { setSearch(""); setRoleFilter("all"); }} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead className="hidden md:table-cell">ID</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback style={{ backgroundColor: s.avatarColor, color: "#fff" }}>{s.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{s.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono-data text-xs">{s.employeeId}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{s.role}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{s.phone}</TableCell>
                    <TableCell><StatusBadge tone={statusToTone(s.status)} label={s.status} /></TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {s.name}?</AlertDialogTitle>
                            <AlertDialogDescription>They'll be removed from upcoming rosters. You can re-add them later.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
