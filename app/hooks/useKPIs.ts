import { useMemo } from "react";
import { Ad, TimeLogEntry } from "../types";

export function useKPIs(ads: Ad[]) {
  return useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const adsCreatedThisWeek = ads.filter(ad => new Date(ad.created_at) >= oneWeekAgo);

    const volWk = adsCreatedThisWeek.length;

    const WinnerWithResult = ads.filter(ad => ad.status === "Winner" && ad.result);
    const winners = WinnerWithResult.filter(ad => ad.result === "Winner").length;
    const hitRate = WinnerWithResult.length > 0
      ? Math.round((winners / WinnerWithResult.length) * 100)
      : 0;

    const WinnerAds = ads.filter(ad => ad.status === "Winner");
    const avgRevs = WinnerAds.length > 0
      ? (WinnerAds.reduce((sum, ad) => sum + (ad.revision_count || 0), 0) / WinnerAds.length).toFixed(1)
      : "0.0";

    const inTesting = ads.filter(ad => ad.status === "Testing").length;

    const newAds = adsCreatedThisWeek.filter(a => a.ad_type === "New Concept").length;
    const iterAds = adsCreatedThisWeek.filter(a => a.ad_type === "Iteration").length;
    const conceptsVsIterations = `${newAds} / ${iterAds}`;

    const formats = adsCreatedThisWeek.reduce((acc: Record<string, number>, ad) => {
      acc[ad.ad_format] = (acc[ad.ad_format] || 0) + 1;
      return acc;
    }, {});
    const creativeDiversity = `${formats["Video Ad"] || 0}V | ${formats["Static Ad"] || 0}S | ${formats["Native Ad"] || 0}N`;

    const weeklyChartData = [3, 2, 1, 0].map(w => {
      const start = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      return {
        label: w === 0 ? "This Week" : `${w}w ago`,
        count: ads.filter(ad => {
          const logs: TimeLogEntry[] = JSON.parse(ad.time_log || "[]");
          return logs.some(l =>
            l.action.includes("Pending Upload") &&
            new Date(l.timestamp) >= start &&
            new Date(l.timestamp) < end
          );
        }).length
      };
    });

    const teamOutput: Record<string, { strategist: number; editor: number }> = {};
    adsCreatedThisWeek.forEach(ad => {
      if (ad.assigned_copywriter) {
        if (!teamOutput[ad.assigned_copywriter]) teamOutput[ad.assigned_copywriter] = { strategist: 0, editor: 0 };
        teamOutput[ad.assigned_copywriter].strategist++;
      }
      if (ad.assigned_editor) {
        if (!teamOutput[ad.assigned_editor]) teamOutput[ad.assigned_editor] = { strategist: 0, editor: 0 };
        teamOutput[ad.assigned_editor].editor++;
      }
    });

    let totalIdeaToUpload = 0, countIdeaToUpload = 0;
    let totalUploadToTesting = 0, countUploadToTesting = 0;

    ads.forEach(ad => {
      const logs: TimeLogEntry[] = JSON.parse(ad.time_log || "[]");
      const ideaTime = new Date(ad.created_at).getTime();
      const uploadLog = logs.find(l => l.action.includes("Pending Upload"));
      const testingLog = logs.find(l => l.action.includes("Testing"));
      if (uploadLog) {
        totalIdeaToUpload += new Date(uploadLog.timestamp).getTime() - ideaTime;
        countIdeaToUpload++;
        if (testingLog) {
          totalUploadToTesting += new Date(testingLog.timestamp).getTime() - new Date(uploadLog.timestamp).getTime();
          countUploadToTesting++;
        }
      }
    });

    const avgDaysToUpload = countIdeaToUpload > 0
      ? (totalIdeaToUpload / (countIdeaToUpload * 24 * 60 * 60 * 1000)).toFixed(1)
      : "0";
    const avgDaysToTesting = countUploadToTesting > 0
      ? (totalUploadToTesting / (countUploadToTesting * 24 * 60 * 60 * 1000)).toFixed(1)
      : "0";

    const spendByPerson: Record<string, number> = {};
    ads.forEach(ad => {
      const spend = Number(ad.ad_spend || 0);
      if (spend > 0) {
        if (ad.assigned_editor) spendByPerson[ad.assigned_editor] = (spendByPerson[ad.assigned_editor] || 0) + spend;
        if (ad.assigned_copywriter) spendByPerson[ad.assigned_copywriter] = (spendByPerson[ad.assigned_copywriter] || 0) + spend;
      }
    });
    const rankedSpend = Object.entries(spendByPerson).sort((a, b) => b[1] - a[1]);

    return {
      volWk, hitRate, avgRevs, inTesting,
      conceptsVsIterations, avgDaysToUpload, creativeDiversity, rankedSpend,
      weeklyChartData,
      teamOutput: Object.entries(teamOutput),
      pipelineVelocityData: { upload: avgDaysToUpload, testing: avgDaysToTesting }
    };
  }, [ads]);
}