import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const task = searchParams.get("task");

    // ── DAILY CLEANUP — delete killed ads older than 30 days ──
    if (task === "cleanup") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: toDelete, error: fetchError } = await supabase
        .from("ads")
        .select("id, concept_name")
        .eq("status", "Killed")
        .not("killed_at", "is", null)
        .lt("killed_at", thirtyDaysAgo);

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      if (toDelete && toDelete.length > 0) {
        const ids = toDelete.map((a: any) => a.id);
        const { error: deleteError } = await supabase
          .from("ads")
          .delete()
          .in("id", ids);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Notify founder of cleanup
        const { data: founders } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("role", "Founder")
          .eq("is_active", true)
          .limit(1);

        const founderName = founders?.[0]?.full_name;
        if (founderName) {
          await supabase.from("notifications").insert([{
            ad_id: null,
            message: `🗑️ ${toDelete.length} killed ad${toDelete.length > 1 ? "s" : ""} permanently deleted after 30 days: ${toDelete.map((a: any) => a.concept_name).join(", ")}`,
            target_user: founderName,
            is_read: false
          }]);
        }
      }

      return NextResponse.json({
        success: true,
        deleted: toDelete?.length || 0
      });
    }

    // ── WEEKLY SUMMARY (Monday 8AM) ──
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7);

    const { data: ads, error } = await supabase.from("ads").select("*");
    if (error || !ads) {
      return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
    }

    const lastWeekAds = ads.filter(ad => new Date(ad.created_at) >= lastMonday);
    const totalProduced = lastWeekAds.length;
    const inTesting = ads.filter(a => a.status === "Testing").length;
    const pendingUpload = ads.filter(a => a.status === "Pending Upload").length;

    const completed = ads.filter(a => a.status === "Completed");
    const winners = completed.filter(a => a.result === "Winner").length;
    const hitRate = completed.length > 0
      ? Math.round((winners / completed.length) * 100)
      : 0;

    const overdueAds = ads.filter(ad => {
      if (!ad.due_date) return false;
      if (["Completed", "Killed"].includes(ad.status)) return false;
      return new Date(ad.due_date) < now;
    });

    const message = [
      `📊 Weekly Summary`,
      `• ${totalProduced} new ads created last week`,
      `• ${inTesting} currently in Testing`,
      `• ${pendingUpload} pending upload`,
      `• Hit Rate: ${hitRate}%`,
      `• ${overdueAds.length} overdue ads`,
    ].join(" | ");

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