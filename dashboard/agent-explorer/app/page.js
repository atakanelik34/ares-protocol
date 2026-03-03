import ExplorerClient from './ExplorerClient';

const STAR_AGENT = '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5';

export const dynamic = 'force-static';

export default function Page() {
  return <ExplorerClient initialQuery={STAR_AGENT} />;
}
