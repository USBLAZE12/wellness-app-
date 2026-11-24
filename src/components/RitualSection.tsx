import { useEffect, useState } from 'react';
import { Calendar, Compass, Leaf, Truck } from 'lucide-react';
import type { HealthGoal, WellnessProduct } from '../types/wellness';

const MEMBER_BENEFITS = [
  {
    icon: Truck,
    title: 'Weekly Doorstep Cold-Chain Dispatch',
    detail:
      'Every Monday morning before 08:00 AM, seven sealed 60ml glass shots arrive at your doorstep in a 4°C insulated crate—zero grocery runs or prep friction.',
  },
  {
    icon: Compass,
    title: 'Private 30-Day Community Challenges',
    detail:
      'Build consistency alongside grounded peers through guided circadian hydration, morning movement prompts, and weekly habit accountability check-ins.',
  },
  {
    icon: Calendar,
    title: 'Early Retreat & Gathering Invites',
    detail:
      'Priority seat allocation for sunrise breathwork immersions in Nathia Gali, courtyard wellness tables in Lahore, and Clifton studio workshops.',
  },
];

interface RitualSectionProps {
  initialGoal?: HealthGoal;
  products: WellnessProduct[];
}

export function RitualSection({ initialGoal = 'Energy', products }: RitualSectionProps) {
  const [selectedGoal, setSelectedGoal] = useState<HealthGoal>(initialGoal);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setSelectedGoal(initialGoal);
  }, [initialGoal]);

  const activeProduct =
    products.find((p) => p.category === selectedGoal) ?? products[0] ?? null;

  return (
    <section id="philosophy" className="py-20 bg-[#F2EFE9] border-y border-[#143628]/10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-medium text-[#4A7C59] mb-2">
            Stage 02 · About Us &amp; The 30-Day Habit Philosophy
          </p>
          <h2 className="font-editorial text-3xl md:text-4xl font-semibold text-[#143628] text-balance">
            Cold-pressed botanical science designed around a 30-day healthy body habit.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-5">
            <div className="h-full min-h-[300px] rounded-xl overflow-hidden border border-[#143628]/10 bg-[#FAF8F5]">
              {!imgFailed ? (
                <img
                  src={
                    activeProduct?.image_url ||
                    '/src/assets/images/ritual_craft_shots_1795507258606.jpg'
                  }
                  alt={activeProduct?.name || 'Cold-pressed organic elixir'}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Leaf className="w-8 h-8 text-[#4A7C59] mb-2" />
                  <p className="font-editorial text-xl text-[#143628]">
                    Cold-Pressed Organic Elixirs
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#143628]/65 mb-3">
                Inspect cold-pressed formulation products by wellness goal
              </p>

              <div
                role="tablist"
                aria-label="Formulation focus"
                className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#143628]/12 rounded-lg mb-8"
              >
                {(['Energy', 'Immunity', 'Gut Health', 'Daily Habit'] as HealthGoal[]).map(
                  (goal) => {
                    const active = goal === selectedGoal;
                    return (
                      <button
                        key={goal}
                        role="tab"
                        aria-selected={active}
                        type="button"
                        onClick={() => {
                          setSelectedGoal(goal);
                          setImgFailed(false);
                        }}
                        className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#143628] text-[#FAF8F5]'
                            : 'text-[#143628]/75 hover:text-[#143628]'
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  }
                )}
              </div>

              {activeProduct ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#4A7C59] font-medium">
                        {activeProduct.category} ·{' '}
                        <span className="font-tabular">{activeProduct.size_ml}ml</span> cold-pressed
                        glass shot
                      </p>
                      <h3 className="font-editorial text-2xl md:text-3xl font-semibold text-[#143628] mt-1">
                        {activeProduct.name}
                      </h3>
                    </div>
                    <p className="font-tabular text-lg font-semibold text-[#143628]">
                      Rs. {activeProduct.price_pkr.toLocaleString()} / shot
                    </p>
                  </div>

                  <p className="text-sm md:text-base leading-relaxed text-[#143628]/80">
                    {activeProduct.tagline}
                  </p>

                  <div className="pt-4 border-t border-[#143628]/10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-[#143628]">Active Botanicals</p>
                      <p className="text-sm text-[#143628]/75 mt-1">{activeProduct.botanicals}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#143628]">Morning Protocol</p>
                      <p className="text-sm text-[#143628]/75 mt-1">
                        Taken within 60 seconds of waking before coffee or tea.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 30-Day Habit Progression */}
            <div className="mt-10 pt-8 border-t border-[#143628]/12 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-[#C59B27]">01. Days 1–7 · Cue</p>
                <p className="text-sm text-[#143628]/80 mt-1.5 leading-relaxed">
                  Unpasteurized botanicals awaken morning digestion and anchor a reliable 60-second
                  cue.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#C59B27]">02. Days 8–21 · Rhythm</p>
                <p className="text-sm text-[#143628]/80 mt-1.5 leading-relaxed">
                  Consistent curcuminoid and chlorophyll uptake reduces afternoon fatigue and
                  craving loops.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#C59B27]">03. Days 22–30 · Identity</p>
                <p className="text-sm text-[#143628]/80 mt-1.5 leading-relaxed">
                  Your morning ritual locks in automatically—reinforced by weekly community
                  challenges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Benefits Grid */}
        <div className="mt-16 pt-12 border-t border-[#143628]/12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {MEMBER_BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="bg-[#FAF8F5] border border-[#143628]/12 rounded-xl p-6 space-y-3"
              >
                <Icon className="w-5 h-5 text-[#4A7C59]" />
                <h3 className="font-editorial text-2xl font-semibold text-[#143628]">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[#143628]/75 leading-relaxed">{benefit.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
