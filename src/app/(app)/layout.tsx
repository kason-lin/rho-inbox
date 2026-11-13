import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { ViewerProvider } from '@/components/shell/viewer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="w-full max-w-[1520px] flex-1 px-7 pt-6 pb-16">{children}</main>
        </div>
      </div>
    </ViewerProvider>
  );
}
