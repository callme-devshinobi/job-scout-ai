export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  cv_text: string | null;
  target_role: string | null;
  target_keywords: string[] | null;
  exclude_keywords: string[] | null;
  min_fit_score: number | null;
}

export interface Job {
  id: string;
  source: string;
  source_id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  url: string;
  description: string | null;
  tags: string[] | null;
  posted_at: string | null;
  fit_score: number | null;
  fit_summary: string | null;
  fit_strengths: string[] | null;
  fit_gaps: string[] | null;
  status: "new" | "saved" | "applied" | "interviewing" | "rejected" | "hidden";
  created_at: string;
}

export interface FetchRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  jobs_new: number;
  jobs_scored: number;
  status: string;
}
