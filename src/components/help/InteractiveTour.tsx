import { HelpTour } from '@/types/help';

export function InteractiveTour({ tour }: { tour: HelpTour }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <p className="text-xs uppercase tracking-wide text-blue-600">Tour guiado</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{tour.title}</h3>
      <ol className="mt-4 space-y-3">
        {tour.steps.map((step, index) => (
          <li key={`${tour.id}-${step.target}`} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-sm font-medium text-slate-900">{index + 1}. {step.title}</p>
            <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            <p className="mt-1 text-xs text-slate-400">Target UI: <code>{step.target}</code></p>
          </li>
        ))}
      </ol>
    </div>
  );
}
