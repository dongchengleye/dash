
import RoiChart from '@/components/wired-components/dashboard/RoiChart';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <section className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ROI 仪表板</h1>
        <ThemeToggle />
      </div>
      <RoiChart />
    </section>
    </div>
  );
}
