// Generate a tailored cover letter + custom CV summary for a specific job.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { job_id, regenerate } = await req.json();

    if (!regenerate) {
      const { data: cached } = await supabase
        .from("cover_letters")
        .select("*")
        .eq("job_id", job_id)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const [{ data: profile }, { data: job }] = await Promise.all([
      supabase.from("profile").select("*").limit(1).maybeSingle(),
      supabase.from("jobs").select("*").eq("id", job_id).maybeSingle(),
    ]);

    if (!profile || !job) {
      return new Response(JSON.stringify({ error: "missing profile or job" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You write tailored, concise, human-sounding job applications. No fluff, no clichés like "I am writing to apply".`;
    const user = `Write a tailored cover letter (180-260 words) and a 3-line custom CV summary for this application.

CANDIDATE: ${profile.full_name || "Candidate"}
Portfolio: ${profile.portfolio_url || "n/a"}
LinkedIn: ${profile.linkedin_url || "n/a"}
GitHub: ${profile.github_url || "n/a"}

CV:
${(profile.cv_text || "").slice(0, 6000)}

JOB: ${job.title} at ${job.company}
${(job.description || "").slice(0, 3500)}

Tone: confident, specific, mention 2-3 concrete things from the candidate's background that map to job requirements. No bullet points in the letter.`;

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
            name: "write_application",
            parameters: {
              type: "object",
              properties: {
                cover_letter: { type: "string" },
                tailored_summary: { type: "string", description: "3 lines, suitable for top of CV" },
              },
              required: ["cover_letter", "tailored_summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "write_application" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (r.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (r.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Lovable workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);

    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(tc.function.arguments);

    const { data: saved } = await supabase
      .from("cover_letters")
      .upsert(
        { job_id, cover_letter: args.cover_letter, tailored_summary: args.tailored_summary },
        { onConflict: "job_id" }
      )
      .select()
      .single();

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
