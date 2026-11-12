import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';

export default async function Soon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (
    <>
      <PageHeader title={name} />
      <div className="rounded-lg border bg-white px-6 py-16 text-center">
        <p className="font-medium">{name} isn’t part of this prototype.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The prototype covers <Link className="underline" href="/checkin">Check-in</Link> and the <Link className="underline" href="/inbox">Inbox</Link>.
        </p>
      </div>
    </>
  );
}
