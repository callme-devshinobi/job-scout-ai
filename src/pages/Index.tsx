import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Briefcase, Settings, Sparkles, TrendingUp } from "lucide-react";
import { ProfileSetup } from "@/components/ProfileSetup";
import { JobCard } from "@/components/JobCard";
import { JobDetail } from "@/components/JobDetail";
import type { Profile, Job, FetchRun } from "@/lib/types";

const Index = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastRun, setLastRun] = useState<FetchRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState("jobs");
  const [filter, setFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadAll = async () => {
    const [{ data: p }, { data: j }, { data: r }] = await Promise.all([
      supabase.from("profile").select("*").limit(1).maybeSingle(),
      supabase.from("jobs").select("*").order("fit_score", { ascending: false, nullsFirst: false }).limit(200),
      supabase.from("fetch_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(p as Profile | null);
    setJobs((j as Job[]) || []);
    setLastRun(r as FetchRun | null);
    if (!p) setTab("profile");
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("jobs-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "fetch_runs" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const runScan = async () => {
    if (!profile) {
      toast.error("Add your profile first");
      setTab("profile");
      return;
    }
    setScanning(true);
    toast.info("Scanning Remotive + RemoteOK…");
    try {
      const { data, error } = await supabase.functions.invoke("fetch-jobs", { body: {} });
      if (error) throw error;
      toast.success(`Found ${data?.found || 0} jobs · ${data?.new || 0} new — scoring with AI…`);
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const stats = useMemo(() => {
    const minScore = profile?.min_fit_score ?? 60;
    return {
      total: jobs.length,
      matched: jobs.filter((j) => (j.fit_score || 0) >= minScore).length,
      applied: jobs.filter((j) => j.status === "applied").length,
      saved: jobs.filter((j) => j.status === "saved").length,
    };
  }, [jobs, profile]);

  const filteredJobs = useMemo(() => {
    const minScore = profile?.min_fit_score ?? 0;
    let list = jobs;
    if (filter === "matched") list = list.filter((j) => (j.fit_score || 0) >= minScore);
    else if (filter === "saved") list = list.filter((j) => j.status === "saved");
    else if (filter === "applied") list = list.filter((j) => j.status === "applied");
    else if (filter === "new") list = list.filter((j) => j.status === "new");
    return list;
  }, [jobs, filter, profile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">JobScout</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                AI frontend job assistant
              </p>
            </div>
          </div>
          <Button onClick={runScan} disabled={scanning} size="sm">
            <RefreshCw className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Scan now"}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon={<Briefcase className="size-4" />} />
          <StatCard
            label="Good fit"
            value={stats.matched}
            icon={<TrendingUp className="size-4 text-success" />}
            highlight
          />
          <StatCard label="Saved" value={stats.saved} />
          <StatCard label="Applied" value={stats.applied} />
        </div>

        {lastRun && (
          <div className="text-xs text-muted-foreground mb-4">
            Last scan: {new Date(lastRun.started_at).toLocaleString()} ·{" "}
            {lastRun.jobs_new} new · {lastRun.jobs_scored} scored · status:{" "}
            <span className="text-foreground">{lastRun.status}</span>
            {" · auto-runs daily at 7:00 UTC"}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="jobs">
              <Briefcase className="size-3.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="size-3.5" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {["all", "matched", "new", "saved", "applied"].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "secondary"}
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card className="card-elevated p-12 text-center">
                <Sparkles className="size-8 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No jobs yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {profile
                    ? "Hit \"Scan now\" to find frontend roles."
                    : "Set up your profile first, then scan."}
                </p>
                {profile && (
                  <Button onClick={runScan} disabled={scanning}>
                    <RefreshCw className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                    Scan now
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    selected={selectedJob?.id === job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <ProfileSetup profile={profile} onSaved={loadAll} />
          </TabsContent>
        </Tabs>
      </main>

      <JobDetail
        job={selectedJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={loadAll}
      />
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  highlight?: boolean;
}) => (
  <Card className={`card-elevated p-4 ${highlight ? "border-success/30" : ""}`}>
    <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
      <span>{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </Card>
);

export default Index;
