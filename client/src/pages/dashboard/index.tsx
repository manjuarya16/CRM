import { PageBreadcrumb } from "@/components";
import { useAuthStore } from "@/store";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  accent: string;
}

const StatCard = ({ label, value, icon, accent }: StatCardProps) => (
  <div className="card p-5">
    <div className="flex items-center gap-4">
      <div
        className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${accent}`}
      >
        <i className={`${icon} text-xl`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </h3>
      </div>
    </div>
  </div>
);

const stats: StatCardProps[] = [
  {
    label: "Total Users",
    value: "--",
    icon: "mgc_user_3_line",
    accent: "bg-primary/10 text-primary",
  },
  {
    label: "Active Roles",
    value: "--",
    icon: "mgc_safe_shield_line",
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    label: "Branches",
    value: "--",
    icon: "mgc_building_1_line",
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    label: "Departments",
    value: "--",
    icon: "mgc_chart_bar_line",
    accent: "bg-sky-500/10 text-sky-500",
  },
];

const Dashboard = () => {
  const { user } = useAuthStore();

  return (
    <>
      <PageBreadcrumb title="Dashboard" name="Dashboard" breadCrumbItems={["Dashboards"]} />

      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome{user?.name ? `, ${user.name}` : ""} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This is a placeholder dashboard. Wire it up to your own data once
          the relevant modules are ready.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Getting started
        </h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>This boilerplate ships with Login, Dashboard, and User Management only.</li>
          <li>Add new modules under <code>src/pages/apps</code> and register their routes in <code>src/routes/index.tsx</code>.</li>
          <li>Update <code>src/constants/menu.ts</code> to add sidebar links for new modules.</li>
        </ul>
      </div>
    </>
  );
};

export default Dashboard;
