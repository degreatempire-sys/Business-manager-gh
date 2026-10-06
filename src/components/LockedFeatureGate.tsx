import React from 'react';
import { Lock, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import {
  FeatureKey,
  canAccessFeature,
  getFeatureAccessStatus,
  PLAN_PRICES_GHS,
  PLAN_DISPLAY_NAMES,
} from '../utils/featureAccess';

interface LockedFeatureGateProps {
  feature: FeatureKey;
  subscription?: any;
  business?: any;
  isMasterAdmin?: boolean;
  onNavigateToUpgrade: () => void;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const LockedFeatureGate: React.FC<LockedFeatureGateProps> = ({
  feature,
  subscription,
  business,
  isMasterAdmin = false,
  onNavigateToUpgrade,
  children,
  fallbackTitle,
  fallbackDescription,
}) => {
  const status = getFeatureAccessStatus(subscription, feature, isMasterAdmin, business);

  // If user has access (or is Master Admin), render children directly
  if (status.allowed) {
    return <>{children}</>;
  }

  const { requiredPlan, requiredPlanName, currentPlanName, requiredPrice, featureMeta } = status;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-fadeIn">
      {/* Container with refined borders and padding */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-5">
          {/* Lock Badge */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
              🔒 Feature Restricted &bull; Requires {requiredPlanName}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {fallbackTitle || `This feature requires the ${requiredPlanName}`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {fallbackDescription ||
                `Upgrade your subscription to unlock ${featureMeta.name} and enhance your business operations.`}
            </p>
          </div>

          {/* Current vs Required Plan Summary Pill */}
          <div className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Plan</span>
              <span className="font-bold text-slate-300">{currentPlanName}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Required</span>
              <span className="font-bold text-emerald-400">
                {requiredPlanName} (GH₵{requiredPrice}/mo)
              </span>
            </div>
          </div>

          {/* Feature Highlights included in required tier */}
          {featureMeta.highlights && featureMeta.highlights.length > 0 && (
            <div className="w-full text-left bg-slate-950/50 rounded-2xl p-4 border border-slate-800/60 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Included in {requiredPlanName}:
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                {featureMeta.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-800/80 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <div className="w-full pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onNavigateToUpgrade}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                Upgrade to {requiredPlanName} (GH₵{requiredPrice}/mo)
              </span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Powered by Paystack &bull; Instant activation via Mobile Money (MTN, Telecel, AT) & Cards.
          </p>
        </div>
      </div>
    </div>
  );
};
