import { Globe, Github, Box, Coffee } from 'lucide-react';
import packageInfo from '../../package.json';

export default function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-slate-200 dark:border-gunmetal-border bg-white dark:bg-gunmetal-nav transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 dark:text-gunmetal-muted">
        
        <div className="mb-4 md:mb-0">
          <a 
            href="https://github.com/thebronway/FlightSentry/blob/main/CHANGELOG.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
          >
            FlightSentry v{packageInfo.version}
          </a>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
          <a 
            href="https://brian.conway.im/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-emerald-500 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Globe className="w-4 h-4" />
            <span>brian.conway.im</span>
          </a>
          <a 
            href="https://github.com/thebronway/FlightSentry" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-purple-500 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <a 
            href="https://hub.docker.com/r/thebronway/flightsentry" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-blue-500 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Box className="w-4 h-4" />
            <span>Docker Hub</span>
          </a>
          <a 
            href="https://buymeacoffee.com/brianconway" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-yellow-500 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Coffee className="w-4 h-4" />
            <span>Support the Project</span>
          </a>
        </div>

      </div>
    </footer>
  );
}