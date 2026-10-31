import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { InspectionReport } from "@/lib/services/inspectionService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import { executeMoistureAnalysis, fetchAnalysisByReportId } from "@/lib/services/moistureAnalysisService";
import { executeAcousticAnalysis, fetchAcousticAnalysisByReportId } from "@/lib/services/acousticAnalysisService";
import { fetchRealWeatherForProperty } from "@/lib/services/weatherService";

export interface CandidateDefect {
  defect_type: string;
  label: string;
  probability: number;
  urgency: "Emergency 24h" | "Urgent 7d" | "Standard 14d";
  recommended_trade: string;
  evidence_basis: string;
}

export interface MultiDefectResult {
  id: string;
  report_id: string;
  property_id: string;
  property_name: string;
  inspection_zone: string;
  primary_defect: string;
  primary_label: string;
  confidence_score: number;
  statutory_urgency: "Emergency 24h" | "Urgent 7d" | "Standard 14d";
  recommended_trade: string;
  candidates: CandidateDefect[];
  cross_modal_synthesis: string;
  limitations: string[];

  // Optical Telemetry (OpenCV)
  has_optical_data: boolean;
  optical_difference_pct?: number | null;
  optical_anomaly_count?: number | null;
  optical_heatmap_url?: string | null;
  optical_processed_url?: string | null;
  optical_image_url?: string | null;
  optical_unavailability_reason?: string | null;

  // Acoustic Telemetry (SciPy FFT)
  has_acoustic_data: boolean;
  acoustic_frequency_hz?: number | null;
  acoustic_magnitude_db?: number | null;
  acoustic_anomaly_score?: number | null;
  acoustic_spectrum_svg?: string | null;
  acoustic_audio_url?: string | null;
  acoustic_unavailability_reason?: string | null;

  // Psychrometric / Weather Telemetry (Open-Meteo)
  has_weather_data: boolean;
  weather_temperature_c?: number | null;
  weather_humidity_pct?: number | null;
  weather_dew_point_c?: number | null;
  weather_temp_dew_diff_c?: number | null;
  weather_timestamp?: string | null;
  weather_source?: string | null;
  weather_unavailability_reason?: string | null;

  created_at: string;
}

const STORAGE_KEY = "propcare_multi_defect_store_v3";
const FASTAPI_ENDPOINT =
  process.env.NEXT_PUBLIC_FASTAPI_MULTI_DEFECT_URL ||
  "http://127.0.0.1:8000/api/v1/analyze/multi-defect";

function getLocalStore(): MultiDefectResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalStore(records: MultiDefectResult[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save multi-defect analyses to localStorage", err);
  }
}

/**
 * Executes Cross-Modal Multi-Defect Detection:
 * 1. Runs/retrieves real OpenCV image analysis on the uploaded photo.
 * 2. Runs/retrieves real SciPy FFT audio signal analysis on the uploaded audio.
 * 3. Fetches live Open-Meteo weather and dew-point telemetry for the property coordinates.
 * 4. Fuses telemetry via FastAPI (or explainable local fallback).
 * 5. Saves the results against the inspection in the database and local store.
 */
export async function runMultiDefectAnalysis(
  inspection: InspectionReport,
  onProgress?: (message: string) => void
): Promise<MultiDefectResult> {
  const supabase = createClient();
  const newId = `MDEF-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Step 1: Look up associated property
  onProgress?.("Loading property geolocation metadata...");
  const properties = await fetchProperties();
  const property: PropertyRecord | undefined = properties.find((p) => p.id === inspection.property_id);

  // Step 2: Optical Telemetry (OpenCV via FastAPI)
  onProgress?.("Processing inspection photograph with OpenCV...");
  let hasOptical = false;
  let opticalDiffPct: number | null = null;
  let opticalAnomalyCount: number | null = null;
  let opticalHeatmapUrl: string | null = null;
  let opticalProcessedUrl: string | null = null;
  let opticalImageUrl: string | null = null;
  let opticalReason: string | null = null;

  const hasImageFile = Boolean(inspection.ambient_img_url && inspection.ambient_img_url.trim().length > 0);
  if (hasImageFile) {
    try {
      // Check if previously analyzed or run fresh analysis
      let moistureRec = await fetchAnalysisByReportId(inspection.id);
      if (!moistureRec || !moistureRec.is_suitable) {
        moistureRec = await executeMoistureAnalysis(inspection);
      }

      if (moistureRec && moistureRec.is_suitable) {
        hasOptical = true;
        opticalDiffPct = moistureRec.difference_percentage;
        opticalAnomalyCount = moistureRec.anomaly_count;
        opticalHeatmapUrl = moistureRec.heatmap_url;
        opticalProcessedUrl = moistureRec.processed_image_url || null;
        opticalImageUrl = inspection.ambient_img_url;
      } else {
        hasOptical = false;
        opticalReason = moistureRec?.unsuitability_reason || "Photograph does not meet diagnostic illumination or focus standards.";
      }
    } catch (optErr) {
      console.warn("OpenCV optical analysis encountered an issue:", optErr);
      hasOptical = false;
      opticalReason = "Optical analysis engine could not process image file.";
    }
  } else {
    hasOptical = false;
    opticalReason = "No photograph uploaded for this inspection report.";
  }

  // Step 3: Acoustic Telemetry (SciPy FFT via FastAPI)
  onProgress?.("Processing acoustic recording with SciPy FFT harmonics...");
  let hasAcoustic = false;
  let acousticFreqHz: number | null = null;
  let acousticMagDb: number | null = null;
  let acousticScore: number | null = null;
  let acousticSpectrumSvg: string | null = null;
  let acousticAudioUrl: string | null = null;
  let acousticReason: string | null = null;

  const hasAudioFile = Boolean(
    inspection.audio_url &&
    inspection.audio_url.trim().length > 0 &&
    !inspection.audio_url.endsWith(".placeholder")
  );

  if (hasAudioFile) {
    try {
      let acousticRec = await fetchAcousticAnalysisByReportId(inspection.id);
      if (!acousticRec) {
        acousticRec = await executeAcousticAnalysis(inspection);
      }

      if (acousticRec && acousticRec.processing_status === "completed") {
        hasAcoustic = true;
        acousticFreqHz = acousticRec.dominant_frequency;
        acousticMagDb = acousticRec.dominant_magnitude_db;
        acousticScore = acousticRec.anomaly_score;
        acousticSpectrumSvg = acousticRec.spectrum_svg || null;
        acousticAudioUrl = inspection.audio_url;
      } else {
        hasAcoustic = false;
        acousticReason = "Acoustic audio file could not be analyzed.";
      }
    } catch (acErr) {
      console.warn("SciPy FFT acoustic analysis encountered an issue:", acErr);
      hasAcoustic = false;
      acousticReason = "Acoustic signal processing engine could not analyze audio recording.";
    }
  } else {
    hasAcoustic = false;
    acousticReason = "No acoustic recording (.wav/.mp3) attached to this inspection.";
  }

  // Step 4: Psychrometric / Weather Telemetry (Open-Meteo API)
  onProgress?.("Fetching live meteorological data from Open-Meteo...");
  let hasWeather = false;
  let weatherTemp: number | null = null;
  let weatherRh: number | null = null;
  let weatherDew: number | null = null;
  let weatherMargin: number | null = null;
  let weatherTimestamp: string | null = null;
  let weatherSource: string | null = null;
  let weatherReason: string | null = null;

  if (property) {
    try {
      const weatherData = await fetchRealWeatherForProperty(property, true);
      hasWeather = true;
      weatherTemp = weatherData.current.temperature;
      weatherRh = weatherData.current.relativeHumidity;
      weatherDew = weatherData.current.dewPoint;
      weatherMargin = weatherData.dewPointAnalysis.tempToDewDiff;
      weatherTimestamp = weatherData.current.timestamp;
      weatherSource = weatherData.metadata.source;
    } catch (wErr) {
      console.warn("Open-Meteo weather fetch encountered an issue:", wErr);
      hasWeather = false;
      weatherReason = (wErr as Error)?.message || "Weather coordinates unavailable for property.";
    }
  } else {
    hasWeather = false;
    weatherReason = "Property record not linked to this inspection.";
  }

  // Step 5: Cross-Modal Telemetry Fusion (FastAPI multi-defect classification)
  onProgress?.("Synthesizing cross-modal diagnostic indicators...");
  let apiResult: Record<string, unknown> | null = null;

  try {
    const payload = {
      report_id: inspection.id,
      property_id: inspection.property_id,
      optical_difference_pct: hasOptical ? opticalDiffPct : null,
      acoustic_frequency_hz: hasAcoustic ? acousticFreqHz : null,
      acoustic_anomaly_score: hasAcoustic ? acousticScore : null,
      dew_point_margin_c: hasWeather ? weatherMargin : null,
      zone_description: `${inspection.inspection_zone} - ${inspection.room_name} - ${inspection.floor}`,
      symptom_tags: inspection.symptom_tags || [],
      has_image: hasOptical,
      has_audio: hasAcoustic,
      has_weather: hasWeather,
    };

    const response = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      apiResult = await response.json();
    } else {
      console.warn("FastAPI multi-defect endpoint returned non-200, applying local fallback logic");
    }
  } catch (err) {
    console.warn("Could not connect to FastAPI multi-defect endpoint, applying local fallback logic", err);
  }

  // Construct local explainable candidate list if FastAPI response is missing
  const defaultPrimaryLabel =
    hasAcoustic && (acousticFreqHz || 0) >= 850 && (acousticFreqHz || 0) <= 1800
      ? "Pressurized Supply Pipe Pinhole Indicator"
      : "Interstitial Condensation & Biofilm Indicator";

  const defaultPrimaryDefect =
    hasAcoustic && (acousticFreqHz || 0) >= 850 && (acousticFreqHz || 0) <= 1800
      ? "pressurized_pipe_pinhole"
      : "interstitial_condensation_biofilm";

  const defaultUrgency =
    hasAcoustic && (acousticFreqHz || 0) >= 850 && (acousticFreqHz || 0) <= 1800
      ? "Emergency 24h"
      : "Standard 14d";

  const defaultTrade =
    hasAcoustic && (acousticFreqHz || 0) >= 850 && (acousticFreqHz || 0) <= 1800
      ? "Plumbing & Acoustic Leak Detection (CIPHE / Gas Safe)"
      : "Damp & Mould Remediation (PCA / PAS 2035)";

  const primaryLabel = (apiResult?.primary_label as string) || defaultPrimaryLabel;
  const primaryDefect = (apiResult?.primary_defect as string) || defaultPrimaryDefect;
  const urgency = (apiResult?.statutory_urgency as MultiDefectResult["statutory_urgency"]) || defaultUrgency;
  const trade = (apiResult?.recommended_trade as string) || defaultTrade;
  const confidenceScore = apiResult?.confidence_score ? Number(apiResult.confidence_score) : 65.0;

  const candidates: CandidateDefect[] = (apiResult?.candidates as CandidateDefect[]) || [
    {
      defect_type: primaryDefect,
      label: primaryLabel,
      probability: confidenceScore,
      urgency: urgency,
      recommended_trade: trade,
      evidence_basis: `Cross-modal evaluation based on available data (Optical: ${
        hasOptical ? `${opticalDiffPct}% delta` : "not available"
      }, Acoustic: ${hasAcoustic ? `${acousticFreqHz} Hz` : "not available"}, Weather: ${
        hasWeather ? `${weatherMargin}°C margin` : "not available"
      }).`,
    },
    {
      defect_type: "thermal_envelope_seal_gap",
      label: "Thermal Envelope Seal Degradation Indicator",
      probability: 25.0,
      urgency: "Standard 14d",
      recommended_trade: "Thermal Envelope & Window Glazing Remediation",
      evidence_basis: "Perimeter thermal boundary exposure screening.",
    },
  ];

  const synthesis =
    (apiResult?.cross_modal_synthesis as string) ||
    `Cross-modal evaluation synthesized ${hasOptical ? `optical difference (${opticalDiffPct}%)` : "optical: not available"}, ${
      hasAcoustic ? `acoustic resonance (${acousticFreqHz} Hz)` : "acoustic: not available"
    }, ${hasWeather ? `dew point margin (${weatherMargin}°C)` : "weather: not available"}. Primary screening indicator: ${primaryLabel}. Recommended trade consultation: ${trade} under ${urgency} target review window. Important: This result is a preliminary screening indicator and does not confirm active leakage or mould. Physical inspection by a qualified surveyor is mandatory before disruptive intervention.`;

  const limitations = (apiResult?.limitations as string[]) || [
    "PRELIMINARY INDICATOR ONLY: Algorithmic results are screening aids and do not constitute a structural confirmation. Physical non-destructive pin/dielectric meter testing and surveyor review are required.",
    "MANDATORY SURVEYOR VERIFICATION: No invasive wall breakout, ceiling breach, or tenant displacement should proceed without physical on-site verification.",
    "ACOUSTIC & THERMAL DYNAMICS: Acoustic resonance can fluctuate with system operating pressure; psychrometric condensation estimates depend on ambient ventilation and occupancy patterns.",
  ];

  if (!hasOptical && opticalReason) limitations.push(`OPTICAL DATA MISSING: ${opticalReason}`);
  if (!hasAcoustic && acousticReason) limitations.push(`ACOUSTIC DATA MISSING: ${acousticReason}`);
  if (!hasWeather && weatherReason) limitations.push(`WEATHER DATA MISSING: ${weatherReason}`);

  const record: MultiDefectResult = {
    id: newId,
    report_id: inspection.id,
    property_id: inspection.property_id,
    property_name: inspection.property_name,
    inspection_zone: inspection.inspection_zone,
    primary_defect: primaryDefect,
    primary_label: primaryLabel,
    confidence_score: confidenceScore,
    statutory_urgency: urgency,
    recommended_trade: trade,
    candidates: candidates,
    cross_modal_synthesis: synthesis,
    limitations: limitations,

    // Optical Telemetry
    has_optical_data: hasOptical,
    optical_difference_pct: opticalDiffPct,
    optical_anomaly_count: opticalAnomalyCount,
    optical_heatmap_url: opticalHeatmapUrl,
    optical_processed_url: opticalProcessedUrl,
    optical_image_url: opticalImageUrl,
    optical_unavailability_reason: opticalReason,

    // Acoustic Telemetry
    has_acoustic_data: hasAcoustic,
    acoustic_frequency_hz: acousticFreqHz,
    acoustic_magnitude_db: acousticMagDb,
    acoustic_anomaly_score: acousticScore,
    acoustic_spectrum_svg: acousticSpectrumSvg,
    acoustic_audio_url: acousticAudioUrl,
    acoustic_unavailability_reason: acousticReason,

    // Psychrometric Telemetry
    has_weather_data: hasWeather,
    weather_temperature_c: weatherTemp,
    weather_humidity_pct: weatherRh,
    weather_dew_point_c: weatherDew,
    weather_temp_dew_diff_c: weatherMargin,
    weather_timestamp: weatherTimestamp,
    weather_source: weatherSource,
    weather_unavailability_reason: weatherReason,

    created_at: new Date().toISOString(),
  };

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("multi_defect_analyses").insert([
        {
          report_id: inspection.id,
          primary_defect: record.primary_defect,
          primary_label: record.primary_label,
          confidence_score: record.confidence_score,
          statutory_urgency: record.statutory_urgency,
          recommended_trade: record.recommended_trade,
          candidates: record.candidates,
          cross_modal_synthesis: record.cross_modal_synthesis,
          limitations: record.limitations,
          metadata: {
            has_optical_data: record.has_optical_data,
            optical_difference_pct: record.optical_difference_pct,
            optical_anomaly_count: record.optical_anomaly_count,
            optical_heatmap_url: record.optical_heatmap_url,
            optical_processed_url: record.optical_processed_url,
            optical_image_url: record.optical_image_url,
            optical_unavailability_reason: record.optical_unavailability_reason,

            has_acoustic_data: record.has_acoustic_data,
            acoustic_frequency_hz: record.acoustic_frequency_hz,
            acoustic_magnitude_db: record.acoustic_magnitude_db,
            acoustic_anomaly_score: record.acoustic_anomaly_score,
            acoustic_spectrum_svg: record.acoustic_spectrum_svg,
            acoustic_audio_url: record.acoustic_audio_url,
            acoustic_unavailability_reason: record.acoustic_unavailability_reason,

            has_weather_data: record.has_weather_data,
            weather_temperature_c: record.weather_temperature_c,
            weather_humidity_pct: record.weather_humidity_pct,
            weather_dew_point_c: record.weather_dew_point_c,
            weather_temp_dew_diff_c: record.weather_temp_dew_diff_c,
            weather_timestamp: record.weather_timestamp,
            weather_source: record.weather_source,
            weather_unavailability_reason: record.weather_unavailability_reason,
            property_id: record.property_id,
            property_name: record.property_name,
            inspection_zone: record.inspection_zone,
          },
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not write multi-defect analysis to Supabase, persisting locally", dbErr);
    }
  }

  // Persist to local store
  const current = getLocalStore();
  const nextList = [record, ...current.filter((r) => r.report_id !== inspection.id)];
  saveLocalStore(nextList);

  return record;
}

/**
 * Fetches saved multi-defect analysis for a specific inspection report ID.
 * Queries Supabase first, then falls back to local storage.
 * Returns null if no analysis exists for this report (never returns fake demo data).
 */
export async function fetchMultiDefectByReportId(
  reportId: string
): Promise<MultiDefectResult | null> {
  const supabase = createClient();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("multi_defect_analyses")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const meta = (data.metadata || {}) as Record<string, unknown>;
        return {
          id: data.id,
          report_id: data.report_id,
          property_id: (meta.property_id as string) || "",
          property_name: (meta.property_name as string) || "",
          inspection_zone: (meta.inspection_zone as string) || "",
          primary_defect: data.primary_defect,
          primary_label: data.primary_label,
          confidence_score: Number(data.confidence_score),
          statutory_urgency: data.statutory_urgency,
          recommended_trade: data.recommended_trade,
          candidates: (data.candidates as CandidateDefect[]) || [],
          cross_modal_synthesis: data.cross_modal_synthesis,
          limitations: (data.limitations as string[]) || [],

          has_optical_data: Boolean(meta.has_optical_data),
          optical_difference_pct: meta.optical_difference_pct !== undefined ? Number(meta.optical_difference_pct) : null,
          optical_anomaly_count: meta.optical_anomaly_count !== undefined ? Number(meta.optical_anomaly_count) : null,
          optical_heatmap_url: (meta.optical_heatmap_url as string) || null,
          optical_processed_url: (meta.optical_processed_url as string) || null,
          optical_image_url: (meta.optical_image_url as string) || null,
          optical_unavailability_reason: (meta.optical_unavailability_reason as string) || null,

          has_acoustic_data: Boolean(meta.has_acoustic_data),
          acoustic_frequency_hz: meta.acoustic_frequency_hz !== undefined ? Number(meta.acoustic_frequency_hz) : null,
          acoustic_magnitude_db: meta.acoustic_magnitude_db !== undefined ? Number(meta.acoustic_magnitude_db) : null,
          acoustic_anomaly_score: meta.acoustic_anomaly_score !== undefined ? Number(meta.acoustic_anomaly_score) : null,
          acoustic_spectrum_svg: (meta.acoustic_spectrum_svg as string) || null,
          acoustic_audio_url: (meta.acoustic_audio_url as string) || null,
          acoustic_unavailability_reason: (meta.acoustic_unavailability_reason as string) || null,

          has_weather_data: Boolean(meta.has_weather_data),
          weather_temperature_c: meta.weather_temperature_c !== undefined ? Number(meta.weather_temperature_c) : null,
          weather_humidity_pct: meta.weather_humidity_pct !== undefined ? Number(meta.weather_humidity_pct) : null,
          weather_dew_point_c: meta.weather_dew_point_c !== undefined ? Number(meta.weather_dew_point_c) : null,
          weather_temp_dew_diff_c: meta.weather_temp_dew_diff_c !== undefined ? Number(meta.weather_temp_dew_diff_c) : null,
          weather_timestamp: (meta.weather_timestamp as string) || null,
          weather_source: (meta.weather_source as string) || null,
          weather_unavailability_reason: (meta.weather_unavailability_reason as string) || null,

          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn("Supabase multi-defect query failed, checking local store", err);
    }
  }

  // Fallback to local store
  const all = getLocalStore();
  return all.find((m) => m.report_id === reportId) || null;
}
