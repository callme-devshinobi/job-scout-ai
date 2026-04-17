// Score new jobs against the user's profile/CV using Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function scoreOne(profile: any, job: any): Promise<any | null> {
  const sys = `You are a strict technical recruiter scoring how well a candidate fits a job. Return JSON only via the tool.`;
  const user = `CANDIDATE PROFILE:
Target role: ${profile.target_role}
Keywords they want: ${(profile.target_keywords || []).join(", ")}
Keywords to avoid: ${(profile.exclude_keywords || []).join(", ") || "(none)"}

CV:
${(profile.cv_text || "").slice(0, 6000)}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Tags: ${(job.tags || []).join(", ")}
Description:
${(job.description || "").slice(0, 4000)}

Score fit 0-100. Be honest — junior role for senior, or wrong stack = low score.`;

  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "score_fit",
          description: "Return fit assessment",
          parameters: {
            type: "object",
            properties: {
              fit_score: { type: "integer", minimum: 0, maximum: 100 },
              fit_summary: { type: "string", description: "1-2 sentences" },
              strengths: { type: "array", items: { type: "string" }, description: "3-5 matches" },
              gaps: { type: "array", items: { type: "string" }, description: "0-4 missing requirements" },
            },
            required: ["fit_score", "fit_summary", "strengths", "gaps"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "score_fit" } },
  };

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    console.error("AI error", r.status, await r.text());
    return null;
  }
  const data = await r.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return null;
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { job_ids, run_id } = await req.json();

  const { data: profile } = await supabase.from("profile").select("*").limit(1).maybeSingle();
  if (!profile) {
    return new Response(JSON.stringify({ error: "no profile" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let ids = job_ids as string[] | undefined;
  if (!ids || ids.length === 0) {
    const { data } = await supabase.from("jobs").select("id").is("fit_score", null).limit(50);
    ids = (data || []).map((d: any) => d.id);
  }

  let scored = 0;
  for (const id of ids) {
    const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (!job) continue;
    const result = await scoreOne(profile, job);
    if (!result) continue;
    await supabase
      .from("jobs")
      .update({
        fit_score: result.fit_score,
        fit_summary: result.fit_summary,
        fit_strengths: result.strengths,
        fit_gaps: result.gaps,
      })
      .eq("id", id);
    scored++;
    // tiny delay to be nice to rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  if (run_id) {
    await supabase
      .from("fetch_runs")
      .update({ jobs_scored: scored, status: "complete" })
      .eq("id", run_id);
  }

  return new Response(JSON.stringify({ scored }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
