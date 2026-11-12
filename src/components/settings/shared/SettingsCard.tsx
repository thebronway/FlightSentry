import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SettingsCard({ children, className = '' }: Props) {
  return (
    <div className={`bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg ${className}`.trim()}>
      {children}
    </div>
  );
}