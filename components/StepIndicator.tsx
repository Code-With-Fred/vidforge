'use client';

interface Step {
  label: string;
  number: number;
}

const STEPS: Step[] = [
  { number: 1, label: 'Topic' },
  { number: 2, label: 'Script' },
  { number: 3, label: 'Voice' },
  { number: 4, label: 'Video' },
  { number: 5, label: 'Upload' },
];

interface Props {
  current: number;
  completed: number[];
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({ current, completed, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const isDone = completed.includes(step.number);
        const isActive = step.number === current;
        const isClickable = isDone && onStepClick;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isDone
                    ? 'bg-brand-500 border-brand-500 text-white hover:bg-brand-600 cursor-pointer'
                    : isActive
                    ? 'bg-dark-700 border-brand-400 text-brand-400'
                    : 'bg-dark-700 border-dark-500 text-gray-600 cursor-default'
                } ${isClickable ? 'hover:scale-110' : ''}`}
                title={isDone ? `Go back to ${step.label}` : undefined}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </button>
              <span
                className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                  isActive
                    ? 'text-brand-400'
                    : isDone
                    ? 'text-brand-500'
                    : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`w-10 h-px mx-2 mb-5 transition-colors ${
                  completed.includes(step.number) ? 'bg-brand-500' : 'bg-dark-500'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
