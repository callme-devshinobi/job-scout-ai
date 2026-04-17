import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, Loader2 } from "lucide-react";
import { extractPdfText } from "@/lib/pdf";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile | null;
  onSaved: () => void;
}

export const ProfileSetup = ({ profile, onSaved }: Props) => {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    portfolio_url: profile?.portfolio_url || "",
    linkedin_url: profile?.linkedin_url || "",
    github_url: profile?.github_url || "",
    cv_text: profile?.cv_text || "",
    cv_pdf_url: profile?.cv_pdf_url || "",
    cv_file_name: profile?.cv_file_name || "",
    target_role: profile?.target_role || "Frontend Developer",
    target_keywords: (profile?.target_keywords || ["react", "typescript", "frontend"]).join(", "),
    exclude_keywords: (profile?.exclude_keywords || []).join(", "),
    min_fit_score: profile?.min_fit_score || 60,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const text = await extractPdfText(file);
      const path = `cv-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("cvs").getPublicUrl(path);
      setForm((f) => ({
        ...f,
        cv_text: text || f.cv_text,
        cv_pdf_url: publicUrl,
        cv_file_name: file.name,
      }));
      toast.success(`Extracted ${text.length} characters from PDF`);
    } catch (err: any) {
      toast.error(err.message || "Failed to read PDF");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (!form.cv_text.trim()) {
      toast.error("Please paste your CV");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      target_keywords: form.target_keywords.split(",").map((k) => k.trim()).filter(Boolean),
      exclude_keywords: form.exclude_keywords.split(",").map((k) => k.trim()).filter(Boolean),
      min_fit_score: Number(form.min_fit_score) || 60,
    };
    const { error } = profile
      ? await supabase.from("profile").update(payload).eq("id", profile.id)
      : await supabase.from("profile").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    onSaved();
  };

  return (
    <Card className="card-elevated p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-1">Your profile</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Used to match jobs and write tailored cover letters.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label>Portfolio URL</Label>
          <Input
            value={form.portfolio_url}
            onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
            placeholder="https://"
          />
        </div>
        <div>
          <Label>LinkedIn URL</Label>
          <Input
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div>
          <Label>GitHub URL</Label>
          <Input
            value={form.github_url}
            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
            placeholder="https://github.com/..."
          />
        </div>
        <div>
          <Label>Target role</Label>
          <Input
            value={form.target_role}
            onChange={(e) => setForm({ ...form, target_role: e.target.value })}
          />
        </div>
        <div>
          <Label>Must-have keywords (comma separated)</Label>
          <Input
            value={form.target_keywords}
            onChange={(e) => setForm({ ...form, target_keywords: e.target.value })}
            placeholder="react, typescript, nextjs"
          />
        </div>
        <div>
          <Label>Exclude keywords</Label>
          <Input
            value={form.exclude_keywords}
            onChange={(e) => setForm({ ...form, exclude_keywords: e.target.value })}
            placeholder="php, wordpress"
          />
        </div>
        <div>
          <Label>Minimum fit score (0-100)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.min_fit_score}
            onChange={(e) => setForm({ ...form, min_fit_score: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label>CV / Resume (paste full text)</Label>
        <Textarea
          rows={10}
          value={form.cv_text}
          onChange={(e) => setForm({ ...form, cv_text: e.target.value })}
          placeholder="Paste the plain text content of your CV here…"
          className="font-mono text-xs"
        />
      </div>

      <Button onClick={save} disabled={saving} className="mt-6 w-full sm:w-auto">
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </Card>
  );
};
