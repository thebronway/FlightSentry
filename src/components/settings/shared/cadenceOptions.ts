export interface CadenceOption {
  value: number;
  label: string;
}

export const CADENCE_OPTIONS: CadenceOption[] = [
  { value: 0, label: 'Do not check (Paused)' },
  { value: 1, label: 'Every 1 hour (24 checks/day)' },
  { value: 2, label: 'Every 2 hours (12 checks/day)' },
  { value: 3, label: 'Every 3 hours (8 checks/day)' },
  { value: 4, label: 'Every 4 hours (6 checks/day)' },
  { value: 6, label: 'Every 6 hours (4 checks/day)' },
  { value: 8, label: 'Every 8 hours (3 checks/day)' },
  { value: 10, label: 'Every 10 hours' },
  { value: 11, label: 'Every 11 hours' },
  { value: 12, label: 'Every 12 hours (2 checks/day)' },
  { value: 24, label: 'Every day (24 hrs)' },
  { value: 48, label: 'Every 2 days (48 hrs)' },
  { value: 72, label: 'Every 3 days (72 hrs)' },
  { value: 96, label: 'Every 4 days (96 hrs)' },
  { value: 168, label: 'Every week (168 hrs)' },
];

export const OVERRIDE_CADENCE_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'Do not check (Paused)' },
  { value: '1', label: 'Every 1 hour' },
  { value: '2', label: 'Every 2 hours' },
  { value: '3', label: 'Every 3 hours' },
  { value: '4', label: 'Every 4 hours' },
  { value: '6', label: 'Every 6 hours' },
  { value: '8', label: 'Every 8 hours' },
  { value: '10', label: 'Every 10 hours' },
  { value: '11', label: 'Every 11 hours' },
  { value: '12', label: 'Every 12 hours' },
  { value: '24', label: 'Every day (24 hrs)' },
  { value: '48', label: 'Every 2 days (48 hrs)' },
  { value: '72', label: 'Every 3 days (72 hrs)' },
  { value: '96', label: 'Every 4 days (96 hrs)' },
  { value: '168', label: 'Every week (168 hrs)' },
];

export function formatCustomCadenceLabel(hours: number): string {
  if (hours === 0) return 'Do not check (Paused)';
  if (hours < 24) return `Every ${hours} hours (${hours} hrs)`;
  return `Every ${Math.round(hours / 24)} days (${hours} hrs)`;
}