import { ArrowRight, Check } from 'lucide-react';
import type { LaunchMode, Plan, SiteSettings } from '../types/wellness';

interface MembershipSectionProps {
  plans: Plan[];
  settings: SiteSettings;
  launchMode: LaunchMode;
  onSelectPlan: (plan: Plan) => void;
  onJoinPriorityList: () => void;
}

export function MembershipSection({
  plans,
  settings,
  launchMode,
  onSelectPlan,
  onJoinPriorityList,
}: MembershipSectionProps) {
  const earlyBirdPlan = plans.find((p) => p.slug === 'early-bird');
  const ongoingPlans = plans.filter((p) => p.slug !== 'early-bird');

  const ebTotal = earlyBirdPlan?.total_slots ?? settings.early_bird_total_slots;
  const ebTaken = earlyBirdPlan?.slots_taken ?? settings.early_bird_slots_taken;
  const ebRemaining = Math.max(0, ebTotal - ebTaken);
  const ebFillPct = Math.min(100, Math.round((ebTaken / Math.max(1, ebTotal)) * 100));
  const ebFull = ebTaken >= ebTotal;

  return (
    <section id="membership" className="py-20 bg-[#FAF8F5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#4A7C59] mb-2">
              Stage 03 · Reserve Early Bird &amp; Limited-Slot Plans
            </p>
            <h2 className="font-editorial text-3xl md:text-4xl font-semibold text-[#143628] text-balance">
              {launchMode === 'pre_launch'
                ? 'Reserve your Founding Member Pass for Rs. 100 or lock a weekly batch slot.'
                : 'Choose your weekly cold-pressed dispatch cadence.'}
            </h2>
          </div>
          <p className="text-sm text-[#143628]/70 max-w-sm">
            Every weekly press is strictly capped to guarantee 12-hour harvest-to-door freshness.
          </p>
        </div>

        {/* Pre-Launch Early Bird Card (Rs. 100) */}
        {earlyBirdPlan && (
          <div className="mb-10 bg-[#143628] text-[#FAF8F5] rounded-xl p-7 md:p-9 border border-[#143628]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs font-semibold text-[#C59B27]">
                  Pre-Launch Founding Offer · {earlyBirdPlan.billing_cycle}
                </p>

                <h3 className="font-editorial text-3xl md:text-4xl font-semibold text-[#FAF8F5]">
                  {earlyBirdPlan.name}
                </h3>

                <p className="text-sm md:text-base text-[#FAF8F5]/80 max-w-xl leading-relaxed">
                  Reserve your place before our January 1 batch closes. Upon confirmation, you
                  immediately unlock our private Community Group Invite Link for daily habit
                  challenges and retreat pre-invites.
                </p>

                {/* Live Scarcity Progress Bar */}
                <div className="pt-2 space-y-2 max-w-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#FAF8F5]">
                      Limited Founding Member Passes:{' '}
                      <span className="font-tabular text-[#C59B27] font-semibold">
                        {ebRemaining} of {ebTotal}
                      </span>{' '}
                      Remaining
                    </span>
                    <span className="font-tabular text-[#FAF8F5]/75">{ebFillPct}% claimed</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={ebFillPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Early Bird Founding Member Passes remaining"
                    className="h-2 w-full bg-[#FAF8F5]/15 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-[#C59B27] transition-all duration-300"
                      style={{ width: `${ebFillPct}%` }}
                    />
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {earlyBirdPlan.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2 text-xs md:text-sm text-[#FAF8F5]/90"
                    >
                      <Check className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 lg:border-l lg:border-[#FAF8F5]/15 lg:pl-8 flex flex-col justify-between gap-5">
                <div>
                  <p className="text-xs text-[#FAF8F5]/70">Founding Reservation</p>
                  <p className="font-tabular text-4xl font-semibold text-[#FAF8F5] mt-1">
                    Rs. {earlyBirdPlan.price_pkr.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#FAF8F5]/75 mt-1">
                    Includes {earlyBirdPlan.shots_per_delivery} cold-pressed shots on launch +
                    immediate Community Group access
                  </p>
                </div>

                {ebFull ? (
                  <button
                    type="button"
                    onClick={onJoinPriorityList}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#143628] bg-[#FAF8F5]/90 rounded-md hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    <span>Batch Full — Join Next Week&apos;s Priority List</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectPlan(earlyBirdPlan)}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#143628] bg-[#FAF8F5] rounded-md hover:bg-[#F2EFE9] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Reserve My Spot — Rs. {earlyBirdPlan.price_pkr}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3 Subscription Tiers (Weekly, Bi-Weekly, Monthly) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ongoingPlans.map((plan) => {
            const remaining = Math.max(0, plan.total_slots - plan.slots_taken);
            const isFull = plan.slots_taken >= plan.total_slots;
            return (
              <article
                key={plan.id}
                className="flex flex-col justify-between bg-white border border-[#143628]/12 rounded-xl p-6 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-xs text-[#4A7C59] font-medium">
                    {plan.billing_cycle} ·{' '}
                    <span className="font-tabular">{plan.shots_per_delivery}</span> shots
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-[#143628] mt-1.5">
                    {plan.name}
                  </h3>

                  <div className="mt-4 pb-5 border-b border-[#143628]/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-tabular text-2xl font-semibold text-[#143628]">
                        Rs. {plan.price_pkr.toLocaleString()}
                      </p>
                      <span className="font-tabular text-xs text-[#143628]/60">
                        {plan.slots_taken}/{plan.total_slots} filled
                      </span>
                    </div>
                    <p
                      className={`text-xs font-medium mt-2 ${
                        isFull ? 'text-red-700' : 'text-[#4A7C59]'
                      }`}
                    >
                      {isFull
                        ? 'Batch Full for Next Dispatch'
                        : `${remaining} Slots Left for Next Week's Dispatch`}
                    </p>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-[#143628]/80">
                        <Check className="w-4 h-4 text-[#4A7C59] shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  {isFull ? (
                    <button
                      type="button"
                      onClick={onJoinPriorityList}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-[#143628]/70 bg-[#F2EFE9] border border-[#143628]/15 rounded-md hover:border-[#143628]/35 transition-colors cursor-pointer"
                    >
                      <span>Batch Full — Join Next Week&apos;s Priority List</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectPlan(plan)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-[#143628] bg-[#F2EFE9] border border-[#143628]/15 rounded-md hover:bg-[#143628] hover:text-[#FAF8F5] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>
                        {launchMode === 'pre_launch'
                          ? `Reserve ${plan.name}`
                          : `Subscribe — Rs. ${plan.price_pkr.toLocaleString()}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
