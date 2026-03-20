import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7);

    // Fetch all ads
    const { data: ads, error } = await supabase.from("ads").select("*");
    if (error || !ads) {
      return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
    }

    // Last week's new ads
    const lastWeekAds = ads.filter(ad => new Date(ad.created_at) >= lastMonday);
    const totalProduced = lastWeekAds.length;

    // Current pipeline stats
    const inTesting = ads.filter(a => a.status === "Testing").length;
    const pendingUpload = ads.filter(a => a.status === "Pending Upload").length;

    // Hit rate
    const completed = ads.filter(a => a.status === "Completed");
    const winners = completed.filter(a => a.result === "Winner").length;
    const hitRate = completed.length > 0
      ? Math.round((winners / completed.length) * 100)
      : 0;

    // Overdue ads
    const overdueAds = ads.filter(ad => {
      if (!ad.due_date) return false;
      if (["Completed", "Killed"].includes(ad.status)) return false;
      return new Date(ad.due_date) < now;
    });

    // Build summary message
    const message = [
      `📊 Weekly Summary`,
      `• ${totalProduced} new ads created last week`,
      `• ${inTesting} currently in Testing`,
      `• ${pendingUpload} pending upload`,
      `• Hit Rate: ${hitRate}%`,
      `• ${overdueAds.length} overdue ads`,
    ].join(" | ");

    // Find Founder
    const { data: founders } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("role", "Founder")
      .eq("is_active", true)
      .limit(1);

    const founderName = founders?.[0]?.full_name;
    if (!founderName) {
      return NextResponse.json({ error: "No founder found" }, { status: 404 });
    }

    // Insert notification
    const { error: notifError } = await supabase.from("notifications").insert([{
      ad_id: null,
      message,
      target_user: founderName,
      is_read: false
    }]);

    if (notifError) {
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}