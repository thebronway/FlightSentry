'use client';

export default function CondensedTableHeader() {
  return (
    <thead>
      <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
        <th className="py-3 px-4 border-l-4 border-l-transparent rounded-tl-lg w-[22%] min-w-[170px]">Flight / Route</th>
        <th className="py-3 px-4 whitespace-nowrap w-28">Departure</th>
        <th className="py-3 px-4 w-[24%] min-w-[190px]">Cabin & Tier</th>
        <th className="py-3 px-4 whitespace-nowrap w-32 min-w-[120px]">Current Price</th>
        <th className="py-3 px-4 whitespace-nowrap w-44">Baseline & Notifications</th>
        <th className="py-3 px-4 whitespace-nowrap w-28">Status</th>
        <th className="py-3 px-4 text-right whitespace-nowrap w-36 rounded-tr-lg">Actions</th>
      </tr>
    </thead>
  );
}