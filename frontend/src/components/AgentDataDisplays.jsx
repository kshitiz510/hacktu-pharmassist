import { motion } from "framer-motion";
import { Shield } from "lucide-react";

/**
 * IQVIA Agent Data Renderer
 */
export function IQVIADataDisplay({ data, isFirstPrompt }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="IQVIA" />;
  }

  if (isFirstPrompt) {
    const marketForecast = data.market_forecast;
    const competitiveShare = data.competitive_share;

    return (
      <>
        {/* Market Forecast */}
        {marketForecast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-blue-500 font-semibold mb-3 text-lg">{marketForecast.title}</h3>

            <div className="bg-muted rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-end justify-between h-56">
                  <div className="flex flex-col justify-between h-full text-xs text-muted-foreground pr-3 w-12">
                    <span>$35B</span>
                    <span>$30B</span>
                    <span>$25B</span>
                    <span>$20B</span>
                    <span>$15B</span>
                    <span>$10B</span>
                    <span>$5B</span>
                  </div>

                  <div className="flex-1 flex items-end justify-around h-full relative">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="border-t border-border" />
                      ))}
                    </div>

                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 400 224"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="marketGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 40 198 L 110 170 L 180 128 L 250 72 L 320 32 L 320 224 L 40 224 Z"
                        fill="url(#marketGradient)"
                      />
                      <path
                        d="M 40 198 L 110 170 L 180 128 L 250 72 L 320 32"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-around text-xs text-muted-foreground pt-2 border-t border-border">
                  {marketForecast.data?.map((item) => (
                    <div key={item.year} className="text-center">
                      <div className="font-medium text-foreground">{item.year}</div>
                      <div className="text-blue-500 font-semibold mt-1">${item.value}B</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{marketForecast.description}</p>
          </motion.div>
        )}

        {/* Competitive Share */}
        {competitiveShare && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-emerald-500 font-semibold mb-3 text-lg">{competitiveShare.title}</h3>

            <div className="bg-muted rounded-lg p-6">
              <div className="space-y-3">
                {competitiveShare.data?.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.company}</span>
                    <span
                      className={`font-semibold ${idx === 0 ? "text-blue-500" : idx === 1 ? "text-emerald-500" : "text-muted-foreground"}`}
                    >
                      {item.share}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{competitiveShare.description}</p>
          </motion.div>
        )}
      </>
    );
  }

  // AUD-specific data
  const marketOverview = data.market_overview;
  const existingTherapies = data.existing_therapies;
  const audSignal = data.aud_signal;
  const commercialScenario = data.commercial_scenario;

  return (
    <>
      {/* AUD Market Overview */}
      {marketOverview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-teal-500 font-semibold mb-3 text-lg">{marketOverview.title}</h3>

          <div className="bg-muted rounded-lg p-6 grid grid-cols-4 gap-4 text-sm">
            {marketOverview.metrics?.map((metric, idx) => (
              <div key={idx} className="bg-card border border-primary/20 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">{metric.label}</p>
                <p className="text-teal-400 font-semibold mt-1">{metric.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Existing Therapies Table */}
      {existingTherapies && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-violet-500 font-semibold mb-3 text-lg">{existingTherapies.title}</h3>

          <div className="bg-muted rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Drug</th>
                  <th className="text-center p-3">Mechanism</th>
                  <th className="text-center p-3">Efficacy</th>
                  <th className="text-left p-3">Limitations</th>
                </tr>
              </thead>
              <tbody>
                {existingTherapies.data?.map((therapy, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3">{therapy.drug}</td>
                    <td className="text-center p-3">{therapy.mechanism}</td>
                    <td
                      className={`text-center p-3 ${therapy.efficacy === "Low" ? "text-red-400" : "text-yellow-400"}`}
                    >
                      {therapy.efficacy}
                    </td>
                    <td className="p-3">{therapy.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* AUD Signal */}
      {audSignal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-emerald-400 font-semibold mb-3 text-lg">{audSignal.title}</h3>

          <div className="bg-muted rounded-lg p-6 text-sm space-y-3">
            <div className="bg-card border border-emerald-500/20 rounded-lg p-4">
              <p className="text-muted-foreground text-xs">Observed Effects</p>
              <p className="text-emerald-300 font-semibold mt-1">{audSignal.observed_effects}</p>
            </div>
            <ul className="list-disc list-inside text-muted-foreground">
              {audSignal.key_points?.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Commercial Scenario */}
      {commercialScenario && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-amber-500 font-semibold mb-3 text-lg">{commercialScenario.title}</h3>

          <div className="bg-muted rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {commercialScenario.data?.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className={`p-3 ${item.highlight ? "font-semibold" : ""}`}>
                      {item.metric}
                    </td>
                    <td
                      className={`p-3 text-right ${item.highlight ? "text-emerald-400 font-semibold" : ""}`}
                    >
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </>
  );
}

/**
 * EXIM Agent Data Renderer
 */
export function EXIMDataDisplay({ data, showChart }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="EXIM" />;
  }

  const tradeVolume = data.trade_volume;
  const priceTrend = data.price_trend;
  const importDependency = data.import_dependency;

  return (
    <>
      {/* Trade Volume */}
      {tradeVolume && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-teal-500 font-semibold mb-3 text-lg">{tradeVolume.title}</h3>

          <div className="bg-muted rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-foreground font-semibold">Source Country</th>
                  <th className="text-right p-3 text-foreground font-semibold">Q2 2024 (kg)</th>
                  <th className="text-right p-3 text-foreground font-semibold">Q3 2024 (kg)</th>
                  <th className="text-right p-3 text-foreground font-semibold">QoQ Growth</th>
                </tr>
              </thead>
              <tbody>
                {tradeVolume.data?.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3 text-zinc-200 font-medium">{item.country}</td>
                    <td className="text-right p-3 text-foreground">{item.q2_2024}</td>
                    <td className="text-right p-3 text-foreground">{item.q3_2024}</td>
                    <td className="text-right p-3">
                      <span className="text-emerald-500 font-semibold">{item.qoq_growth}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{tradeVolume.description}</p>
        </motion.div>
      )}

      {/* Price Trend Chart */}
      {showChart && priceTrend && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="text-violet-500 font-semibold mb-3 text-lg">{priceTrend.title}</h3>

          <div className="bg-muted rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-end justify-between h-48">
                <div className="flex flex-col justify-between h-full text-xs text-muted-foreground pr-2">
                  <span>$6.0</span>
                  <span>$5.5</span>
                  <span>$5.0</span>
                  <span>$4.5</span>
                  <span>$4.0</span>
                </div>

                <div className="flex-1 relative h-full">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="border-t border-border" />
                    ))}
                  </div>

                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 300 192"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 50 38.4 L 150 76.8 L 250 134.4 L 250 192 L 50 192 Z"
                      fill="url(#priceGradient)"
                    />
                    <path
                      d="M 50 38.4 L 150 76.8 L 250 134.4"
                      stroke="#a855f7"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {[50, 150, 250].map((x, i) => (
                      <circle
                        key={i}
                        cx={x}
                        cy={[38.4, 76.8, 134.4][i]}
                        r="5"
                        fill="#a855f7"
                        stroke="#18181b"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>
              </div>

              <div className="flex justify-around text-xs text-muted-foreground pt-2 border-t border-border">
                {priceTrend.data?.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-foreground font-medium">{item.quarter}</div>
                    <div className="text-violet-500 font-semibold">${item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{priceTrend.description}</p>
        </motion.div>
      )}

      {/* Import Dependency */}
      {importDependency && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-orange-400 font-semibold mb-3 text-lg">{importDependency.title}</h3>

          <div className="bg-muted rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-foreground font-semibold">Region</th>
                  <th className="text-center p-3 text-foreground font-semibold">Dependency %</th>
                  <th className="text-left p-3 text-foreground font-semibold">Primary Sources</th>
                  <th className="text-center p-3 text-foreground font-semibold">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {importDependency.data?.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3 text-zinc-200 font-medium">{item.region}</td>
                    <td className="text-center p-3 text-foreground">{item.dependency_percent}</td>
                    <td className="p-3 text-foreground">{item.primary_sources}</td>
                    <td className="text-center p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.risk_level === "High"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {item.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{importDependency.description}</p>
        </motion.div>
      )}
    </>
  );
}

/**
 * Patent Agent Data Renderer
 */
export function PatentDataDisplay({ data, isFirstPrompt }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Patent" />;
  }

  if (isFirstPrompt) {
    const landscapeOverview = data.landscape_overview;
    const repurposingStrategy = data.repurposing_strategy;
    const filingHeatmap = data.filing_heatmap;
    const keyPatentExtract = data.key_patent_extract;
    const ipOpportunities = data.ip_opportunities;

    return (
      <>
        {/* Landscape Overview */}
        {landscapeOverview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-amber-500 font-semibold mb-3 text-lg">{landscapeOverview.title}</h3>

            <div className="bg-muted rounded-lg p-6 space-y-4">
              <div className="space-y-3">
                {landscapeOverview.sections?.map((section, idx) => (
                  <div
                    key={idx}
                    className="bg-card border border-amber-500/20 rounded-lg p-4"
                  >
                    <p className="text-muted-foreground text-sm">{section.label}</p>
                    <p className="text-amber-300 font-semibold mt-1">{section.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">{landscapeOverview.description}</p>
            </div>
          </motion.div>
        )}

        {/* Repurposing Strategy */}
        {repurposingStrategy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-blue-500 font-semibold mb-3 text-lg">
              {repurposingStrategy.title}
            </h3>

            <div className="bg-muted rounded-lg p-6 space-y-3 text-sm">
              <p className="text-muted-foreground">
                <span className="text-white font-semibold">High-confidence targets:</span>{" "}
                {repurposingStrategy.high_confidence_targets}
              </p>
              <p className="text-muted-foreground">
                <span className="text-white font-semibold">Medium-risk exploratory areas:</span>{" "}
                {repurposingStrategy.medium_risk_areas}
              </p>
            </div>
          </motion.div>
        )}

        {/* Filing Heatmap */}
        {filingHeatmap && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-emerald-400 font-semibold mb-3 text-lg">{filingHeatmap.title}</h3>

            <div className="bg-muted rounded-lg p-6">
              <div className="grid grid-cols-4 gap-3">
                {filingHeatmap.data?.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div
                      className={`bg-${item.color}-500/20 border border-${item.color}-500/30 rounded-lg p-4`}
                    >
                      <div className={`text-2xl font-bold text-${item.color}-400`}>
                        {item.count}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{item.region}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{filingHeatmap.description}</p>
          </motion.div>
        )}

        {/* Key Patent Extract */}
        {keyPatentExtract && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-violet-400 font-semibold mb-3 text-lg">{keyPatentExtract.title}</h3>

            <div className="bg-muted rounded-lg p-4 border-l-4 border-violet-500">
              <div className="flex items-start gap-3">
                <Shield className="text-violet-400 mt-1" size={20} />
                <div>
                  <div className="text-xs text-violet-400 font-mono mb-2">
                    {keyPatentExtract.patent_number}
                  </div>
                  <p className="text-sm text-foreground italic">"{keyPatentExtract.description}"</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    <span className="text-amber-500 font-semibold">⚠ Risk:</span>{" "}
                    {keyPatentExtract.risk_note}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* IP Opportunities */}
        {ipOpportunities && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h3 className="text-violet-500 font-semibold mb-3 text-lg">{ipOpportunities.title}</h3>

            <div className="bg-muted rounded-lg p-6 space-y-3 text-sm">
              <div className="bg-card border border-violet-500/20 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">High-Value Claims</p>
                <p className="text-violet-300 font-semibold mt-1">
                  {ipOpportunities.high_value_claims}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">{ipOpportunities.note}</p>
            </div>
          </motion.div>
        )}
      </>
    );
  }

  // AUD-specific patent data
  const audFocus = data.aud_focus;

  return (
    <>
      {audFocus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-amber-500 font-semibold mb-3 text-lg">{audFocus.title}</h3>

          <div className="bg-muted rounded-lg p-6 space-y-4">
            <div className="space-y-3">
              {audFocus.sections?.map((section, idx) => (
                <div key={idx} className="bg-card border border-amber-500/20 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">{section.label}</p>
                  <p className="text-amber-300 font-semibold mt-1">{section.value}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">{audFocus.description}</p>
          </div>
        </motion.div>
      )}
    </>
  );
}

/**
 * Clinical Agent Data Renderer
 */
export function ClinicalDataDisplay({ data, isFirstPrompt }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Clinical" />;
  }

  if (isFirstPrompt) {
    const landscapeOverview = data.landscape_overview;
    const phaseDistribution = data.phase_distribution;
    const sponsorProfile = data.sponsor_profile;

    return (
      <>
        {/* Landscape Overview */}
        {landscapeOverview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-emerald-500 font-semibold mb-3 text-lg">{landscapeOverview.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{landscapeOverview.description}</p>
          </motion.div>
        )}

        {/* Phase Distribution */}
        {phaseDistribution && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-indigo-400 font-semibold mb-3 text-lg">
              {phaseDistribution.title}
            </h3>

            <div className="bg-muted rounded-lg p-6">
              <div className="flex items-center justify-center gap-8">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 200 200" className="transform -rotate-90">
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="30"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="30"
                      strokeDasharray="70 439.82"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="30"
                      strokeDasharray="140 439.82"
                      strokeDashoffset="-70"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="30"
                      strokeDasharray="229.82 439.82"
                      strokeDashoffset="-210"
                    />
                  </svg>
                </div>

                <div className="flex flex-col gap-3 text-sm">
                  {phaseDistribution.data?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded bg-${item.color}-500`}></div>
                      <span className="text-foreground">{item.phase}</span>
                      <span className={`text-${item.color}-400 font-semibold`}>
                        ~{item.count} trials
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{phaseDistribution.description}</p>
          </motion.div>
        )}

        {/* Sponsor Profile */}
        {sponsorProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-teal-400 font-semibold mb-3 text-lg">{sponsorProfile.title}</h3>

            <div className="bg-muted rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-foreground font-semibold">Sponsor</th>
                    <th className="text-center p-3 text-foreground font-semibold">Trial Count</th>
                    <th className="text-left p-3 text-foreground font-semibold">Primary Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsorProfile.data?.map((item, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-3 text-zinc-200 font-medium">{item.sponsor}</td>
                      <td
                        className={`text-center p-3 font-semibold ${idx === 0 ? "text-blue-500" : idx === 1 ? "text-emerald-500" : "text-amber-500"}`}
                      >
                        ~{item.trial_count}
                      </td>
                      <td className="p-3 text-foreground">{item.focus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{sponsorProfile.description}</p>
          </motion.div>
        )}
      </>
    );
  }

  // AUD-specific clinical data
  const audFocus = data.aud_focus;
  const keyTrials = data.key_trials;
  const signalInterpretation = data.signal_interpretation;
  const developmentGaps = data.development_gaps;

  return (
    <>
      {audFocus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-emerald-500 font-semibold mb-3 text-lg">{audFocus.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{audFocus.description}</p>
        </motion.div>
      )}

      {keyTrials && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-indigo-400 font-semibold mb-3 text-lg">{keyTrials.title}</h3>

          <div className="bg-muted rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-foreground font-semibold">Trial ID</th>
                  <th className="text-center p-3 text-foreground font-semibold">Phase</th>
                  <th className="text-left p-3 text-foreground font-semibold">Primary Endpoints</th>
                  <th className="text-left p-3 text-foreground font-semibold">Sponsor</th>
                </tr>
              </thead>
              <tbody>
                {keyTrials.data?.map((trial, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3 text-zinc-200 font-mono">{trial.trial_id}</td>
                    <td className="text-center p-3 text-emerald-500 font-semibold">{trial.phase}</td>
                    <td className="p-3 text-foreground">{trial.primary_endpoints}</td>
                    <td className="p-3 text-foreground">{trial.sponsor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{keyTrials.description}</p>
        </motion.div>
      )}

      {signalInterpretation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-emerald-400 font-semibold mb-3 text-lg">
            {signalInterpretation.title}
          </h3>

          <div className="bg-muted rounded-lg p-6 space-y-3 text-sm">
            <div className="bg-card border border-emerald-500/20 rounded-lg p-4">
              <p className="text-muted-foreground text-xs">Observed Trends</p>
              <p className="text-emerald-300 font-semibold mt-1">
                {signalInterpretation.observed_trends}
              </p>
            </div>

            <p className="text-muted-foreground">{signalInterpretation.description}</p>
          </div>
        </motion.div>
      )}

      {developmentGaps && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-amber-500 font-semibold mb-3 text-lg">{developmentGaps.title}</h3>

          <div className="bg-muted rounded-lg p-6 text-sm space-y-2">
            {developmentGaps.gaps?.map((gap, idx) => (
              <p key={idx} className="text-muted-foreground">
                • {gap}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
}

/**
 * Internal Knowledge Agent Data Renderer
 */
export function InternalKnowledgeDataDisplay({ data, isFirstPrompt }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Internal Knowledge" />;
  }

  if (isFirstPrompt) {
    const strategicSynthesis = data.strategic_synthesis;
    const crossIndicationComparison = data.cross_indication_comparison;

    return (
      <>
        {strategicSynthesis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-pink-500 font-semibold mb-3 text-lg">{strategicSynthesis.title}</h3>

            <div className="bg-muted rounded-lg p-6 text-sm space-y-4">
              {strategicSynthesis.insights?.map((insight, idx) => (
                <div key={idx} className="bg-card border border-pink-500/30 rounded-lg p-4">
                  <p className="text-muted-foreground text-xs">{insight.label}</p>
                  <p className="text-pink-200 font-semibold mt-1">{insight.value}</p>
                </div>
              ))}

              <p className="text-muted-foreground">{strategicSynthesis.description}</p>
            </div>
          </motion.div>
        )}

        {crossIndicationComparison && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-fuchsia-400 font-semibold mb-3 text-lg">
              {crossIndicationComparison.title}
            </h3>

            <div className="bg-muted rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-foreground font-semibold">Dimension</th>
                    <th className="text-center p-3 text-foreground font-semibold">
                      Diabetes / Obesity
                    </th>
                    <th className="text-center p-3 text-foreground font-semibold">
                      Emerging CNS / Behavioral
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {crossIndicationComparison.dimensions?.map((dim, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-3 text-zinc-200 font-medium">{dim.dimension}</td>
                      <td className="text-center p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            dim.diabetes_obesity_level === "green"
                              ? "bg-green-500/20 text-emerald-500"
                              : dim.diabetes_obesity_level === "red"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {dim.diabetes_obesity}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            dim.emerging_cns_level === "green"
                              ? "bg-green-500/20 text-emerald-500"
                              : dim.emerging_cns_level === "red"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {dim.emerging_cns}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{crossIndicationComparison.description}</p>
          </motion.div>
        )}
      </>
    );
  }

  // AUD-specific internal knowledge data
  const audFocus = data.aud_focus;
  const riskFlags = data.risk_flags;

  return (
    <>
      {audFocus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-pink-500 font-semibold mb-3 text-lg">{audFocus.title}</h3>

          <div className="bg-muted rounded-lg p-6 text-sm space-y-4">
            {audFocus.insights?.map((insight, idx) => (
              <div key={idx} className="bg-card border border-pink-500/30 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">{insight.label}</p>
                <p className="text-pink-200 font-semibold mt-1">{insight.value}</p>
              </div>
            ))}

            <p className="text-muted-foreground">{audFocus.description}</p>
          </div>
        </motion.div>
      )}

      {riskFlags && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-fuchsia-400 font-semibold mb-3 text-lg">{riskFlags.title}</h3>

          <div className="bg-muted rounded-lg p-6 text-sm space-y-2">
            {riskFlags.flags?.map((flag, idx) => (
              <p key={idx} className="text-muted-foreground">
                • {flag}
              </p>
            ))}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{riskFlags.description}</p>
        </motion.div>
      )}
    </>
  );
}

/**
 * Report Generator Data Renderer
 */
export function ReportGeneratorDataDisplay({ data, isFirstPrompt, onDownload }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Report Generator" />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-violet-500 font-semibold mb-2 text-lg">{data.title}</h3>
        <p className="mb-3">{data.description}</p>
      </motion.div>

      {data.sections?.map((section, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + idx * 0.2 }}
        >
          <h3 className={`text-${section.color}-400 font-semibold mb-2 text-lg`}>
            {section.title}
          </h3>
          {section.description && <p className="mb-3">{section.description}</p>}

          {section.status === "Finalizing" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-3 mt-4"
            >
              <div className="text-violet-500 text-sm">⏳ Finalizing report for download</div>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDownload}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Report
              </motion.button>
            </motion.div>
          ) : (
            <div className={`text-${section.status === "Complete" ? "green" : "blue"}-400 text-sm`}>
              {section.status === "Complete" ? "✓" : "○"}{" "}
              {section.status === "Complete" ? `${section.title} - Complete` : "In Progress"}
            </div>
          )}
        </motion.div>
      ))}
    </>
  );
}

/**
 * Fallback display when no data is available
 */
function FallbackDisplay({ agentName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-center py-8"
    >
      <p className="text-muted-foreground">No data available from {agentName} agent.</p>
      <p className="text-zinc-500 text-sm mt-2">
        This may indicate the backend API is not responding.
      </p>
    </motion.div>
  );
}

