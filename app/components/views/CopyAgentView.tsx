"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  currentUser: string;
  currentRole: string;
  supabase: any;
}

interface GeneratedCopy {
  hooks: string[];
  copies: string[];
  body: string;
}

function CopyCard({ label, content, color }: { label: string; content: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`bg-white border ${color} rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] font-black uppercase tracking-widest ${color.replace("border-", "text-").replace("-200", "-600")}`}>{label}</span>
        <button onClick={handleCopy} className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all ${copied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-gray-800 font-medium leading-relaxed">{content}</p>
    </div>
  );
}

function HistorySection({ supabase, currentUser, currentRole, refreshKey }: { supabase: any; currentUser: string; currentRole: string; refreshKey: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isFounder = currentRole === "Founder";

  useEffect(() => {
    setLoading(true);
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("copy_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [supabase, refreshKey]);

  if (loading) return (
    <div className="mt-10">
      <div className="h-6 w-40 bg-gray-100 rounded-xl animate-pulse mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-gray-800 text-lg">Generation History</h3>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-full">{history.length} entries</span>
      </div>
      {history.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">📭</span>
          <p className="font-black text-gray-600">No history yet</p>
          <p className="text-sm text-gray-400 mt-1">Generated copy will appear here after you save</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-3">
                  {item.input_type === "image" && item.input_preview ? (
                    <img src={item.input_preview} alt="Creative" className="w-12 h-12 object-cover rounded-xl border border-gray-200 shrink-0" />
                  ) : item.input_type === "url" && item.input_preview ? (
                    <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center shrink-0 overflow-hidden">
                      {item.input_preview.includes("youtube.com") || item.input_preview.includes("youtu.be") ? (
                        <img
                          src={`https://img.youtube.com/vi/${item.input_preview.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]}/mqdefault.jpg`}
                          alt="YouTube thumbnail"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <span className="text-lg">🔗</span>
                          <span className="text-[8px] font-black text-gray-400 uppercase">URL</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                      <span className="text-xl">✍️</span>
                    </div>
                  )}
                  <div>
                    <p className="font-black text-gray-800 text-sm">{item.ad_name || "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.input_type && (
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          item.input_type === "image" ? "bg-blue-50 text-blue-600" :
                          item.input_type === "url" ? "bg-purple-50 text-purple-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {item.input_type === "image" ? "🖼 Image" : item.input_type === "url" ? "🔗 URL" : "📝 Describe"}
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">
                        by {item.generated_by} · {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {item.input_type === "describe" && item.input_preview && (
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate max-w-[200px]">{item.input_preview}</p>
                    )}
                    {item.input_type === "url" && item.input_preview && (
                      <a href={item.input_preview} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black text-green-700 hover:text-green-800 truncate max-w-[200px] block">
                        {item.input_preview.length > 40 ? item.input_preview.slice(0, 40) + "..." : item.input_preview} ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200">3:3:1</span>
                  <span className="text-gray-400 text-xs">{expanded === item.id ? "▲" : "▼"}</span>
                </div>
              </div>
              {expanded === item.id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {item.control_copy && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Control Copy</p>
                      <p className="text-sm text-gray-600 font-medium">{item.control_copy}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">🪝 Hooks</p>
                    <div className="space-y-2">
                      {(item.hooks || []).map((hook: string, i: number) => (
                        <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-800 font-medium flex-1">{hook}</p>
                          <button onClick={() => navigator.clipboard.writeText(hook)} className="text-[9px] font-black text-gray-400 hover:text-green-700 uppercase shrink-0">Copy</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">📝 Ad Copies</p>
                    <div className="space-y-2">
                      {(item.copies || []).map((copy: string, i: number) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-800 font-medium flex-1">{copy}</p>
                          <button onClick={() => navigator.clipboard.writeText(copy)} className="text-[9px] font-black text-gray-400 hover:text-amber-600 uppercase shrink-0">Copy</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">📄 Body Copy</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 font-medium flex-1">{item.body}</p>
                      <button onClick={() => navigator.clipboard.writeText(item.body)} className="text-[9px] font-black text-gray-400 hover:text-blue-600 uppercase shrink-0">Copy</button>
                    </div>
                  </div>
                  {isFounder && (
                    <button
                      onClick={async () => {
                        await supabase.from("copy_history").delete().eq("id", item.id);
                        setHistory(h => h.filter(x => x.id !== item.id));
                      }}
                      className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest"
                    >
                      Delete Entry
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CopyAgentView({ ads, currentUser, currentRole, supabase }: Props) {
  const [selectedAdId, setSelectedAdId] = useState("");
  const [conceptDesc, setConceptDesc] = useState("");
  const [product, setProduct] = useState("");
  const [format, setFormat] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [controlCopy, setControlCopy] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedCopy | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const [inputTab, setInputTab] = useState<"describe" | "url" | "image">("describe");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeAds = useMemo(() =>
    ads.filter(a => !["Winner", "Killed"].includes(a.status))
      .sort((a, b) => a.concept_name.localeCompare(b.concept_name)),
    [ads]
  );

  const selectedAd = useMemo(() =>
    ads.find(a => a.id === selectedAdId),
    [ads, selectedAdId]
  );

  const handleAdSelect = (adId: string) => {
    setSelectedAdId(adId);
    setResult(null);
    setSaved(false);
    const ad = ads.find(a => a.id === adId);
    if (ad) {
      setConceptDesc(ad.concept_name || "");
      setProduct(ad.product || "");
      setFormat(ad.ad_format || "");
      if (ad.review_link) {
        setInputTab("url");
        setCreativeUrl(ad.review_link);
      }
    }
  };

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  }, []);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const processImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError("Image too large — max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setImagePreview(res);
      setImageBase64(res.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (inputTab === "describe" && !conceptDesc.trim()) { setError("Please describe the concept first."); return; }
    if (inputTab === "url" && !creativeUrl.trim()) { setError("Please paste a URL."); return; }
    if (inputTab === "image" && !imageBase64) { setError("Please upload an image."); return; }
    setError("");
    setIsGenerating(true);
    setResult(null);
    setSaved(false);

    try {
      const contextInfo = `Product: ${product || "Not specified"}
Ad Format: ${format || "Not specified"}
Target Audience: ${targetAudience || "Not specified"}
${controlCopy ? `Control Copy (write challengers to beat this): ${controlCopy}` : ""}`;

      const systemPrompt = `You are a senior Meta ads copywriter specializing in direct-response advertising.
Generate challenger ad copy in the 3:3:1 structure.
Output ONLY valid JSON, no markdown, no preamble:
{"hooks":["h1","h2","h3"],"copies":["c1","c2","c3"],"body":"b"}
hooks: 3 scroll-stopping opening lines (5-12 words each). Use different angles: curiosity, urgency, social proof.
copies: 3 primary ad copy variants (2-3 sentences each). Angle 1: problem-focused. Angle 2: transformation/aspiration. Angle 3: proof/credibility.
body: 1 detailed body copy (4-5 sentences) with a strong CTA. This is the definitive challenger version.`;

      let messages: any[] = [];

      if (inputTab === "image" && imageBase64) {
        const mediaType = imageBase64.charAt(0) === "/" ? "image/jpeg" : "image/png";
        messages = [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: `Analyze this ad creative and generate 3:3:1 challenger copy.\n${contextInfo}\nConcept context: ${conceptDesc || "Based on the image"}` }
          ]
        }];
      } else if (inputTab === "url") {
        messages = [{
          role: "user",
          content: `Analyze this ad creative URL and generate 3:3:1 challenger copy.\nURL: ${creativeUrl}\n${contextInfo}\nConcept context: ${conceptDesc || "Based on the URL"}`
        }];
      } else {
        messages = [{
          role: "user",
          content: `Generate 3:3:1 challenger ad copy for this concept:\n\nConcept: ${conceptDesc}\n${contextInfo}`
        }];
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: systemPrompt,
          messages,
        }),
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No valid JSON in response");
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (err: any) {
      setError("Failed to generate copy. Try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    try {
      const copyData = {
        hooks: result.hooks,
        copies: result.copies,
        body: result.body,
        generated_by: currentUser,
        generated_at: new Date().toISOString(),
        control_copy: controlCopy || null,
      };

      // Save to ad itself
      if (selectedAdId) {
        await supabase.from("ads").update({ generated_copy: copyData }).eq("id", selectedAdId);
      }

      // Build preview
      let inputPreview: string | null = null;
      if (inputTab === "url" && creativeUrl.trim()) {
        inputPreview = creativeUrl.trim();
      } else if (inputTab === "image" && imagePreview) {
        inputPreview = imagePreview;
      } else if (inputTab === "describe" && conceptDesc.trim()) {
        inputPreview = conceptDesc.trim();
      }

      // Save to history
      const { error: historyError } = await supabase.from("copy_history").insert({
        ad_id: selectedAdId || null,
        ad_name: selectedAd?.concept_name || conceptDesc || creativeUrl || "Image input",
        generated_by: currentUser,
        hooks: result.hooks,
        copies: result.copies,
        body: result.body,
        control_copy: controlCopy || null,
        input_type: inputTab,
        input_preview: inputPreview,
      });

      if (historyError) {
        console.error("History insert error:", historyError);
        setError("Failed to save to history: " + historyError.message);
        setIsSaving(false);
        return;
      }

      setSaved(true);
      setHistoryKey(k => k + 1);
    } catch (err: any) {
      console.error("Save error:", err);
      setError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabClass = (tab: string) =>
    `px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
      inputTab === tab
        ? "bg-gray-900 text-white border-gray-900"
        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
    }`;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-[900px] mx-auto">

        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900">Copy Agent</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Generate 3:3:1 challenger ad copy powered by Claude</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left — Input */}
          <div className="space-y-4">

            {/* Pick Ad */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Pick an Ad (Optional)</p>
              <select
                className="w-full border border-gray-200 bg-white p-3 rounded-xl text-sm font-bold outline-none focus:border-green-500 text-gray-700"
                value={selectedAdId}
                onChange={e => handleAdSelect(e.target.value)}
              >
                <option value="">— Select an ad to auto-fill —</option>
                {activeAds.map(ad => (
                  <option key={ad.id} value={ad.id}>
                    {ad.imprint_number ? `DTC #${String(ad.imprint_number).padStart(4, "0")} — ` : ""}{ad.concept_name}
                  </option>
                ))}
              </select>
              {selectedAd && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-black px-2 py-0.5 bg-green-50 text-green-700 rounded-md uppercase">{selectedAd.status}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md uppercase">{selectedAd.ad_format}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md uppercase">{selectedAd.product}</span>
                  </div>
                  {selectedAd.review_link && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">✅ Review link auto-loaded</span>
                      <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-green-700 hover:text-green-800 ml-auto">Open ↗</a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Creative Input */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">2. Creative Input</span>
              <div className="flex gap-2 mb-4">
                <button className={tabClass("describe")} onClick={() => setInputTab("describe")}>Describe</button>
                <button className={tabClass("url")} onClick={() => setInputTab("url")}>URL / Video</button>
                <button className={tabClass("image")} onClick={() => setInputTab("image")}>Image</button>
              </div>

              {inputTab === "describe" && (
                <textarea
                  rows={4}
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800 resize-none"
                  placeholder="Describe the ad creative — the visual, emotion, narrative, and what makes it compelling..."
                  value={conceptDesc}
                  onChange={e => setConceptDesc(e.target.value)}
                />
              )}

              {inputTab === "url" && (
                <input
                  type="url"
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800"
                  placeholder="Paste image URL, YouTube, TikTok, Facebook, or Vimeo video URL..."
                  value={creativeUrl}
                  onChange={e => setCreativeUrl(e.target.value)}
                />
              )}

              {inputTab === "image" && (
                <div>
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                      <button
                        onClick={() => { setImageBase64(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-red-500 font-black text-xs border border-gray-200"
                      >✕</button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${isDragging ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-300 hover:bg-gray-50"}`}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleImageDrop}
                    >
                      <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-sm font-black text-gray-500">Drop an image or click to upload</p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP · Max 5MB</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageInput} />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Context */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Context</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Product</label>
                  <input type="text" className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800" placeholder="e.g. NAC" value={product} onChange={e => setProduct(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Format</label>
                  <select className="w-full border border-gray-200 bg-white p-3 rounded-xl text-sm font-bold outline-none focus:border-green-500 text-gray-700" value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="">— Select —</option>
                    <option>Video Ad</option>
                    <option>Static Ad</option>
                    <option>Native Ad</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Audience</label>
                <input type="text" className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800" placeholder="e.g. Men 40+, health-conscious" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>
            </div>

            {/* Control Copy */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">4. Control Copy (Optional)</p>
              <p className="text-[10px] text-gray-400 font-medium mb-3">Paste your current winning copy — Claude will write challengers to beat it</p>
              <textarea
                rows={3}
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800 resize-none"
                placeholder="Paste existing winning copy here..."
                value={controlCopy}
                onChange={e => setControlCopy(e.target.value)}
              />
            </div>

            {error && <p className="text-sm font-black text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (inputTab === "describe" && !conceptDesc.trim()) || (inputTab === "url" && !creativeUrl.trim()) || (inputTab === "image" && !imageBase64)}
              className="w-full bg-green-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating...
                </span>
              ) : "✍️ Generate 3:3:1 Copy"}
            </button>
          </div>

          {/* Right — Output */}
          <div className="space-y-4">
            {!result && !isGenerating && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <span className="text-5xl mb-4">✍️</span>
                <p className="font-black text-gray-600 text-lg">Ready to generate</p>
                <p className="text-sm text-gray-400 mt-1">Fill in the concept details and hit Generate</p>
              </div>
            )}
            {isGenerating && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mb-4" />
                <p className="font-black text-gray-600">Claude is writing your copy...</p>
                <p className="text-xs text-gray-400 mt-1">This takes about 10 seconds</p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-3">🪝 Hooks (3)</p>
                  <div className="space-y-2">
                    {result.hooks.map((hook, i) => (
                      <CopyCard key={i} label={`Hook ${i + 1}`} content={hook} color="border-green-200" />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">📝 Ad Copies (3)</p>
                  <div className="space-y-2">
                    {result.copies.map((copy, i) => (
                      <CopyCard key={i} label={`Copy ${i + 1}`} content={copy} color="border-amber-200" />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">📄 Body Copy (1)</p>
                  <CopyCard label="Body" content={result.body} color="border-blue-200" />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || saved}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm ${
                    saved ? "bg-green-100 text-green-700 border border-green-200" :
                    "bg-green-700 text-white hover:bg-green-800 disabled:opacity-40"
                  }`}
                >
                  {isSaving ? "Saving..." : saved ? "✓ Saved to Ad & History" : "💾 Save Copy"}
                </button>
                <button
                  onClick={() => { setResult(null); setSaved(false); }}
                  className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Generate Again
                </button>
              </div>
            )}
          </div>
        </div>

        <HistorySection supabase={supabase} currentUser={currentUser} currentRole={currentRole} refreshKey={historyKey} />

      </div>
    </div>
  );
}