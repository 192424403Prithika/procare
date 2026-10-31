/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CloudRainIcon,
  ThermometerIcon,
  DropletIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  BuildingIcon,
  SparklesIcon,
  ClockIcon,
} from "@/components/Icons";
import { fetchProperties, PropertyRecord, updateProperty } from "@/lib/services/propertyService";
import {
  fetchRealWeatherForProperty,
  calculateMagnusDewPoint,
  WeatherForecastData,
  geocodePropertyLocation,
} from "@/lib/services/weatherService";

export default function WeatherIntelligencePage() {
  const searchParams = useSearchParams();
  const initialPropParam = searchParams.get("property") || "";

  // Properties State
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropParam);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  // Weather Telemetry State (Real Open-Meteo data only)
  const [weatherData, setWeatherData] = useState<WeatherForecastData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isLocationRequired, setIsLocationRequired] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Interactive Surface Condensation Calculator State
  const [calcTemp, setCalcTemp] = useState(20);
  const [calcHumidity, setCalcHumidity] = useState(70);
  const [wallSurfaceTemp, setWallSurfaceTemp] = useState(13);

  // Magnus Dew Point Calculation for the Interactive Surface Calculator
  const interactiveDewPoint = calculateMagnusDewPoint(calcTemp, calcHumidity);
  const dewMargin = Math.round((wallSurfaceTemp - interactiveDewPoint) * 10) / 10;
  const isCondensing = dewMargin <= 0;

  // 1. Load properties on mount
  useEffect(() => {
    async function loadProperties() {
      setIsLoadingProps(true);
      const props = await fetchProperties();
      setProperties(props);

      if (props.length > 0) {
        const target = initialPropParam
          ? props.find((p) => p.id === initialPropParam) || props[0]
          : props[0];
        setSelectedPropertyId(target.id);
        setSelectedProperty(target);
      }
      setIsLoadingProps(false);
    }
    loadProperties();
  }, [initialPropParam]);

  // 2. Fetch real weather data whenever the selected property changes
  const loadWeather = async (property: PropertyRecord, forceRefresh: boolean = false) => {
    setIsLoadingWeather(true);
    setWeatherError(null);
    setIsLocationRequired(false);

    // Check if coordinates exist
    if (!property.latitude || !property.longitude || (property.latitude === 0 && property.longitude === 0)) {
      setIsLocationRequired(true);
      setIsLoadingWeather(false);
      setWeatherData(null);
      return;
    }

    try {
      const data = await fetchRealWeatherForProperty(property, forceRefresh);
      setWeatherData(data);
    } catch (err: unknown) {
      console.error("Open-Meteo weather fetch error:", err);
      const msg = err instanceof Error ? err.message : "Failed to retrieve meteorological data from Open-Meteo.";
      if (msg.includes("Location required")) {
        setIsLocationRequired(true);
        setWeatherData(null);
      } else {
        setWeatherError(msg);
      }
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      loadWeather(selectedProperty, false);
    }
  }, [selectedProperty]);

  // Switch selected property
  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    const found = properties.find((p) => p.id === id) || null;
    setSelectedProperty(found);
  };

  // Automatic Geocoding Trigger
  const handleGeocode = async () => {
    if (!selectedProperty || isGeocoding) return;
    setIsGeocoding(true);
    setWeatherError(null);

    try {
      const geo = await geocodePropertyLocation(selectedProperty.address, selectedProperty.postal_code);
      if (geo) {
        // Save to database / persistent store
        const updated = await updateProperty(selectedProperty.id, {
          latitude: geo.latitude,
          longitude: geo.longitude,
        });

        if (updated) {
          setSelectedProperty(updated);
          setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          await loadWeather(updated, true);
        }
      } else {
        setWeatherError(
          `Could not resolve coordinates for address "${selectedProperty.address}, ${selectedProperty.postal_code}". Please enter latitude/longitude manually.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Geocoding service unavailable";
      setWeatherError(msg);
    } finally {
      setIsGeocoding(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "Severe":
        return "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30";
      case "High":
        return "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30";
      case "Elevated":
        return "bg-[#FEF9C3] text-[#CA8A04] border border-[#CA8A04]/30";
      default:
        return "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Microclimate Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Weather Intelligence &amp; Dew-Point Analysis
          </h1>
          <p className="text-xs text-[#806C7B]">
            Real Open-Meteo meteorological telemetry &bull; Magnus-Tetens condensation modeling &bull; Location-specific property coordinates
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedProperty && (
            <button
              type="button"
              disabled={isLoadingWeather}
              onClick={() => loadWeather(selectedProperty, true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh live Open-Meteo weather data"
            >
              <RefreshCwIcon size={14} className={isLoadingWeather ? "animate-spin text-[#79566F]" : ""} />
              <span>Refresh Live Weather</span>
            </button>
          )}

          <Link
            href="/app/risk-triage"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            Correlate with Risk Triage &rarr;
          </Link>
        </div>
      </div>

      {/* Mandatory Limitations & Confidence Notice */}
      <div className="bg-[#FDF5ED] border border-[#B86B35]/30 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <AlertTriangleIcon size={20} className="text-[#B86B35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#493344]">
          <strong className="font-bold text-[#B86B35] block mb-0.5">
            Meteorological Modeling Limitations &amp; Diagnostic Protocol:
          </strong>
          <span className="text-[#806C7B] leading-relaxed block">
            This module evaluates real outdoor ambient temperature, relative humidity, and dew point from Open-Meteo for the property's exact coordinates. A narrow temperature-to-dew-point margin indicates higher condensation potential on uninsulated external walls and thermal bridges. <strong className="text-[#493344]">Weather data does not prove internal wall moisture, pipe leakage, or biological mould growth</strong> without on-site diagnostic verification.
          </span>
        </div>
      </div>

      {/* Property Selector Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Selected Property:
            </span>
            {properties.length > 0 ? (
              <select
                value={selectedPropertyId}
                onChange={(e) => handleSelectProperty(e.target.value)}
                className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-1.5 px-3 text-xs font-bold text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name} — {p.postal_code}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#806C7B] italic">No properties enrolled in database.</span>
            )}
          </div>

          {selectedProperty && (
            <div className="text-xs text-[#806C7B] pt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#493344]">{selectedProperty.address}</span>
              <span>&bull;</span>
              <span>Type: {selectedProperty.building_type}</span>
              <span>&bull;</span>
              {selectedProperty.latitude && selectedProperty.longitude ? (
                <span className="font-mono text-[#79566F]">
                  Coords: {selectedProperty.latitude.toFixed(4)}°N, {Math.abs(selectedProperty.longitude).toFixed(4)}°W
                </span>
              ) : (
                <span className="text-[#C84661] font-semibold">Coordinates Missing</span>
              )}
            </div>
          )}
        </div>

        {weatherData && (
          <div className="text-right text-[11px] text-[#806C7B] shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-[#4A8B71]" />
              <span className="font-bold text-[#493344]">
                {weatherData.metadata.isCached ? "Cached Telemetry" : "Live Weather Telemetry"}
              </span>
            </div>
            <div className="text-[10px] mt-0.5">
              Fetched: {new Date(weatherData.metadata.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC &bull; {weatherData.metadata.source}
            </div>
          </div>
        )}
      </div>

      {/* Error / Warning Alert */}
      {weatherError && (
        <div className="p-4 bg-[#FDF2F4] border border-[#C84661]/30 rounded-2xl flex items-center justify-between text-xs text-[#C84661]">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangleIcon size={18} />
            <span>{weatherError}</span>
          </div>
          <button
            type="button"
            onClick={() => setWeatherError(null)}
            className="text-[#C84661] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* State A: Location Required Banner */}
      {isLocationRequired && selectedProperty && (
        <div className="bg-white p-8 rounded-3xl border border-[#C84661]/30 shadow-xs text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FDF2F4] text-[#C84661] flex items-center justify-center mx-auto">
            <AlertTriangleIcon size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#493344]">Location Required</h2>
            <p className="text-xs text-[#806C7B] mt-1 max-w-md mx-auto">
              Real meteorological data from Open-Meteo requires geographic coordinates. <strong className="text-[#493344]">{selectedProperty.property_name}</strong> currently lacks latitude and longitude coordinates.
            </p>
          </div>

          <div className="p-3.5 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-xs text-left max-w-sm mx-auto space-y-1">
            <div className="text-[#806C7B]">Registered Address:</div>
            <div className="font-semibold text-[#493344]">{selectedProperty.address}</div>
            <div className="font-mono text-[#79566F] font-bold">{selectedProperty.postal_code}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              type="button"
              disabled={isGeocoding}
              onClick={handleGeocode}
              className="px-5 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-bold hover:bg-[#67475E] transition-all cursor-pointer shadow-md shadow-[#79566F]/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isGeocoding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Geocoding via Ordnance Survey...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={14} />
                  <span>Geocode Address Automatically</span>
                </>
              )}
            </button>
            <Link
              href={`/app/properties/${selectedProperty.id}`}
              className="px-4 py-2.5 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors text-center"
            >
              Edit Property Coords Manually
            </Link>
          </div>
        </div>
      )}

      {/* State B: Loading Skeleton */}
      {isLoadingWeather && !weatherData && (
        <div className="py-20 text-center bg-white rounded-3xl border border-[#E6D5DC] shadow-xs">
          <div className="w-8 h-8 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-bold text-[#493344]">Fetching Real-Time Meteorological Telemetry...</div>
          <div className="text-[11px] text-[#806C7B] mt-0.5">Connecting to Open-Meteo forecast API for property coordinates</div>
        </div>
      )}

      {/* State C: Live Real Weather Display */}
      {weatherData && !isLocationRequired && (
        <>
          {/* Real Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Ambient Temperature */}
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
                  Ambient Air Temp
                </span>
                <ThermometerIcon size={18} className="text-[#79566F]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#493344]">
                  {weatherData.current.temperature.toFixed(1)} °C
                </span>
              </div>
              <div className="mt-1.5 text-xs text-[#806C7B]">
                Apparent: <strong className="text-[#493344]">{weatherData.current.apparentTemperature ?? weatherData.current.temperature} °C</strong>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#E6D5DC] text-[11px] text-[#806C7B] flex items-center justify-between">
                <span>Conditions:</span>
                <span className="font-semibold text-[#493344]">{weatherData.current.weatherDescription}</span>
              </div>
            </div>

            {/* Card 2: Relative Humidity */}
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
                  Relative Humidity
                </span>
                <DropletIcon size={18} className="text-[#79566F]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#493344]">
                  {weatherData.current.relativeHumidity} %
                </span>
              </div>
              <div className="mt-1.5 text-xs text-[#806C7B]">
                Water vapour saturation ratio
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#E6D5DC] text-[11px] text-[#806C7B] flex items-center justify-between">
                <span>Mould threshold:</span>
                <span className="font-semibold text-[#C84661]">&gt; 70% sustained</span>
              </div>
            </div>

            {/* Card 3: Real Dew Point */}
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
                  Calculated Dew Point
                </span>
                <CloudRainIcon size={18} className="text-[#B995AD]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#79566F]">
                  {weatherData.current.dewPoint.toFixed(1)} °C
                </span>
              </div>
              <div className="mt-1.5 text-xs text-[#806C7B]">
                Magnus Formula: <strong className="text-[#79566F]">{weatherData.dewPointAnalysis.magnusDewPoint} °C</strong>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#E6D5DC] text-[11px] text-[#806C7B] flex items-center justify-between">
                <span>Saturation state:</span>
                <span className="font-semibold text-[#493344]">Psychrometric T_dew</span>
              </div>
            </div>

            {/* Card 4: Temperature-to-Dew-Point Margin */}
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
                  Dew Margin (&Delta;T)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getRiskBadge(weatherData.dewPointAnalysis.condensationRisk)}`}>
                  {weatherData.dewPointAnalysis.condensationRisk}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#493344]">
                  {weatherData.dewPointAnalysis.tempToDewDiff.toFixed(1)} °C
                </span>
              </div>
              <div className="mt-1.5 text-xs text-[#806C7B]">
                T_ambient minus T_dew
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#E6D5DC] text-[11px] text-[#806C7B] flex items-center justify-between">
                <span>Risk Status:</span>
                <span className="font-bold text-[#493344]">{weatherData.dewPointAnalysis.condensationRisk} Condensation Risk</span>
              </div>
            </div>
          </div>

          {/* Scientific Explanation of the Dew Margin */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <h3 className="text-sm font-bold text-[#493344] mb-1">
              Microclimate Condensation Potential Analysis
            </h3>
            <p className="text-xs text-[#493344] leading-relaxed bg-[#F7EDE5] p-3.5 rounded-2xl border border-[#E6D5DC]">
              {weatherData.dewPointAnalysis.riskExplanation}
            </p>
          </div>

          {/* Interactive Dew-Point & Condensation Calculator */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E6D5DC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20">
                    Psychrometric Engine
                  </span>
                  <span className="text-xs text-[#806C7B]">Magnus-Tetens Formula</span>
                </div>
                <h2 className="text-lg font-bold text-[#493344] mt-1">
                  Interactive Surface Condensation &amp; Dew-Point Calculator
                </h2>
                <p className="text-xs text-[#806C7B]">
                  Simulate indoor air conditions vs. measured wall surface temperature to determine surface condensation vulnerability
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#F7EDE5] rounded-2xl text-center min-w-[120px] border border-[#E6D5DC]">
                  <span className="text-[10px] uppercase font-bold text-[#806C7B]">Calculated Dew Point</span>
                  <div className="text-xl font-black text-[#79566F] mt-0.5">{interactiveDewPoint} °C</div>
                </div>

                <div
                  className={`p-3 rounded-2xl text-center min-w-[130px] border ${
                    isCondensing
                      ? "bg-[#FDF2F4] border-[#C84661]/30 text-[#C84661]"
                      : dewMargin < 2
                      ? "bg-[#FDF5ED] border-[#B86B35]/30 text-[#B86B35]"
                      : "bg-[#EFF8F3] border-[#4A8B71]/30 text-[#4A8B71]"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">Surface Dew Margin</span>
                  <div className="text-xl font-black mt-0.5">{dewMargin} °C</div>
                  <span className="text-[9px] font-bold uppercase">
                    {isCondensing ? "Active Condensation" : dewMargin < 2 ? "High Risk Margin" : "Safe Margin"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#493344]">Indoor Air Temperature:</span>
                  <span className="font-mono font-bold text-[#79566F]">{calcTemp} °C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="28"
                  value={calcTemp}
                  onChange={(e) => setCalcTemp(Number(e.target.value))}
                  className="w-full accent-[#79566F] cursor-pointer"
                />
                <span className="text-[10px] text-[#806C7B] block">Tenant living area ambient setpoint</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#493344]">Indoor Relative Humidity (RH):</span>
                  <span className="font-mono font-bold text-[#79566F]">{calcHumidity} %</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={calcHumidity}
                  onChange={(e) => setCalcHumidity(Number(e.target.value))}
                  className="w-full accent-[#79566F] cursor-pointer"
                />
                <span className="text-[10px] text-[#806C7B] block">Target healthy threshold: &lt; 60%</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#493344]">Wall Surface Temperature:</span>
                  <span className="font-mono font-bold text-[#79566F]">{wallSurfaceTemp} °C</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="22"
                  value={wallSurfaceTemp}
                  onChange={(e) => setWallSurfaceTemp(Number(e.target.value))}
                  className="w-full accent-[#79566F] cursor-pointer"
                />
                <span className="text-[10px] text-[#806C7B] block">Measured via infrared thermometer or surface probe</span>
              </div>
            </div>
          </div>

          {/* Real 24-Hour Meteorological Forecast Table */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#493344]">
                  24-Hour Microclimate Dew-Point Horizon ({selectedProperty?.property_name})
                </h2>
                <p className="text-xs text-[#806C7B]">
                  Real hourly forecast from Open-Meteo &bull; Highlights nocturnal dips where ambient air approaches dew point
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#806C7B] bg-[#F7EDE5] px-2.5 py-1 rounded-md border border-[#E6D5DC] self-start sm:self-center">
                Hourly Resolution &bull; Open-Meteo
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E6D5DC] text-[10px] uppercase font-bold text-[#806C7B] bg-[#F7EDE5]">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Ambient Temp</th>
                    <th className="py-2.5 px-3">Relative Humidity</th>
                    <th className="py-2.5 px-3">Dew Point</th>
                    <th className="py-2.5 px-3">Dew Margin (&Delta;T)</th>
                    <th className="py-2.5 px-3">Condensation Vulnerability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D5DC] text-[#493344]">
                  {weatherData.hourly.map((h, idx) => (
                    <tr key={idx} className="hover:bg-[#EFE4EC]/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold font-mono text-[#79566F]">{h.formattedTime}</td>
                      <td className="py-2.5 px-3 font-semibold">{h.temperature.toFixed(1)} °C</td>
                      <td className="py-2.5 px-3">{h.relativeHumidity}%</td>
                      <td className="py-2.5 px-3 font-semibold text-[#79566F]">{h.dewPoint.toFixed(1)} °C</td>
                      <td className="py-2.5 px-3 font-mono">{h.tempToDewDiff.toFixed(1)} °C</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            h.condensationRisk === "Severe"
                              ? "bg-[#FDF2F4] text-[#C84661]"
                              : h.condensationRisk === "High"
                              ? "bg-[#FDF5ED] text-[#B86B35]"
                              : h.condensationRisk === "Elevated"
                              ? "bg-[#FEF9C3] text-[#CA8A04]"
                              : "bg-[#EFF8F3] text-[#4A8B71]"
                          }`}
                        >
                          {h.condensationRisk} Risk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* State D: Empty Properties State */}
      {properties.length === 0 && !isLoadingProps && (
        <div className="py-20 text-center bg-white rounded-3xl border border-[#E6D5DC] shadow-xs max-w-md mx-auto space-y-4">
          <BuildingIcon size={36} className="mx-auto text-[#806C7B]/50" />
          <div>
            <h2 className="text-base font-bold text-[#493344]">No Enrolled Properties</h2>
            <p className="text-xs text-[#806C7B] mt-1">
              Enroll your first property to access microclimate weather forecast and dew-point modeling.
            </p>
          </div>
          <Link
            href="/app/properties/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
          >
            <span>+ Add First Property</span>
          </Link>
        </div>
      )}
    </div>
  );
}
