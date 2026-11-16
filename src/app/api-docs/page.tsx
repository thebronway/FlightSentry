import packageInfo from '../../../package.json';
import ApiReferenceViewer from '@/components/apiDocs/ApiReferenceViewer';

export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  return <ApiReferenceViewer specVersion={packageInfo.version} />;
}