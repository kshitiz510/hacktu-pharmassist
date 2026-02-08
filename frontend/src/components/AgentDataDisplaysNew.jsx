/**
 * Unified Agent Data Displays
 *
 * Beautiful, consistent displays for all agent outputs using shadcn components.
 * All metric cards have uniform dimensions for visual consistency.
 */

import React from "react";
import { motion } from "framer-motion";
import { MetricCard, DataTable, InfoCard, SectionHeader, SummaryBanner, SuggestedPrompts } from "@/components/ui/metric-card";
import {
  TrendingUp,
  Globe,
  Shield,
  Activity,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  DollarSign,
  Package,
  MapPin,
  Calendar,
  Microscope,
  Building,
  Scale,
  BarChart3,
  PieChart,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// IQVIA AGENT DISPLAY - Comprehensive Market Intelligence
// ============================================================================

export function IQVIADataDisplay({ data, isFirstPrompt, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="IQVIA" icon={TrendingUp} color="blue" />;
  }

  // Data can be at top level or nested in .data
  const actualData = data.data || data;
  
  const marketForecast = actualData.market_forecast || data.market_forecast;
  const competitiveShare = actualData.competitive_share || data.competitive_share;
  const marketOverview = actualData.market_overview || data.market_overview;
  const summary = actualData.summary || data.summary;
  const suggestedNextPrompts = actualData.suggestedNextPrompts || data.suggestedNextPrompts;
  const infographics = actualData.infographics || data.infographics || [];
  const cagrAnalysis = actualData.cagr_analysis || data.cagr_analysis;
  const marketSizeUSD = actualData.marketSizeUSD || data.marketSizeUSD;
  const cagrPercent = actualData.cagrPercent || data.cagrPercent;
  const totalGrowthPercent = actualData.totalGrowthPercent || data.totalGrowthPercent;
  const marketLeader = actualData.marketLeader || data.marketLeader;
  const topArticles = actualData.topArticles || data.topArticles || [];
  const dataAvailability = actualData.dataAvailability || {};

  // Parse share value helper
  const parseShareValue = (share) => {
    if (!share) return 0;
    if (typeof share === 'number') return share;
    const cleaned = String(share).replace(/[~%]/g, '').trim();
    return parseFloat(cleaned) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      {summary && <SummaryBanner summary={summary} color="blue" />}

      {/* Key Metrics Row */}
      {(marketSizeUSD || cagrPercent || marketLeader) && (
        <div>
          <SectionHeader title="Market Overview" icon={BarChart3} color="blue" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {marketSizeUSD && (
              <MetricCard
                label="Market Size"
                value={typeof marketSizeUSD === 'number' ? `$${marketSizeUSD.toFixed(1)}` : marketSizeUSD}
                unit="B"
                color="blue"
                icon={DollarSign}
                delay={0}
              />
            )}
            {cagrPercent && (
              <MetricCard
                label="CAGR"
                value={typeof cagrPercent === 'number' ? cagrPercent.toFixed(1) : cagrPercent}
                unit="%"
                color="emerald"
                icon={TrendingUp}
                trend={cagrPercent > 5 ? "up" : "neutral"}
                delay={1}
              />
            )}
            {totalGrowthPercent && (
              <MetricCard
                label="Total Growth"
                value={typeof totalGrowthPercent === 'number' ? totalGrowthPercent.toFixed(1) : totalGrowthPercent}
                unit="%"
                color="teal"
                icon={Activity}
                delay={2}
              />
            )}
            {marketLeader && (
              <MetricCard
                label="Market Leader"
                value={marketLeader.therapy}
                subValue={marketLeader.share}
                color="violet"
                icon={Building}
                delay={3}
              />
            )}
          </div>
        </div>
      )}

      {/* Market Forecast Chart */}
      {marketForecast?.data && marketForecast.data.length > 0 && (
        <div>
          <SectionHeader 
            title={marketForecast.title || "Market Growth Trajectory"} 
            icon={TrendingUp} 
            color="blue" 
          />
          
          <div className="bg-card border border-border rounded-xl p-6">
            {/* Line Chart Visualization */}
            <div className="relative h-56 w-full">
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-muted-foreground">
                {[...Array(5)].map((_, i) => {
                  const maxVal = Math.max(...marketForecast.data.map(d => d.value || 0));
                  const val = maxVal - (maxVal / 4) * i;
                  return <span key={i}>${val.toFixed(0)}B</span>;
                })}
              </div>
              
              {/* Chart */}
              <div className="ml-14 h-full relative">
                <svg className="w-full h-[calc(100%-2rem)]" viewBox="0 0 400 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="iqviaLineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid */}
                  {[...Array(5)].map((_, i) => (
                    <line key={i} x1="0" y1={i * 45} x2="400" y2={i * 45} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4"/>
                  ))}
                  
                  {/* Chart Path */}
                  {(() => {
                    const maxVal = Math.max(...marketForecast.data.map(d => d.value || 0));
                    const points = marketForecast.data.map((d, i) => {
                      const x = (i / (marketForecast.data.length - 1)) * 400;
                      const y = 180 - ((d.value || 0) / maxVal) * 160;
                      return `${x},${y}`;
                    });
                    return (
                      <>
                        <path d={`M 0,180 L ${points.join(' L ')} L 400,180 Z`} fill="url(#iqviaLineGradient)" />
                        <path d={`M ${points.join(' L ')}`} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                        {marketForecast.data.map((d, i) => {
                          const x = (i / (marketForecast.data.length - 1)) * 400;
                          const y = 180 - ((d.value || 0) / maxVal) * 160;
                          return <circle key={i} cx={x} cy={y} r="5" fill="#38bdf8" stroke="white" strokeWidth="2" />;
                        })}
                      </>
                    );
                  })()}
                </svg>
                
                {/* X-axis Labels */}
                <div className="flex justify-between mt-2 text-xs">
                  {marketForecast.data.map((d, i) => (
                    <div key={i} className="text-center">
                      <div className="font-medium text-foreground">{d.year}</div>
                      <div className="text-sky-400 font-semibold">${d.value}B</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {marketForecast.description && (
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
                {marketForecast.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Competitive Share */}
      {competitiveShare?.data && competitiveShare.data.length > 0 && (
        <div>
          <SectionHeader 
            title={competitiveShare.title || "Competitive Landscape"} 
            icon={PieChart} 
            color="emerald" 
          />
          
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div className="flex items-center justify-center">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let currentAngle = 0;
                      const colors = ['#38bdf8', '#2dd4bf', '#a78bfa', '#fbbf24', '#818cf8'];
                      return competitiveShare.data.map((item, idx) => {
                        const share = parseShareValue(item.share);
                        const angle = (share / 100) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;
                        const x1 = 50 + 38 * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = 50 + 38 * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = 50 + 38 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                        const y2 = 50 + 38 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                        const largeArc = angle > 180 ? 1 : 0;
                        return (
                          <path
                            key={idx}
                            d={`M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={colors[idx % colors.length]}
                            stroke="var(--background)"
                            strokeWidth="1.5"
                          />
                        );
                      });
                    })()}
                    <circle cx="50" cy="50" r="24" fill="var(--card)" />
                  </svg>
                </div>
              </div>
              
              {/* Legend */}
              <div className="space-y-2">
                {competitiveShare.data.map((item, idx) => {
                  const colors = ['bg-sky-400', 'bg-teal-400', 'bg-violet-400', 'bg-amber-400', 'bg-indigo-400'];
                  const textColors = ['text-sky-400', 'text-teal-400', 'text-violet-400', 'text-amber-400', 'text-indigo-400'];
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`}></div>
                        <span className="text-sm text-foreground">{item.company}</span>
                      </div>
                      <span className={`text-sm font-semibold ${textColors[idx % textColors.length]}`}>{item.share}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Market Research Articles */}
      {(topArticles.length > 0 || infographics.length > 0) && (
        <div>
          <SectionHeader 
            title="Market Research & Insights" 
            badge={`${topArticles.length || infographics.length} sources`}
            icon={FileText}
            color="cyan" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(topArticles.length > 0 ? topArticles : infographics).slice(0, 6).map((item, idx) => (
              <motion.a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg hover:border-cyan-400/40 transition-all"
              >
                <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-cyan-400 transition-colors">
                  {item.title}
                </p>
                {(item.snippet || item.subtitle) && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.snippet || item.subtitle}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="text-cyan-400 font-medium">{item.source || 'Statista'}</span>
                  {item.premium && (
                    <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">Premium</span>
                  )}
                  <ExternalLink size={12} className="ml-auto opacity-50 group-hover:opacity-100" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="blue" />
      )}
    </div>
  );
}

// ============================================================================
// EXIM AGENT DISPLAY
// ============================================================================

export function EXIMDataDisplay({ data, showChart, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="EXIM" icon={Globe} color="teal" />;
  }

  // Handle visualizations array format
  if (data.visualizations && Array.isArray(data.visualizations)) {
    return null; // Rendered by visualization system
  }

  // Handle summary metrics format (old format)
  const summaryMetrics = data.summary;
  const tradeVolume = data.trade_volume;
  const importDependency = data.import_dependency;
  
  // New canonical format
  const bannerSummary = data.summary?.researcherQuestion ? data.summary : null;
  const suggestedNextPrompts = data.suggestedNextPrompts;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {bannerSummary && <SummaryBanner summary={bannerSummary} color="teal" />}

      {/* Summary Metrics - Fixed grid */}
      {summaryMetrics && !bannerSummary && (
        <div>
          <SectionHeader title="Export-Import Summary" color="teal" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {summaryMetrics.total_export_value && (
              <MetricCard
                label="Total Export Value (2024-25)"
                value={summaryMetrics.total_export_value}
                unit="USD Mn"
                color="teal"
                icon={DollarSign}
                delay={0}
              />
            )}
            {summaryMetrics.yoy_growth !== undefined && (
              <MetricCard
                label="Year-on-Year Growth"
                value={summaryMetrics.yoy_growth}
                unit="%"
                color="teal"
                icon={TrendingUp}
                delay={1}
              />
            )}
            {summaryMetrics.trading_partners_count && (
              <MetricCard
                label="Trading Partners Analyzed"
                value={summaryMetrics.trading_partners_count}
                color="teal"
                icon={Users}
                delay={2}
              />
            )}
            {summaryMetrics.supply_concentration !== undefined && (
              <MetricCard
                label="Supply Concentration (HHI)"
                value={summaryMetrics.supply_concentration}
                color="amber"
                icon={Package}
                delay={3}
              />
            )}
            {summaryMetrics.import_dependency_ratio !== undefined && (
              <MetricCard
                label="Import Dependency Ratio"
                value={summaryMetrics.import_dependency_ratio}
                color="amber"
                icon={Scale}
                delay={4}
              />
            )}
          </div>
        </div>
      )}

      {/* Trade Volume Table */}
      {tradeVolume && tradeVolume.data && (
        <div>
          <SectionHeader title={tradeVolume.title || "Trade Volume"} color="teal" />
          <DataTable
            headers={["Country", "Q2 2024", "Q3 2024", "Growth"]}
            rows={tradeVolume.data.map((item) => [
              item.country,
              item.q2_2024,
              item.q3_2024,
              <span key="growth" className="text-emerald-400 font-medium">
                {item.qoq_growth}
              </span>,
            ])}
            color="teal"
          />
        </div>
      )}

      {/* Import Dependency */}
      {importDependency && importDependency.data && (
        <div>
          <SectionHeader title={importDependency.title || "Import Dependency"} color="amber" />
          <DataTable
            headers={["Region", "Dependency", "Sources", "Risk"]}
            rows={importDependency.data.map((item) => [
              item.region,
              item.dependency_percent,
              item.primary_sources,
              <RiskBadge key="risk" level={item.risk_level} />,
            ])}
            color="amber"
          />
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="teal" />
      )}
    </div>
  );
}

// ============================================================================
// PATENT AGENT DISPLAY
// ============================================================================

export function PatentDataDisplay({ data, isFirstPrompt, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Patent" icon={Shield} color="amber" />;
  }

  // Handle visualizations array format
  if (data.visualizations && Array.isArray(data.visualizations)) {
    return null; // Rendered by visualization system
  }

  const landscapeOverview = data.landscape_overview;
  const filingHeatmap = data.filing_heatmap;
  const keyPatentExtract = data.key_patent_extract;
  const ipOpportunities = data.ip_opportunities;
  const audFocus = data.aud_focus;
  
  // New canonical format
  const bannerSummary = data.bannerSummary;
  const suggestedNextPrompts = data.suggestedNextPrompts;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {bannerSummary && <SummaryBanner summary={bannerSummary} color="amber" />}

      {/* Landscape Overview */}
      {landscapeOverview && (
        <div>
          <SectionHeader title={landscapeOverview.title || "Patent Landscape"} color="amber" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {landscapeOverview.sections?.map((section, idx) => (
              <MetricCard
                key={idx}
                label={section.label}
                value={section.value}
                color="amber"
                delay={idx}
              />
            ))}
          </div>
          {landscapeOverview.description && (
            <p className="mt-3 text-sm text-muted-foreground">{landscapeOverview.description}</p>
          )}
        </div>
      )}

      {/* Filing Heatmap */}
      {filingHeatmap && filingHeatmap.data && (
        <div>
          <SectionHeader title={filingHeatmap.title || "Filing Distribution"} color="amber" />
          <div className="grid grid-cols-4 gap-3">
            {filingHeatmap.data.map((item, idx) => (
              <MetricCard
                key={idx}
                label={item.region}
                value={item.count}
                color={
                  item.color === "blue"
                    ? "blue"
                    : item.color === "green"
                      ? "emerald"
                      : item.color === "orange"
                        ? "amber"
                        : "violet"
                }
                delay={idx}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Key Patent Extract */}
      {keyPatentExtract && (
        <div>
          <SectionHeader title={keyPatentExtract.title || "Key Patent"} color="violet" />
          <InfoCard
            icon={Shield}
            title={keyPatentExtract.patent_number}
            content={keyPatentExtract.description}
            items={keyPatentExtract.risk_note ? [`⚠ Risk: ${keyPatentExtract.risk_note}`] : []}
            color="violet"
          />
        </div>
      )}

      {/* IP Opportunities */}
      {ipOpportunities && (
        <div>
          <SectionHeader title={ipOpportunities.title || "IP Opportunities"} color="violet" />
          <InfoCard
            title="High-Value Claims"
            content={ipOpportunities.high_value_claims}
            items={ipOpportunities.note ? [ipOpportunities.note] : []}
            color="violet"
          />
        </div>
      )}

      {/* AUD Focus */}
      {audFocus && (
        <div>
          <SectionHeader title={audFocus.title || "AUD Focus"} color="amber" />
          <div className="grid grid-cols-2 gap-3">
            {audFocus.sections?.map((section, idx) => (
              <MetricCard
                key={idx}
                label={section.label}
                value={section.value}
                color="amber"
                delay={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="amber" />
      )}
    </div>
  );
}

// ============================================================================
// CLINICAL AGENT DISPLAY
// ============================================================================

export function ClinicalDataDisplay({ data, isFirstPrompt, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Clinical" icon={Activity} color="emerald" />;
  }

  const landscapeOverview = data.landscape_overview;
  const phaseDistribution = data.phase_distribution;
  const sponsorProfile = data.sponsor_profile;
  const keyTrials = data.key_trials;
  
  // New canonical format
  const bannerSummary = data.summary;
  const suggestedNextPrompts = data.suggestedNextPrompts;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {bannerSummary && bannerSummary.researcherQuestion && (
        <SummaryBanner summary={bannerSummary} color="emerald" />
      )}

      {/* Landscape Overview */}
      {landscapeOverview && (
        <InfoCard
          icon={Activity}
          title={landscapeOverview.title || "Clinical Landscape"}
          content={landscapeOverview.description}
          color="emerald"
        />
      )}

      {/* Phase Distribution */}
      {phaseDistribution && phaseDistribution.data && (
        <div>
          <SectionHeader title={phaseDistribution.title || "Phase Distribution"} color="emerald" />
          <div className="grid grid-cols-3 gap-3">
            {phaseDistribution.data.map((item, idx) => (
              <MetricCard
                key={idx}
                label={item.phase}
                value={`~${item.count}`}
                unit="trials"
                color={
                  item.color === "blue" ? "blue" : item.color === "green" ? "emerald" : "amber"
                }
                delay={idx}
              />
            ))}
          </div>
          {phaseDistribution.description && (
            <p className="mt-3 text-sm text-muted-foreground">{phaseDistribution.description}</p>
          )}
        </div>
      )}

      {/* Sponsor Profile */}
      {sponsorProfile && sponsorProfile.data && (
        <div>
          <SectionHeader title={sponsorProfile.title || "Sponsor Profile"} color="teal" />
          <DataTable
            headers={["Sponsor", "Trials", "Focus"]}
            rows={sponsorProfile.data.map((item, idx) => [
              item.sponsor,
              <span
                key="count"
                className={
                idx === 0 ? "text-sky-400" : idx === 1 ? "text-emerald-400" : "text-amber-400"
                }
              >
                ~{item.trial_count}
              </span>,
              item.focus,
            ])}
            color="teal"
          />
        </div>
      )}

      {/* Key Trials */}
      {keyTrials && keyTrials.data && (
        <div>
          <SectionHeader title={keyTrials.title || "Key Trials"} color="emerald" />
          <DataTable
            headers={["Trial ID", "Phase", "Endpoints", "Sponsor"]}
            rows={keyTrials.data.map((trial) => [
              trial.trial_id,
              trial.phase,
              trial.primary_endpoints,
              trial.sponsor,
            ])}
            color="emerald"
            compact
          />
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="emerald" />
      )}
    </div>
  );
}

// ============================================================================
// INTERNAL KNOWLEDGE AGENT DISPLAY
// ============================================================================

export function InternalKnowledgeDisplay({ data, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Internal Knowledge" icon={BookOpen} color="cyan" />;
  }

  const pastResearch = data.past_research;
  const companyMemory = data.company_memory;
  const documents = data.documents;
  
  // New canonical format
  const bannerSummary = data.summary;
  const suggestedNextPrompts = data.suggestedNextPrompts;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {bannerSummary && bannerSummary.researcherQuestion && (
        <SummaryBanner summary={bannerSummary} color="cyan" />
      )}

      {/* Past Research */}
      {pastResearch && (
        <div>
          <SectionHeader title={pastResearch.title || "Past Research"} color="cyan" />
          {pastResearch.studies && (
            <div className="space-y-3">
              {pastResearch.studies.map((study, idx) => (
                <InfoCard
                  key={idx}
                  icon={Microscope}
                  title={study.title}
                  content={study.summary || study.findings}
                  items={study.key_findings || []}
                  color="cyan"
                  delay={idx}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Company Memory */}
      {companyMemory && (
        <div>
          <SectionHeader title={companyMemory.title || "Company Knowledge"} color="cyan" />
          <div className="grid grid-cols-2 gap-3">
            {companyMemory.items?.map((item, idx) => (
              <MetricCard
                key={idx}
                label={item.label}
                value={item.value}
                color="cyan"
                delay={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents && documents.length > 0 && (
        <div>
          <SectionHeader
            title="Related Documents"
            badge={`${documents.length} found`}
            color="cyan"
          />
          <div className="space-y-2">
            {documents.slice(0, 5).map((doc, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20"
              >
                <FileText className="text-cyan-400 flex-shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.date || doc.type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="cyan" />
      )}
    </div>
  );
}

// ============================================================================
// WEB INTELLIGENCE AGENT DISPLAY
// ============================================================================

export function WebIntelDisplay({ data, onPromptClick }) {
  if (!data || Object.keys(data).length === 0) {
    return <FallbackDisplay agentName="Web Intelligence" icon={Globe} color="indigo" />;
  }

  // Data can be at top level or nested in .data
  const actualData = data.data || data;
  
  // Extract data with fallbacks - check both levels
  const newsArticles = actualData.news_articles || actualData.news || data.news_articles || data.news || [];
  const forumQuotes = actualData.forum_quotes || actualData.forums || data.forum_quotes || data.forums || [];
  const recommendedActions = actualData.recommended_actions || actualData.recommendations || data.recommended_actions || data.recommendations || [];
  const confidence = actualData.confidence || data.confidence;
  const sentimentSummary = actualData.sentiment_summary || data.sentiment_summary;
  
  // New canonical format - check both levels
  const bannerSummary = actualData.summary || data.summary;
  const suggestedNextPrompts = actualData.suggestedNextPrompts || data.suggestedNextPrompts;
  
  // Check if we have any content to display
  const hasContent = newsArticles.length > 0 || forumQuotes.length > 0 || recommendedActions.length > 0 || sentimentSummary;
  
  // Debug logging
  console.log('[WebIntelDisplay] data:', data);
  console.log('[WebIntelDisplay] actualData:', actualData);
  console.log('[WebIntelDisplay] newsArticles:', newsArticles);
  console.log('[WebIntelDisplay] forumQuotes:', forumQuotes);
  console.log('[WebIntelDisplay] sentimentSummary:', sentimentSummary);

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {bannerSummary && bannerSummary.researcherQuestion && (
        <SummaryBanner summary={bannerSummary} color="indigo" />
      )}

      {/* Sentiment Summary */}
      {sentimentSummary && (
        <div>
          <SectionHeader title="Sentiment Analysis" color="indigo" />
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Positive"
              value={sentimentSummary.positive || 0}
              unit="%"
              color="emerald"
              delay={0}
            />
            <MetricCard
              label="Neutral"
              value={sentimentSummary.neutral || 0}
              unit="%"
              color="teal"
              delay={1}
            />
            <MetricCard
              label="Negative"
              value={sentimentSummary.negative || 0}
              unit="%"
              color="amber"
              delay={2}
            />
          </div>
        </div>
      )}

      {/* News Articles */}
      {newsArticles.length > 0 && (
        <div>
          <SectionHeader
            title="Recent News"
            badge={`${newsArticles.length} articles`}
            color="indigo"
          />
          <div className="space-y-2">
            {newsArticles.slice(0, 4).map((article, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
              >
                <p className="text-sm font-medium text-foreground line-clamp-1">{article.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  {article.source && (
                    <span className="text-indigo-400 font-medium">{article.source}</span>
                  )}
                  {article.publishedAt && (
                    <>
                      <span>•</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Forum Discussions */}
      {forumQuotes.length > 0 && (
        <div>
          <SectionHeader
            title="Community Discussions"
            badge={`${forumQuotes.length} posts`}
            color="amber"
          />
          <div className="space-y-2">
            {forumQuotes.slice(0, 3).map((forum, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
              >
                <p className="text-sm text-muted-foreground italic line-clamp-2">"{forum.quote}"</p>
                <div className="flex items-center gap-2 mt-2">
                  {forum.site && (
                    <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      {forum.site}
                    </span>
                  )}
                  {forum.sentiment && <SentimentBadge sentiment={forum.sentiment} />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <InfoCard
          icon={CheckCircle}
          title="Recommended Actions"
          items={recommendedActions}
          color="violet"
        />
      )}

      {/* Confidence Level */}
      {confidence && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm text-muted-foreground">Analysis Confidence</span>
          <ConfidenceBadge level={confidence} />
        </div>
      )}

      {/* Suggested Next Prompts */}
      {suggestedNextPrompts && (
        <SuggestedPrompts prompts={suggestedNextPrompts} onPromptClick={onPromptClick} color="cyan" />
      )}
      
      {/* Fallback message if no content */}
      {!hasContent && !bannerSummary && (
        <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-center">
          <Globe className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Web intelligence analysis complete. No specific articles or discussions found for this query.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RiskBadge({ level }) {
  const styles = {
    High: "bg-red-500/20 text-red-400",
    Medium: "bg-yellow-500/20 text-yellow-400",
    Low: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles[level] || styles.Medium}`}>
      {level}
    </span>
  );
}

function SentimentBadge({ sentiment }) {
  const styles = {
    POS: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Positive" },
    NEG: { bg: "bg-red-500/10", text: "text-red-400", label: "Negative" },
    NEU: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Neutral" },
  };

  const style = styles[sentiment] || styles.NEU;

  return (
    <span className={`text-xs font-medium ${style.bg} ${style.text} px-2 py-0.5 rounded`}>
      {style.label}
    </span>
  );
}

function ConfidenceBadge({ level }) {
  const styles = {
    HIGH: "bg-emerald-500/20 text-emerald-400",
    MEDIUM: "bg-yellow-500/20 text-yellow-400",
    LOW: "bg-orange-500/20 text-orange-400",
  };

  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[level] || styles.MEDIUM}`}
    >
      {level}
    </span>
  );
}

function FallbackDisplay({ agentName, icon: Icon = Shield, color = "blue" }) {
  const colorStyles = {
    blue: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    pink: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <div
        className={`w-16 h-16 rounded-2xl ${colorStyles[color]} border flex items-center justify-center mb-4`}
      >
        <Icon size={28} />
      </div>
      <h3 className="text-foreground font-semibold text-lg mb-2">No Data Available</h3>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        The {agentName} agent hasn't returned any data yet.
      </p>
    </motion.div>
  );
}