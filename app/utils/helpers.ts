export function getDaysLeftInTesting(liveDate: string): number {
  if (!liveDate) return 0;
  const start = new Date(liveDate).getTime();
  const now = new Date().getTime();
  const daysPassed = Math.floor((now - start) / (1000 * 3600 * 24));
  return Math.max(0, 10 - daysPassed);
}

export function getCardColor(status: string): string {
  if (status.includes("Revision") || status === "Killed") return "bg-rose-50 border-rose-200";
  if (["Idea", "In Progress", "Testing", "Preparing Content"].includes(status)) return "bg-amber-50 border-amber-200";
  if (["Winner", "Brief Approved", "Content Ready", "Pending Upload"].includes(status)) return "bg-emerald-50 border-emerald-200";
  return "bg-white border-slate-200";
}

export function getPriorityBadge(prio: string): string {
  if (prio === "High") return "bg-rose-500 text-white";
  if (prio === "Medium") return "bg-amber-400 text-slate-900";
  return "bg-slate-200 text-slate-600";
}

export function getIdeaTypeStyle(tag: string): string {
  if (tag === "New Concept") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (tag === "Iteration") return "bg-violet-100 text-violet-700 border-violet-200";
  if (tag === "Angle to Test") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500";
}

export function getLearningResultStyle(result: string) {
  if (result === "Winner") return { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", icon: "🏆" };
  if (result === "Loser") return { badge: "bg-rose-100 text-rose-700 border-rose-200", bar: "bg-rose-400", icon: "📉" };
  return { badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-slate-400", icon: "🔍" };
}