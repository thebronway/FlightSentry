import { EmailParseDiagnosticResult } from '@/types';

export interface EmlPreviewResponse {
  fileName: string | null;
  diagnostic: EmailParseDiagnosticResult;
}