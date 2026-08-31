export interface Translation {
  id: number;
  title: string;
  source_language: string;
  target_language: string;
  translator_name: string | null;
  category: string | null;
  notes: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
}
