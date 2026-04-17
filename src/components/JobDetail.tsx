import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, ExternalLink, RefreshCw, Wand2, Check, X } from "lucide-react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const STATUS_OPTIONS = ["new", "saved", "applied", "interviewing", "rejected"] as const;

export const JobDetail = ({ job, open, onOpenChange, onUpdate }: Props) => {
  const [letter, setLetter] = useState<{ cover_letter: string; tailored_summary: string } | null>(null);
  const [loadingLetter, setLoadingLetter] = useState(false);

  useEffect(() => {
    setLetter(null);
  }, [job?.id]);

  if (!job) return null;

  const generate = async (regenerate = false) => {
    setLoadingLetter(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: { job_id: job.id, regenerate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLetter(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally {
      setLoadingLetter(false);
    }
  };

  const setStatus = async (status: string) => {
    await supabase.from("jobs").update({ status }).eq("id", job.id);
    toast.success(`Marked as ${status}`);
    onUpdate();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background border-border">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl pr-8">{job.title}</SheetTitle>
          <div className="text-muted-foreground">
            {job.company} · {job.location} {job.salary && `· ${job.salary}`}
          </div>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button asChild variant="default" size="sm">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> Open & apply
            </a>
          </Button>
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={job.status === s ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {job.fit_score != null && (
          <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl font-bold gradient-text">{job.fit_score}</div>
              <div className="text-sm text-muted-foreground flex-1">{job.fit_summary}</div>
            </div>
            {job.fit_strengths && job.fit_strengths.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1">
                  <Check className="size-3" /> Strengths
                </div>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {job.fit_strengths.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {job.fit_gaps && job.fit_gaps.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-warning mb-1.5 flex items-center gap-1">
                  <X className="size-3" /> Gaps
                </div>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {job.fit_gaps.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="apply" className="mt-6">
          <TabsList>
            <TabsTrigger value="apply">Application</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
          </TabsList>

          <TabsContent value="apply" className="space-y-4 mt-4">
            {!letter && !loadingLetter && (
              <Button onClick={() => generate(false)} className="w-full">
                <Wand2 className="size-4" /> Generate tailored cover letter
              </Button>
            )}
            {loadingLetter && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            )}
            {letter && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Tailored CV summary</h4>
                    <Button size="sm" variant="ghost" onClick={() => copy(letter.tailored_summary, "Summary")}>
                      <Copy className="size-3" />
                    </Button>
                  </div>
                  <div className="p-3 rounded-md bg-secondary/40 text-sm whitespace-pre-wrap">
                    {letter.tailored_summary}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Cover letter</h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => generate(true)} disabled={loadingLetter}>
                        <RefreshCw className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(letter.cover_letter, "Cover letter")}>
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-secondary/40 text-sm whitespace-pre-wrap leading-relaxed">
                    {letter.cover_letter}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="description" className="mt-4">
            <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {job.description || "No description."}
            </div>
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {job.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
