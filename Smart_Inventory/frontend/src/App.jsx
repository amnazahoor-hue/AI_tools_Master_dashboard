import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import AdminView from "./pages/AdminView";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "admin", label: "Admin Control Center" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              <span className="block">Vision Inventory</span>
              <span className="mt-1 block bg-gradient-to-r from-pink-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
                Pro
              </span>
            </h1>
            <div className="mt-2 h-1 w-28 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400" />
            <p className="mt-1 text-sm text-fuchsia-100/90">
              AI-powered product catalog workspace
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-pink-200/80">
              Powered by Tekcroft
            </p>
          </div>

          <nav className="group relative box-border flex items-center rounded-full border border-white/10 bg-slate-800/50 p-1 shadow-xl backdrop-blur-xl">
            <span
              className={`absolute left-1 top-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_8px_28px_rgba(217,70,239,0.32)] transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:scale-[1.02] ${
                activeTab === "dashboard" ? "translate-x-0" : "translate-x-full"
              }`}
            />
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 flex-1 px-6 py-2 text-center text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "text-white" : "text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === "dashboard" ? <Dashboard /> : <AdminView />}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.9)",
            color: "#f8fafc",
            border: "1px solid rgba(255,255,255,0.15)",
          },
        }}
      />
    </div>
  );
}

