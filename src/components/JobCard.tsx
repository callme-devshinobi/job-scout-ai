import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Building2, Sparkles } from "lucide-react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
  onClick: () => void;
  selected?: boolean;
}

const scoreColor = (score: number | null) => {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-success/15 text-success border border-success/30";
  if (score >= 60) return "bg-primary/15 text-primary border border-primary/30";
  if (score >= 40) return "bg-warning/15 text-warning border border-warning/30";
  return "bg-destructive/10 text-destructive border border-destructive/30";
};

const statusColor: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  saved: "bg-primary/15 text-primary",
  applied: "bg-success/15 text-success",
  interviewing: "bg-warning/15 text-warning",
  rejected: "bg-destructive/15 text-destructive",
};

export const JobCard = ({ job, onClick, selected }: Props) => {
  return (
    <Card
      onClick={onClick}
      className={`card-elevated p-4 cursor-pointer transition-all hover:border-primary/40 ${
        selected ? "border-primary/60 ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-md bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {job.company_logo ? (
            <img src={job.company_logo} alt={job.company} className="size-full object-cover" />
          ) : (
            <Building2 className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground leading-tight truncate">{job.title}</h3>
            {job.fit_score != null && (
              <span
                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md ${scoreColor(
                  job.fit_score
                )}`}
              >
                {job.fit_score}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {job.location}
              </span>
            )}
            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${statusColor[job.status] || ""}`}>
              {job.status}
            </Badge>
          </div>
          {job.fit_summary && (
            <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2 flex gap-1">
              <Sparkles className="size-3 shrink-0 mt-0.5 text-primary" />
              {job.fit_summary}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
