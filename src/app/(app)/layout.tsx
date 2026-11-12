import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { ViewerProvider } from '@/components/shell/viewer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <div className="flex min-h-screen bg-tint">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-7">{children}</main>
        </div>
      </div>
    </ViewerProvider>
  );
}
