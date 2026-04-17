// Fetch frontend remote jobs from Remotive + RemoteOK, dedupe, store, then trigger scoring.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Job {
  source: string;
  source_id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string | null;
  salary?: string | null;
  job_type?: string | null;
  url: string;
  description?: string | null;
  tags?: string[];
  posted_at?: string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchRemotive(): Promise<Job[]> {
  const out: Job[] = [];
  for (const cat of ["software-dev"]) {
    try {
      const r = await fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=100`);
      const data = await r.json();
      for (const j of data.jobs || []) {
        const title = (j.title || "").toLowerCase();
        if (!/(front[\s-]?end|react|vue|angular|web developer|ui engineer|fullstack|full[\s-]?stack)/i.test(title)) continue;
        out.push({
          source: "remotive",
          source_id: String(j.id),
          title: j.title,
          company: j.company_name,
          company_logo: j.company_logo || null,
          location: j.candidate_required_location || "Remote",
          salary: j.salary || null,
          job_type: j.job_type || null,
          url: j.url,
          description: stripHtml(j.description || "").slice(0, 4000),
          tags: j.tags || [],
          posted_at: j.publication_date || null,
        });
      }
    } catch (e) {
      console.error("remotive error", e);
    }
  }
  return out;
}

async function fetchRemoteOK(): Promise<Job[]> {
  const out: Job[] = [];
  try {
    const r = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "Mozilla/5.0 (jobs-assistant)" },
    });
    const data = await r.json();
    for (const j of data.slice(1)) {
      const title = (j.position || "").toLowerCase();
      if (!/(front[\s-]?end|react|vue|angular|web developer|ui engineer|fullstack|full[\s-]?stack)/i.test(title)) continue;
      out.push({
        source: "remoteok",
        source_id: String(j.id),
        title: j.position,
        company: j.company,
        company_logo: j.company_logo || j.logo || null,
        location: j.location || "Remote",
        salary: j.salary_min ? `$${j.salary_min}-${j.salary_max}` : null,
        job_type: null,
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        description: stripHtml(j.description || "").slice(0, 4000),
        tags: j.tags || [],
        posted_at: j.date || null,
      });
    }
  } catch (e) {
    console.error("remoteok error", e);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: run } = await supabase
    .from("fetch_runs")
    .insert({ status: "running" })
    .select()
    .single();

  try {
    const [remotive, remoteok] = await Promise.all([fetchRemotive(), fetchRemoteOK()]);
    const all = [...remotive, ...remoteok];

    let inserted = 0;
    const newJobIds: string[] = [];
    for (const j of all) {
      const { data, error } = await supabase
        .from("jobs")
        .upsert(j, { onConflict: "source,source_id", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();
      if (!error && data) {
        inserted++;
        newJobIds.push(data.id);
      }
    }

    await supabase
      .from("fetch_runs")
      .update({
        finished_at: new Date().toISOString(),
        jobs_found: all.length,
        jobs_new: inserted,
        status: "scoring",
      })
      .eq("id", run!.id);

    // Trigger scoring (fire and forget)
    if (newJobIds.length > 0) {
      fetch(`${SUPABASE_URL}/functions/v1/score-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ job_ids: newJobIds, run_id: run!.id }),
      }).catch((e) => console.error("trigger score error", e));
    } else {
      await supabase.from("fetch_runs").update({ status: "complete" }).eq("id", run!.id);
    }

    return new Response(
      JSON.stringify({ found: all.length, new: inserted, run_id: run!.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("fetch_runs")
      .update({ status: "error", error: msg, finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
