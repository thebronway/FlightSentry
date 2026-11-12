import { Globe, Github, Coffee, BookOpen, ExternalLink } from 'lucide-react';
import packageInfo from '../../../../package.json';
import SettingsCard from '../shared/SettingsCard';

export default function AppVersionSupportCard() {
  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gunmetal-border/70">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Application Version</h4>
          <span className="text-base font-bold text-slate-100 font-mono">
            FlightSentry v{packageInfo.version}
          </span>
        </div>
        <a
          href="https://github.com/thebronway/FlightSentry/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] sm:min-h-0 flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Release Notes</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
          Support & Project Links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://brian.conway.im/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Developer&apos;s Website</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://github.com/thebronway/FlightSentry/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Report An Issue</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://buymeacoffee.com/brianconway"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Support FlightSentry</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>
        </div>
      </div>
    </SettingsCard>
  );
}