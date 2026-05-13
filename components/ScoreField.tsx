type ScoreFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ScoreField({ label, value, onChange, disabled = false }: ScoreFieldProps) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="20"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-3 text-center text-xl font-black text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-70"
        placeholder="0"
      />
    </label>
  );
}
