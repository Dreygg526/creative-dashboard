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
  headline: string;
  ad_copy: string;
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
      <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{content}</p>
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
                  ) : item.input_type === "video" && item.input_preview ? (
                    <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg">🎥</span>
                      <span className="text-[8px] font-black text-gray-400 uppercase">Video</span>
                    </div>
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
                    <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                      {item.input_type && (
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          item.input_type === "image" ? "bg-blue-50 text-blue-600" :
                          item.input_type === "video" ? "bg-purple-50 text-purple-600" :
                          item.input_type === "url" ? "bg-green-50 text-green-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {item.input_type === "image" ? "🖼 Image" : item.input_type === "video" ? "🎥 Video" : item.input_type === "url" ? "🔗 URL" : "📝 Text"}
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">
                        by {item.generated_by}{item.generated_by_role ? ` (${item.generated_by_role})` : ""} · {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{expanded === item.id ? "▲" : "▼"}</span>
              </div>
              {expanded === item.id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {item.control_copy && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Previous Winning Copy</p>
                      <p className="text-sm text-gray-600 font-medium whitespace-pre-wrap">{item.control_copy}</p>
                    </div>
                  )}
                  {(item.headline || (item.hooks && item.hooks[0])) && (
                    <div>
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">📢 Headline</p>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 font-medium flex-1 whitespace-pre-wrap">{item.headline || item.hooks?.[0]}</p>
                        <button onClick={() => navigator.clipboard.writeText(item.headline || item.hooks?.[0])} className="text-[9px] font-black text-gray-400 hover:text-green-700 uppercase shrink-0">Copy</button>
                      </div>
                    </div>
                  )}
                  {(item.ad_copy || item.body) && (
                    <div>
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">📝 Ad Copy</p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 font-medium flex-1 whitespace-pre-wrap">{item.ad_copy || item.body}</p>
                        <button onClick={() => navigator.clipboard.writeText(item.ad_copy || item.body)} className="text-[9px] font-black text-gray-400 hover:text-amber-600 uppercase shrink-0">Copy</button>
                      </div>
                    </div>
                  )}
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
  const [targetAudience, setTargetAudience] = useState("");
  const [controlCopy, setControlCopy] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedCopy | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const [inputTab, setInputTab] = useState<"describe" | "url" | "image" | "video">("describe");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedAd = useMemo(() =>
    ads.find(a => a.id === selectedAdId),
    [ads, selectedAdId]
  );

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

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processVideo(file);
  }, []);

  const handleVideoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVideo(file);
  };

  const processVideo = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setError("Video too large — max 20MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setVideoFileName(file.name);
      setVideoBase64(res.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const PROVEN_COPY_FORMULAS = `
You are trained on the ad copy DNA of 50 top DTC brands. You know exactly how each writes — their tone, structure, hooks, and persuasion techniques. When writing copy, pick the style that best matches the competitor ad and product context.

## BRAND COPY DNA (pick the best match):

**SUPPLEMENTS / HEALTH:**

ANCESTRAL SUPPLEMENTS: Stat hook ("90% of Americans are deficient in...") → nutrient deficiency problem agitation → ✅ emoji bullet benefits (grassfed, 3rd-party tested, no fillers) → science/origin credibility close ("just as our ancestors did"). Tone: educational, earthy, ancestral authority.

HIMS: Social proof number first ("hundreds of thousands of guys") → "Why Hims?" format → 📋 emoji bullets → clinical credibility → heavy disclaimer footer. Tone: shame-free, direct, medically trustworthy.

RITUAL: Transparency-first ("We'll tell you exactly what's in it and why") → ingredient-by-ingredient breakdown → "no BS" positioning → subscription framing. Tone: clean, feminist, science-backed minimalism.

FEALS: Emotional problem open → CBD as calm solution → "meet feals" soft intro → lifestyle benefit bullets → free trial CTA. Tone: soft, anxiety-aware, premium calm.

EVERYDAY DOSE: Coffee replacement angle → "what if your morning routine actually helped you?" → mushroom science → before/after energy comparison → ritual framing. Tone: wellness-curious, anti-hustle, functional.

ARMRA: Immune system gate metaphor → colostrum science → "the first food" origin story → ✅ benefit stack → "try risk-free" CTA. Tone: scientific but warm, female-skewing health.

HAPPY MAMMOTH: Women's hormonal symptoms called out specifically → "it's not in your head" validation → product as hormonal support → transformation story → community proof. Tone: empathetic, validating, women's health focused.

PRIMAL HERBS: Ancient herb credibility → "used for thousands of years" framing → modern science validation → ✅ benefit bullets → ethical sourcing close. Tone: earthy, holistic, nature-authority.

GRUNS: "Finally, a gummy that actually works" → ingredient transparency → no sugar/no junk → taste + function combo → subscription discount CTA. Tone: playful but credible, millennial health.

HEIGHTS: Brain health specificity → "most people are deficient in [specific nutrient]" → cognitive performance angle → ✅ science bullets → 30-day trial. Tone: intellectual, performance-focused, UK-premium.

HIYA: Kids' health parent guilt angle → "most kids' vitamins are basically candy" → clean ingredients → pediatrician-approved → subscribe + save. Tone: protective parent, trust-building, clean label.

KIND PATCHES: Convenience angle → "no pills, no powders" → patch technology novelty → benefit stack → starter kit CTA. Tone: modern, effortless wellness, lifestyle-first.

SPARTAN: Performance identity → "you train hard, your supplements should too" → ingredient dosing specifics → athlete social proof → bulk discount CTA. Tone: aggressive, masculine, performance identity.

**FOOD / BEVERAGE:**

RYZE: Morning ritual replacement → "what if coffee didn't crash you?" → mushroom coffee positioning → ✅ benefit comparison (focus, calm, energy) → 30-day guarantee. Tone: wellness-forward, anti-anxiety, ritual upgrade.

DAVID PROTEIN: Protein density stat ("28g protein, 150 calories") → macro efficiency angle → "engineered for performance" → clean ingredient list → bulk CTA. Tone: data-driven, performance-first, no fluff.

OATS OVERNIGHT: Time-saving convenience → "breakfast in 2 minutes" → nutrition facts comparison vs regular oatmeal → flavor variety → subscription. Tone: busy professional, practical, taste-forward.

MASA CHIPS: "Not your average chip" → traditional nixtamalization process → heritage + health combo → clean ingredients → snack guilt-free positioning. Tone: foodie-curious, heritage-proud, clean snacking.

JAVVY: Coffee + collagen combo novelty → "your coffee just got an upgrade" → beauty-from-within angle → taste credibility → morning ritual framing. Tone: female wellness, beauty-health overlap, indulgent-but-healthy.

KA'CHAVA: Meal replacement completeness → "40+ superfoods in one shake" → replace multiple supplements → plant-based lifestyle → transformation story. Tone: complete nutrition, plant-powered, lifestyle transformation.

BREZ: "Finally a social drink without the hangover" → THC/CBD beverage novelty → specific occasion framing (parties, dinners) → taste comparison to alcohol → try a pack CTA. Tone: social lifestyle, sober-curious, modern alternative.

**BEAUTY / PERSONAL CARE:**

DR. SQUATCH: Pure masculine humor → pop culture hook → "tag someone who needs this" community mechanic → product benefit buried in joke → never takes itself seriously. Tone: bro-humor, irreverent, viral-first.

LUMIN SKINCARE: Men's skincare without the feminine framing → "your face deserves better" → simple routine positioning → before/after proof → starter kit. Tone: masculine self-care, accessible, confidence-driven.

NORSE ORGANICS: Beard/hair care masculine identity → "real men take care of themselves" → natural ingredients → ritual framing → before/after transformation. Tone: rugged-but-refined, natural authority, masculine care.

SOLAWAVE: Skincare technology novelty → "dermatologist-recommended" credibility → specific skin problem targeting → red light science → results timeline. Tone: tech-forward, results-obsessed, beauty meets science.

TRULY BEAUTY: Bold sensory copy → fun/playful ingredient names → body positivity tone → variety/flavors emphasis → "treat yourself" CTA. Tone: Gen-Z playful, body-positive, indulgent skincare.

OGEE: Luxury organic positioning → "the first certified organic luxury skincare" → ingredient purity → celebrity/editorial credibility → premium gift framing. Tone: luxury minimalism, purity-obsessed, aspirational organic.

BLISSY: Sleep quality angle → silk pillowcase science → hair + skin benefits while sleeping → "you deserve this" self-care framing → gift positioning. Tone: self-care luxury, sleep wellness, deserving framing.

LAURA GELLER: Age-positive beauty → "makeup that works with your skin, not against it" → coverage + skincare hybrid → mature woman confidence → QVC-style value stacking. Tone: inclusive, age-positive, trusted beauty advisor.

HI-SMILE: Teeth whitening speed claim ("whiter in X uses") → sensitivity-free positioning → celebrity/influencer proof → before/after visual emphasis → starter kit discount. Tone: confident smile identity, results-fast, accessible luxury.

**PET:**

FARMER'S DOG: Emotional dog owner guilt → "you wouldn't eat processed food every day" → fresh food comparison to kibble → vet-approved credibility → subscription convenience. Tone: emotional, guilt-to-love, pet parent devotion.

PETLAB CO.: Dog symptom specificity (joint pain, gut health, coat) → vet-formulated credibility → before/after dog transformation → money-back guarantee → subscription. Tone: concerned pet parent, clinical but warm, results-focused.

**APPAREL / ACCESSORIES:**

MEUNDIES: Comfort identity → "softest underwear you'll ever wear" → fabric science (MicroModal) → matching sets/couples angle → first pair discount. Tone: playful, comfort-obsessed, couples/gift friendly.

FABLETICS: VIP membership value → "get 2 leggings for $24" → celebrity founder credibility → style + performance combo → quiz/personalization hook. Tone: aspirational fitness lifestyle, value-forward, membership community.

JAMBYS: Loungewear comfort maximalism → "the softest pants exist" → stay-home identity → gift-perfect framing → limited colors urgency. Tone: cozy humor, stay-home proud, gifting occasion.

KIZIK: Hands-free shoe technology novelty → "just step in" → mobility/convenience angle → aging-in-place or busy parent targeting → demo video CTA. Tone: innovation-forward, practical luxury, accessibility.

HOLLOW SOCKS: Comfort + durability claims → "socks that don't fall down" → specific pain point (bunching, fading) → bulk value pack → satisfaction guarantee. Tone: functional, no-nonsense, everyday upgrade.

CUTS: Premium menswear performance → "shirts that don't wrinkle, stretch, or fade" → office-to-gym versatility → fabric technology → professional identity. Tone: ambitious professional, performance menswear, quality investment.

GLADE OPTICS: Affordable luxury eyewear → "why pay $500 for frames?" → direct-to-consumer disruption → style variety → home try-on program. Tone: anti-establishment, value-disruption, style-accessible.

PAIR EYEWEAR: Customizable frames concept → "one frame, endless tops" → personality expression → kids + adults → subscription of new tops. Tone: playful, self-expression, family-inclusive.

**OTHER:**

HEXCLAD: Gordon Ramsay credibility anchor → "the last pan you'll ever buy" → hybrid non-stick technology → professional-grade for home cooks → lifetime warranty. Tone: culinary authority, premium investment, chef-endorsed.

BOBBIE: Infant formula trust rebuilding → "made to EU standards" → ingredient transparency → "formula you can feel good about" → new parent anxiety relief. Tone: trust-rebuilding, parent-protective, premium safety.

GROUNDING WELL: Earthing/grounding science novelty → "you're disconnected from the earth" → inflammation reduction claim → product as reconnection tool → skeptic-friendly explanation. Tone: alternative wellness, curious-skeptic, nature-reconnection.

LOOP EARPLUGS: Noise reduction without isolation → "hear what matters, filter what doesn't" → specific use cases (concerts, focus, sleep, parenting) → style + function → starter pack. Tone: modern lifestyle, sensory wellness, design-forward.

HIKE FOOTWEAR: Trail running performance → "built for the mountain, worn in the city" → crossover lifestyle → technical specs in plain language → adventure identity. Tone: outdoor identity, performance crossover, adventure-aspirational.

CITY BEAUTY: Age-reversal specificity → "clinically shown to reduce [specific sign of aging]" → dermatologist formulated → before/after proof → results guarantee. Tone: results-obsessed, clinical authority, mature woman empowerment.

PRIMAL QUEEN: Women's hormonal health specifically → perimenopause/menopause validation → "finally someone made something for us" → natural hormone support → community belonging. Tone: women's health advocacy, validation, age-positive power.

NOVA CERAMICS: Lifestyle upgrade angle → "your daily [thing] deserves better" → artisan quality story → emoji benefit bullets → urgency discount CTA. Tone: lifestyle elevation, artisan pride, limited-time value.

## CORE COPY FORMULAS (apply within any brand style):

1. STAT HOOK: Lead with a surprising statistic → explain why it matters → product as solution
2. GRANDFATHER CONTRAST: "Your grandfather had [X]. He didn't have: ❌ [modern toxin]. You're not weak. You're poisoned."
3. PERMISSION SLIP: "You're not 'just [getting old/tired/sick].' Your [system] crashed."
4. STILL LIST: "✅ Still [enjoy normal thing] ✅ Still [normal life] ✅ No more [bad thing]"
5. VILLAIN FRAME: "Most [category] options leave you hanging. Either [bad A] or [bad B]."
6. STORY BRIDGE: "I was tired of [X], so I built [product]" → proof → CTA
7. SOCIAL PROOF SCALE: "[Number] of [people] are already [benefit]"
8. SCIENCE AUTHORITY: "[N] clinically-dosed ingredients. The only [product] that [bold claim]."
9. COMPARISON EMBED: ❌ competitor weakness immediately followed by ✅ our strength — inside the copy
10. RISK REVERSAL: "Try risk-free for [X] days. If you don't [result], we'll refund every penny."
11. MOMENTUM BUILDER: Short. Punchy. One sentence per line. Builds speed to CTA.
12. HOLIDAY/OCCASION: "This [holiday/occasion], don't give them [generic]. Give them [transformation]."
13. BEFORE/AFTER: Vivid before (pain) → vivid after (transformation) → product is the bridge
14. CURIOSITY OPEN: "Here's what nobody tells you about [common thing]..."
15. IDENTITY CHALLENGE: "Stop [negative behavior]. Start [positive identity]."

FORMATTING RULES:
- Short sentences. One idea per line when impactful.
- Use ❌ and ✅ for contrast lists INSIDE the copy only.
- Use \\n between paragraphs for breathing room.
- Match the exact tone of the competitor input.
- End with a punchy CTA.
- Add "*Individual results may vary" for health claims.
- If holiday/seasonal context detected, open with that angle.
`;

  const handleGenerate = async () => {
    if (inputTab === "describe" && !conceptDesc.trim()) { setError("Please paste the competitor's ad copy first."); return; }
    if (inputTab === "url" && !creativeUrl.trim()) { setError("Please paste a URL."); return; }
    if (inputTab === "image" && !imageBase64) { setError("Please upload an image."); return; }
    if (inputTab === "video" && !videoBase64) { setError("Please upload a video."); return; }
    setError("");
    setIsGenerating(true);
    setResult(null);
    setSaved(false);

    try {
      const contextInfo = `Product: ${product || "same product category as the competitor ad"}
Target Audience: ${targetAudience || "same target audience as the competitor ad"}
${controlCopy ? `Previous Winning Copy (make new copy different enough): ${controlCopy}` : ""}`;

      const systemPrompt = `You are a world-class direct-response copywriter for DTC health and wellness brands. You write copy that makes people stop scrolling and buy.

${PROVEN_COPY_FORMULAS}

Your job:
1. Analyze the competitor ad input (image, video, text, or URL)
2. Extract their winning formula — emotional angle, tone, structure, formatting
3. Pick the BEST proven copy formula that fits the product and context
4. Write ONE headline and ONE full ad copy for our product

HEADLINE:
- 5-12 words maximum
- Punchy, scroll-stopping, emotionally charged
- Match the tone of the competitor (bold, clinical, empathetic, etc.)
- Examples: "Pour Yourself a Better Cup of Coffee ☕" / "Natural Hormonal Support for Men Over 35"

AD COPY:
- Full narrative direct-response copy
- Use one of the proven formulas above — pick the best fit
- Embed comparison (❌/✅) INSIDE the copy naturally, not as a separate section
- Use \\n between paragraphs for line breaks
- End with a strong CTA
- Length: medium (like the Mars Men or gut health examples — substantial but not bloated)
- If the input mentions a holiday, season, or specific event — make the copy relevant to that context

CRITICAL OUTPUT RULES:
- Output ONLY a raw JSON object. Nothing before it. Nothing after it.
- No markdown. No backticks. No "Here is..." preamble. No explanation.
- The entire response must be parseable by JSON.parse()
- Format: {"headline":"your headline here","ad_copy":"your full ad copy here with \\n line breaks"}
- Never mention competitor brands by name.
- If you write anything outside the JSON object, you have failed.

EXAMPLE OF CORRECT OUTPUT:
{"headline":"Natural Support for Men Over 35","ad_copy":"You're not just tired.\\n\\nYour body is fighting a war it wasn't designed for..."}`;

      let messages: any[] = [];

      if (inputTab === "image" && imageBase64) {
        const mediaType = imageBase64.charAt(0) === "/" ? "image/jpeg" : "image/png";
        messages = [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text: `This is a competitor's winning ad. Analyze their formula, tone, formatting, and emotional angle. Then write a headline and full ad copy for our product using the best proven formula.\n\n${contextInfo}\n\nAdditional context from the ad: ${conceptDesc || "See image only"}`
            }
          ]
        }];
      } else if (inputTab === "video" && videoBase64) {
        const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

        const mimeType = videoFileName?.endsWith(".mov") ? "video/quicktime" :
                         videoFileName?.endsWith(".avi") ? "video/avi" :
                         videoFileName?.endsWith(".webm") ? "video/webm" : "video/mp4";

        const byteCharacters = atob(videoBase64);
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const videoBlob = new Blob([byteArray], { type: mimeType });

        // Upload to Gemini Files API
        const uploadResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "X-Goog-Upload-Command": "start, upload, finalize",
              "X-Goog-Upload-Header-Content-Length": String(videoBlob.size),
              "X-Goog-Upload-Header-Content-Type": mimeType,
              "Content-Type": mimeType,
            },
            body: videoBlob,
          }
        );

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Gemini upload failed: ${errText}`);
        }

        const uploadData = await uploadResponse.json();
        const fileUri = uploadData.file?.uri;
        const fileName = uploadData.file?.name; // e.g. "files/abc123"
        if (!fileUri || !fileName) throw new Error("Gemini did not return a file URI");

        // Poll until file is ACTIVE using the full file name path
        let fileActive = false;
        let pollAttempts = 0;
        while (!fileActive && pollAttempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 4000));
          try {
            const statusRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
            );
            const statusData = await statusRes.json();
            console.log(`Poll attempt ${pollAttempts + 1} — state: ${statusData.state}`);
            if (statusData.state === "ACTIVE") {
              fileActive = true;
            }
          } catch (pollErr) {
            console.warn("Poll error:", pollErr);
          }
          pollAttempts++;
        }

        if (!fileActive) throw new Error("Video processing timed out. Try a shorter video.");

        // Ask Gemini to analyze the video
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { file_data: { mime_type: mimeType, file_uri: fileUri } },
                  {
                    text: `You are analyzing a competitor's video ad. Watch it carefully and extract:
1. The hook style (how does it open? what's the first 3 seconds?)
2. The emotional angle (fear, aspiration, curiosity, social proof, urgency?)
3. The tone (aggressive, clinical, empathetic, casual, authoritative?)
4. The persuasion technique (problem-agitate-solve, story, comparison, authority?)
5. Any text, captions, or copy visible in the video
6. The overall narrative structure (how does it flow from hook to CTA?)
7. Formatting patterns (emojis, ALL CAPS, bullet points, line breaks?)

Be specific and detailed. This analysis will be used to write new ad copy for a different product using the same winning formula.`
                  }
                ]
              }]
            })
          }
        );

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          throw new Error(`Gemini analysis failed: ${errText}`);
        }

        const geminiData = await geminiResponse.json();
        const videoAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!videoAnalysis) throw new Error("Gemini returned empty analysis");

        messages = [{
          role: "user",
          content: `A competitor's winning video ad has been analyzed by Gemini AI. Here is the detailed analysis:\n\n${videoAnalysis}\n\nAdditional context from user: ${conceptDesc || "None"}\n\n${contextInfo}\n\nUsing this analysis, pick the best proven copy formula and write a headline and full ad copy for our product that captures the same winning formula.`
        }];

      } else if (inputTab === "url") {
        const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

        // Use Gemini to analyze the URL content first
        const geminiUrlResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `Visit and analyze this competitor ad URL: ${creativeUrl}\n\nExtract:\n1. The hook style (how does it open?)\n2. The emotional angle (fear, aspiration, curiosity, social proof, urgency?)\n3. The tone (aggressive, clinical, empathetic, casual, authoritative?)\n4. The persuasion technique used\n5. Any visible copy, headlines, or text\n6. The narrative structure (hook → body → CTA flow)\n7. Formatting patterns (emojis, ALL CAPS, bullet points?)\n\nBe specific and detailed. This will be used to write new ad copy for a different product using the same winning formula.`
                  }
                ]
              }],
              tools: [{ url_context: {} }]
            })
          }
        );

        let urlAnalysis = "";
        if (geminiUrlResponse.ok) {
          const geminiUrlData = await geminiUrlResponse.json();
          urlAnalysis = geminiUrlData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }

        // Fall back to passing URL directly if Gemini fails
        messages = [{
          role: "user",
          content: urlAnalysis
            ? `A competitor's winning ad URL has been analyzed by Gemini AI:\n\nURL: ${creativeUrl}\n\nGemini Analysis:\n${urlAnalysis}\n\nAdditional context: ${conceptDesc || "None"}\n\n${contextInfo}\n\nUsing this analysis, pick the best proven copy formula and write a headline and full ad copy for our product.`
            : `Competitor's winning ad URL: ${creativeUrl}\n\nAnalyze their formula, tone, and emotional angle. Write a headline and full ad copy for our product.\n\n${contextInfo}\n\nAdditional context: ${conceptDesc || "See URL"}`
        }];
      } else {
        messages = [{
          role: "user",
          content: `Competitor's winning ad copy:\n${conceptDesc}\n\nAnalyze their formula — emotional trigger, formatting, tone, structure. Pick the best proven formula and write a headline and full ad copy for our product.\n\n${contextInfo}`
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
          max_tokens: 2000,
          system: systemPrompt,
          messages,
        }),
      });

      const data = await response.json();
      console.log("Claude full response:", JSON.stringify(data));
      const raw = data.content?.[0]?.text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in:", raw);
        throw new Error("No valid JSON in response");
      }
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        throw new Error("Failed to parse JSON from response");
      }
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
      let inputPreview: string | null = null;
      if (inputTab === "url" && creativeUrl.trim()) inputPreview = creativeUrl.trim();
      else if (inputTab === "image" && imagePreview) inputPreview = imagePreview;
      else if (inputTab === "video" && videoFileName) inputPreview = videoFileName;
      else if (inputTab === "describe" && conceptDesc.trim()) inputPreview = conceptDesc.trim();

      const { error: historyError } = await supabase.from("copy_history").insert({
        ad_id: selectedAdId || null,
        ad_name: selectedAd?.concept_name || conceptDesc || creativeUrl || videoFileName || "Image input",
        generated_by: currentUser,
        generated_by_role: currentRole,
        headline: result.headline,
        ad_copy: result.ad_copy,
        hooks: [result.headline],
        copies: [result.ad_copy],
        body: result.ad_copy,
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

  const isGenerateDisabled = isGenerating ||
    (inputTab === "describe" && !conceptDesc.trim()) ||
    (inputTab === "url" && !creativeUrl.trim()) ||
    (inputTab === "image" && !imageBase64) ||
    (inputTab === "video" && !videoBase64);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-[900px] mx-auto">

        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900">Copy Agent</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Analyze competitor ads and rewrite them for your product</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left — Input */}
          <div className="space-y-4">

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">1. Competitor Ad Input</span>
              <p className="text-[10px] text-gray-400 font-medium mb-4">Upload or paste the competitor's winning ad — Claude will copy their style for your product</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <button className={tabClass("describe")} onClick={() => setInputTab("describe")}>Paste Text</button>
                <button className={tabClass("url")} onClick={() => setInputTab("url")}>URL</button>
                <button className={tabClass("image")} onClick={() => setInputTab("image")}>Image</button>
                <button className={tabClass("video")} onClick={() => setInputTab("video")}>Upload Video</button>
              </div>

              {inputTab === "describe" && (
                <textarea
                  rows={5}
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800 resize-none"
                  placeholder="Paste the competitor's ad copy, headline, body text here — include emojis and formatting exactly as they appear..."
                  value={conceptDesc}
                  onChange={e => setConceptDesc(e.target.value)}
                />
              )}

              {inputTab === "url" && (
                <input
                  type="url"
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800"
                  placeholder="Paste competitor's ad URL, YouTube, TikTok, or Facebook link..."
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
                      <p className="text-sm font-black text-gray-500">Drop image or click to upload</p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP · Max 5MB</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageInput} />
                    </label>
                  )}
                </div>
              )}

              {inputTab === "video" && (
                <div>
                  {videoFileName ? (
                    <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <span className="text-2xl">🎥</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-800 truncate">{videoFileName}</p>
                        <p className="text-[10px] text-gray-400">Video ready for analysis</p>
                      </div>
                      <button
                        onClick={() => { setVideoBase64(null); setVideoFileName(null); }}
                        className="w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-red-500 font-black text-xs border border-gray-200 shrink-0"
                      >✕</button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${isDragging ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"}`}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleVideoDrop}
                    >
                      <span className="text-3xl mb-2">🎥</span>
                      <p className="text-sm font-black text-gray-500">Drop video ad or click to upload</p>
                      <p className="text-[10px] text-gray-400 mt-1">MP4, MOV, AVI · Max 20MB</p>
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideoInput} />
                    </label>
                  )}
                  <textarea
                    rows={2}
                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800 resize-none mt-3"
                    placeholder="Optional: describe what's in the video or paste any visible copy..."
                    value={conceptDesc}
                    onChange={e => setConceptDesc(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Your Product Context</p>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Product</label>
                <input type="text" className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800" placeholder="e.g. NAC" value={product} onChange={e => setProduct(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Audience</label>
                <input type="text" className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800" placeholder="e.g. Men 40+, health-conscious" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">3. Previous Winning Copy (Optional)</p>
              <p className="text-[10px] text-gray-400 font-medium mb-3">Paste your own previous winner — Claude will make sure the new copy is different enough</p>
              <textarea
                rows={3}
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 text-gray-800 resize-none"
                placeholder="Paste your previous winning copy here..."
                value={controlCopy}
                onChange={e => setControlCopy(e.target.value)}
              />
            </div>

            {error && <p className="text-sm font-black text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className="w-full bg-green-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {inputTab === "video" ? "Uploading & Analyzing Video..." : "Analyzing & Writing..."}
                </span>
              ) : "🕵️ Analyze & Write Copy"}
            </button>
          </div>

          {/* Right — Output */}
          <div className="space-y-4">
            {!result && !isGenerating && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <span className="text-5xl mb-4">🕵️</span>
                <p className="font-black text-gray-600 text-lg">Ready to analyze</p>
                <p className="text-sm text-gray-400 mt-1">Paste or upload a competitor's winning ad and hit Analyze</p>
              </div>
            )}
            {isGenerating && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mb-4" />
                <p className="font-black text-gray-600">
                  {inputTab === "video" ? "Gemini is watching the video..." : "Writing your copy..."}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {inputTab === "video" ? "Then Claude will write the copy using proven formulas" : "Applying proven formulas to your product"}
                </p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2">
                  <span className="text-sm">🕵️</span>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Competitor formula captured — rewritten for your product</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-3">📢 Headline</p>
                  <CopyCard label="Headline" content={result.headline} color="border-green-200" />
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">📝 Ad Copy</p>
                  <CopyCard label="Ad Copy" content={result.ad_copy} color="border-amber-200" />
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving || saved}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm ${
                    saved ? "bg-green-100 text-green-700 border border-green-200" :
                    "bg-green-700 text-white hover:bg-green-800 disabled:opacity-40"
                  }`}
                >
                  {isSaving ? "Saving..." : saved ? "✓ Saved to History" : "💾 Save Copy"}
                </button>
                <button
                  onClick={() => { setSaved(false); handleGenerate(); }}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-all disabled:opacity-40"
                >
                  {isGenerating ? "Generating..." : "🔄 Generate New Version"}
                </button>
                <button
                  onClick={() => { setResult(null); setSaved(false); }}
                  className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Analyze Another
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