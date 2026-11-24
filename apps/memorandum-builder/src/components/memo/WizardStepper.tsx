const STEPS = ["Select Template", "Populate Fields", "Preview", "Generate"];

export function WizardStepper({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((label, index) => {
        const current = index === step;
        const done = index < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={index > step}
              onClick={() => onStep(index)}
              className={`flex min-h-11 items-center gap-2 text-sm ${current || done ? "font-semibold text-mb-blue" : "text-mb-muted"}`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs ${current ? "bg-mb-blue text-mb-on-blue" : done ? "bg-mb-blue-soft text-mb-blue" : "bg-mb-page text-mb-muted"}`}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < STEPS.length - 1 ? <span className="hidden h-px w-6 bg-mb-line sm:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
