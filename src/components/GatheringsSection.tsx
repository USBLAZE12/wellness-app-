import { useState } from 'react';
import { Calendar, Leaf } from 'lucide-react';
import type { WellnessEvent } from '../types/wellness';

interface GatheringsSectionProps {
  events: WellnessEvent[];
  onReserveGathering: (event: WellnessEvent) => void;
}

type EventFilter = 'All' | WellnessEvent['type'];

const FILTERS: EventFilter[] = ['All', 'Wellness Retreat', 'Community Meetup', 'Habit Workshop'];

const TESTIMONIALS = [
  {
    quote:
      'Replacing my chaotic mornings with a chilled glass shot on the counter anchored everything else—hydrating early, walking before emails, and meeting grounded people at the Lahore courtyard table.',
    name: 'Ayesha Tariq',
    role: 'Principal Architect, Lahore',
    outcome: '14 consecutive weeks of morning consistency',
  },
  {
    quote:
      'Zero powdery supplements or sweet juices. The turmeric-galangal batch arrives crisp every Monday morning before rounds, and the Nathia Gali retreat reset how I handle hospital call schedules.',
    name: 'Dr. Bilal Qureshi',
    role: 'Orthopedic Surgeon, Islamabad',
    outcome: 'Switched from synthetic multivitamins to weekly cold-press',
  },
  {
    quote:
      'What convinced me was the accountability circle. Having a real community in Karachi that meets offline over morning tea instead of scrolling wellness trends made the habit stick.',
    name: 'Sana Mahmood',
    role: 'Product Director, Karachi',
    outcome: 'Completed 90-day gut & circadian routine',
  },
];

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function GatheringsSection({ events, onReserveGathering }: GatheringsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<EventFilter>('All');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleEvents =
    activeFilter === 'All' ? events : events.filter((ev) => ev.type === activeFilter);

  return (
    <>
      <section id="gatherings" className="py-20 bg-[#F2EFE9] border-y border-[#143628]/10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-medium text-[#4A7C59] mb-2">
                Offline Community &amp; Retreats
              </p>
              <h2 className="font-editorial text-3xl md:text-4xl font-semibold text-[#143628] text-balance">
                Health habits deepen when practiced together in real rooms.
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Filter gatherings by type"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#FAF8F5] border border-[#143628]/12 rounded-lg"
            >
              {FILTERS.map((filter) => {
                const active = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#143628] text-[#FAF8F5]'
                        : 'text-[#143628]/75 hover:text-[#143628]'
                    }`}
                  >
                    {filter === 'All' ? 'All Gatherings' : filter}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleEvents.map((ev) => {
              const hasFailed = failedImages[ev.id];
              return (
                <article
                  key={ev.id}
                  className="flex flex-col justify-between bg-[#FAF8F5] border border-[#143628]/12 rounded-xl overflow-hidden"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-[#E9E4DA] overflow-hidden">
                      {!hasFailed ? (
                        <img
                          src={ev.image_url}
                          alt={ev.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [ev.id]: true }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F2EFE9] to-[#E2DDD1]">
                          <Leaf className="w-7 h-7 text-[#4A7C59] mb-2" />
                          <p className="font-editorial text-lg text-[#143628]">{ev.type}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <p className="text-xs text-[#4A7C59] font-medium">
                        {ev.type} · <span className="font-tabular">{formatEventDate(ev.event_date)}</span>
                      </p>
                      <h3 className="font-editorial text-2xl font-semibold text-[#143628] mt-1.5 leading-snug">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-[#143628]/65 mt-1">{ev.location}</p>
                      <p className="text-sm text-[#143628]/80 mt-3 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-[#143628]/10 flex items-center justify-between gap-4">
                    <span className="font-tabular text-xs font-medium text-[#143628]/75">
                      {ev.spots_available} spots available
                    </span>
                    <button
                      type="button"
                      onClick={() => onReserveGathering(ev)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#143628] hover:text-[#4A7C59] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Request Seat</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Member Outcomes & Philosophy */}
      <section id="philosophy" className="py-20 bg-[#FAF8F5]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium text-[#4A7C59] mb-2">
              Member Philosophy &amp; Outcomes
            </p>
            <h2 className="font-editorial text-3xl md:text-4xl font-semibold text-[#143628] text-balance">
              Small daily biological investments compound faster than drastic resets.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item) => (
              <blockquote
                key={item.name}
                className="flex flex-col justify-between p-6 bg-white border border-[#143628]/12 rounded-xl"
              >
                <p className="text-sm md:text-[15px] leading-relaxed text-[#143628]/85">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="mt-6 pt-4 border-t border-[#143628]/10">
                  <p className="text-sm font-semibold text-[#143628]">{item.name}</p>
                  <p className="text-xs text-[#143628]/65 mt-0.5">{item.role}</p>
                  <p className="text-xs font-medium text-[#4A7C59] mt-2">{item.outcome}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
