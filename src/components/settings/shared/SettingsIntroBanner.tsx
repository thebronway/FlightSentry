interface Props {
  title: string;
  description: string;
}

export default function SettingsIntroBanner({ title, description }: Props) {
  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
      <p className="font-semibold text-slate-200 mb-0.5">{title}</p>
      {description}
    </div>
  );
}