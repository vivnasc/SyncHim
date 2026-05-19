import fs from 'node:fs/promises';
import path from 'node:path';
import { SessionMarkdown } from '@/components/SessionMarkdown';

export const runtime = 'edge';

export default async function GuaranteePage({ params }: { params: { locale: string } }) {
  const file = path.join(process.cwd(), 'content', params.locale, 'legal', 'garantia.md');
  const raw = await fs.readFile(file, 'utf8');
  return (
    <div className="px-6 md:px-10 py-16">
      <SessionMarkdown source={raw} />
    </div>
  );
}
