import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { faqs, guides } from "@/data/mock";
import { BookOpen, Send } from "lucide-react";
import { toast } from "sonner";
import { supportService } from "@/services";

export const Route = createFileRoute("/manager/help")({ component: HelpPage });

const schema = z.object({
  subject: z.string().min(2, "Add a subject"),
  message: z.string().min(10, "Tell us a little more"),
});

export function HelpPage() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (data) => {
    await supportService.submit(data);
    toast.success("Message sent — we'll reply soon.");
    reset();
  });

  return (
    <div>
      <PageHeader title="Help & support" description="Browse guides or reach out — we're here." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Frequently asked</h3>
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`}><AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </CardContent></Card>

        <Card className="rounded-2xl"><CardContent className="p-6">
          <h3 className="mb-3 font-display text-base font-semibold">User guide</h3>
          <ul className="space-y-2">
            {guides.map((g, i) => (
              <li key={i}><a href="#" className="flex items-start gap-2 rounded-xl p-2 text-sm hover:bg-muted">
                <BookOpen className="mt-0.5 h-4 w-4 text-primary" />
                <div><p className="font-medium">{g.title}</p><p className="text-xs text-muted-foreground">{g.duration}</p></div>
              </a></li>
            ))}
          </ul>
        </CardContent></Card>

        <Card className="rounded-2xl"><CardContent className="p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Contact support</h3>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5"><Label>Subject</Label><Input {...register("subject")} />{errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}</div>
            <div className="space-y-1.5"><Label>Message</Label><Textarea rows={5} {...register("message")} />{errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}</div>
            <Button type="submit" className="w-full"><Send className="mr-1 h-4 w-4" />Send message</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  );
}
