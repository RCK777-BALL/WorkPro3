/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';

import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import ProgressBar from '@/components/common/ProgressBar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { PmOptimizationAssetInsight, PmOptimizationScenario } from '@/api/pmOptimization';
import { usePmWhatIfSimulations } from './hooks';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const formatNumber = (value: number) => value.toFixed(1);

const getRiskLabel = (probability: number) => {
  if (probability >= 0.6) return 'High risk';
  if (probability >= 0.35) return 'Elevated risk';
  return 'Low risk';
};

const getComplianceLabel = (impactScore: number) => {
  if (impactScore >= 0.6) return 'High impact';
  if (impactScore >= 0.3) return 'Moderate impact';
  return 'Stable';
};

const ScenarioCard = ({ scenario }: { scenario: PmOptimizationScenario }) => (
  <Card title={scenario.label} subtitle={scenario.description} className="bg-slate-900/80">
    <div className="space-y-3 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <span>Interval delta</span>
        <span className="font-semibold">{(scenario.intervalDelta * 100).toFixed(0)}%</span>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Predicted failure probability</span>
          <span className="font-semibold text-slate-100">{formatPercent(scenario.failureProbability)}</span>
        </div>
        <ProgressBar value={scenario.failureProbability * 100} max={100} className="h-1.5 mt-1" barClassName="bg-rose-500" />
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Compliance</span>
          <span className="font-semibold text-slate-100">{scenario.compliancePercentage.toFixed(1)}%</span>
        </div>
        <ProgressBar value={scenario.compliancePercentage} max={100} className="h-1.5 mt-1" barClassName="bg-emerald-500" />
      </div>
    </div>
  </Card>
);

const projectFailure = (insight: PmOptimizationAssetInsight, deltaPercent: number) => {
  const delta = deltaPercent / 100;
  const factor = delta >= 0 ? 1 + delta * 1.2 : 1 + delta * 0.6;
  return clamp(insight.failureProbability * factor, 0, 1);
};

const projectCompliance = (insight: PmOptimizationAssetInsight, deltaPercent: number) => {
  const delta = deltaPercent / 100;
  const factor = 1 - delta * 0.9;
  return clamp(insight.compliance.percentage * factor, 0, 100);
};

const projectImpact = (insight: PmOptimizationAssetInsight, deltaPercent: number) => {
  const delta = deltaPercent / 100;
  return clamp(insight.compliance.impactScore + delta * 0.5, 0, 1);
};

export default function WhatIfSimulationsPage() {
  const { data, isLoading, isError, refetch } = usePmWhatIfSimulations();
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const assets = useMemo(
    () =>
      (data?.assets ?? [])
        .slice()
        .sort((a, b) => b.failureProbability - a.failureProbability),
    [data?.assets],
  );

  const lastUpdated = data?.updatedAt ? new Date(data.updatedAt) : undefined;
  const hasAdjustments = useMemo(() => Object.values(adjustments).some((value) => value !== 0), [adjustments]);

  const handleChange = (assetId: string, value: number) => {
    setAdjustments((prev) => ({ ...prev, [assetId]: value }));
  };

  const handleReset = () => setAdjustments({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">PM optimization what-if simulations</h1>
        <p className="mt-1 text-sm text-slate-300">
          Blend usage metrics, predicted failure probability, and compliance risk to see how interval tweaks impact your PM
          program before changing the schedule.
        </p>
        {lastUpdated && (
          <p className="mt-2 text-xs text-slate-500">Last refreshed {lastUpdated.toLocaleString()}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data?.scenarios?.map((scenario) => (
          <ScenarioCard key={scenario.label} scenario={scenario} />
        ))}
      </div>

      <Card
        title="Asset-level adjustments"
        subtitle="Model the impact of accelerating or deferring preventive work on each critical asset"
        headerActions={
          <Button variant="secondary" onClick={handleReset} disabled={!hasAdjustments}>
            Reset adjustments
          </Button>
        }
      >
        {isLoading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        )}
        {isError && !isLoading && (
          <div className="space-y-3 text-sm text-slate-200">
            <p>We couldn’t load the simulation data right now.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        )}
        {!isLoading && !isError && assets.length === 0 && (
          <p className="text-sm text-slate-300">No PM compliance history found. Run the scheduler to generate baseline data.</p>
        )}
        {!isLoading && !isError && assets.length > 0 && (
          <div className="space-y-4">
            {assets.map((asset) => {
              const delta = adjustments[asset.assetId] ?? 0;
              const projectedFailure = projectFailure(asset, delta);
              const projectedCompliance = projectCompliance(asset, delta);
              const projectedImpact = projectImpact(asset, delta);
              return (
                <div
                  key={asset.assetId}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-100">{asset.assetName ?? 'Unassigned asset'}</p>
                      <p className="text-xs text-slate-400">
                        Usage · {formatNumber(asset.usage.runHoursPerDay)} h/day · {formatNumber(asset.usage.cyclesPerDay)} cycles/day
                      </p>
                    </div>
                    <Badge text={getRiskLabel(projectedFailure)} type="status" />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Interval change</span>
                        <span className="font-semibold text-slate-100">{delta.toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        step={5}
                        value={delta}
                        onChange={(event) => handleChange(asset.assetId, Number(event.target.value))}
                        className="mt-2 w-full accent-indigo-400"
                        aria-label={`Adjust interval for ${asset.assetName ?? 'asset'}`}
                      />
                      <div className="mt-1 flex justify-between text-[0.65rem] uppercase tracking-wide text-slate-500">
                        <span>Accelerate</span>
                        <span>Defer</span>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-slate-200">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Predicted failure probability</span>
                          <span className="font-semibold text-slate-100">{formatPercent(projectedFailure)}</span>
                        </div>
                        <ProgressBar
                          value={projectedFailure * 100}
                          max={100}
                          className="mt-1 h-1.5"
                          barClassName="bg-rose-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Compliance</span>
                          <span className="font-semibold text-slate-100">{projectedCompliance.toFixed(1)}%</span>
                        </div>
                        <ProgressBar
                          value={projectedCompliance}
                          max={100}
                          className="mt-1 h-1.5"
                          barClassName="bg-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Compliance impact</span>
                        <Badge text={getComplianceLabel(projectedImpact)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
