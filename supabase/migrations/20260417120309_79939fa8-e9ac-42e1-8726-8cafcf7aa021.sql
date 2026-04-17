
-- profile (single row)
CREATE TABLE public.profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  cv_text TEXT,
  target_role TEXT DEFAULT 'Frontend Developer',
  target_keywords TEXT[] DEFAULT ARRAY['react','typescript','frontend'],
  exclude_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  min_fit_score INT DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT,
  salary TEXT,
  job_type TEXT,
  url TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  posted_at TIMESTAMPTZ,
  fit_score INT,
  fit_summary TEXT,
  fit_strengths TEXT[],
  fit_gaps TEXT[],
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, source_id)
);

CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_fit_score ON public.jobs(fit_score DESC);
CREATE INDEX idx_jobs_posted_at ON public.jobs(posted_at DESC);

-- cover letters cache
CREATE TABLE public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  tailored_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- fetch runs log
CREATE TABLE public.fetch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  jobs_found INT DEFAULT 0,
  jobs_new INT DEFAULT 0,
  jobs_scored INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT
);

-- Enable RLS but allow anon access (single-user no-auth app)
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fetch_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.cover_letters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.fetch_runs FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profile_touch BEFORE UPDATE ON public.profile FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Schedule daily fetch via pg_cron (will call edge function)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
