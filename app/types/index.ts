export interface TimeLogEntry {
  action: string;
  user: string;
  timestamp: string;
  note?: string;
}

export interface Ad {
  id: string;
  concept_name: string;
  angle: string;
  ad_format: string;
  product: string;
  assigned_editor: string;
  assigned_copywriter: string;
  brief_link: string;
  status: string;
  priority: string;
  ad_type: string;
  content_source: string;
  time_log: string;
  revision_count: number;
  live_date: string;
  stage_updated_at: string;
  ad_spend?: number;
  result?: string;
  notes?: string;
  review_link?: string;
  due_date?: string;
  killed_at?: string;
  time_tracking?: string;
  created_at: string;
  imprint_number?: number;
  destination_url?: string;
  whitelisting_page?: string;
}

export interface Notification {
  id: string;
  ad_id: string;
  message: string;
  target_user: string;
  is_read: boolean;
  created_at: string;
}

export interface IdeaEntry {
  id: string;
  description: string;
  submitted_by: string;
  type_tag: string;
  created_at: string;
  promoted: boolean;
}

export interface LearningEntry {
  id: string;
  ad_id: string | null;
  ad_name: string;
  ad_link: string;
  result: "Winner" | "Loser" | "Inconclusive";
  insight: string;
  logged_by: string;
  created_at: string;
  is_reviewed: boolean;
}

export interface NewLearningForm {
  ad_id: string;
  ad_name: string;
  ad_link: string;
  result: "Winner" | "Loser" | "Inconclusive";
  insight: string;
}

export interface NewAdForm {
  concept_name: string;
  angle: string;
  ad_format: string;
  product: string;
  ad_type: string;
  priority: string;
  content_source: string;
  assigned_editor: string;
  assigned_copywriter: string;
  brief_link: string;
  due_date?: string;
  destination_url?: string;
  whitelisting_page?: string;
}