export const STAGES = [
  "Idea", "Writing Brief", "Brief Revision Required", "Brief Approved",
  "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload",
  "Testing", "Completed", "Killed"
];

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  "Idea": ["Writing Brief", "Killed"],
  "Writing Brief": ["Brief Revision Required", "Brief Approved", "Killed"],
  "Brief Revision Required": ["Writing Brief", "Killed"],
  "Brief Approved": ["Editor Assigned", "Killed"],
"Editor Assigned": ["In Progress", "Killed"],
  "In Progress": ["Ad Revision", "Pending Upload", "Killed"],
  "Ad Revision": ["In Progress", "Pending Upload", "Killed"],
  "Pending Upload": ["Testing", "Killed"],
  "Testing": ["Completed", "Killed"],
  "Completed": [],
  "Killed": ["Idea"]
};

export const IDEA_TYPE_TAGS = ["Iteration", "Ideation", "Imitation", "Angle to Test"];

export const PRIORITY_ORDER: Record<string, number> = {
  "High": 0, "Medium": 1, "Low": 2
};

export const DEFAULT_NEW_AD = {
  concept_name: "", angle: "", ad_format: "Video Ad", product: "",
  ad_type: "Iteration", priority: "Medium", content_source: "Internal Team",
  assigned_editor: "", assigned_copywriter: "", brief_link: ""
};