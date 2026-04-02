import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import SocialKitDrawer from "../components/SocialKitDrawer";

const statusStyles = {
  Draft: "bg-blue-500/25 text-blue-100 border-blue-300/50",
  Active: "bg-emerald-500/25 text-emerald-100 border-emerald-300/50",
  Archived: "bg-slate-400/25 text-slate-100 border-slate-300/40",
};

const categoryOptions = ["All", "Electronics", "Fashion", "Home Decor", "General"];

const SkeletonRows = () =>
  Array.from({ length: 6 }).map((_, index) => (
    <tr key={`skeleton-${index}`} className="animate-pulse border-b border-white/10">
      <td className="p-3">
        <div className="h-4 w-4 rounded bg-white/20" />
      </td>
      <td className="p-3">
        <div className="h-10 w-10 rounded-xl bg-white/20" />
      </td>
      <td className="p-3">
        <div className="h-4 w-40 rounded bg-white/20" />
      </td>
      <td className="p-3">
        <div className="h-4 w-24 rounded bg-white/20" />
      </td>
      <td className="p-3">
        <div className="h-6 w-20 rounded-full bg-white/20" />
      </td>
      <td className="p-3">
        <div className="h-4 w-16 rounded bg-white/20" />
      </td>
      <td className="p-3">
        <div className="ml-auto h-7 w-24 rounded-lg bg-white/20" />
      </td>
    </tr>
  ));

export default function AdminView() {
  const {
    inventory,
    stats,
    settings,
    loadInventory,
    markProductsActive,
    deleteProducts,
    exportInventoryCsv,
    request,
    apiLoading,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProductPosts, setSelectedProductPosts] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [drawerProductName, setDrawerProductName] = useState("");
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = `${item.name} ${item.ai_caption || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" || (item.category || "General") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, categoryFilter]);

  const toggleSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const markActiveSelected = async () => {
    if (!selectedRows.length) return;
    await markProductsActive(selectedRows);
    setSelectedRows([]);
  };

  const deleteSelected = async () => {
    if (!selectedRows.length) return;
    await deleteProducts(selectedRows);
    setSelectedRows([]);
  };

  const openSocialKit = async (item) => {
    setSelectedProductId(item.id);
    setDrawerProductName(item.name);
    setSelectedProductPosts(null);
    setIsDrawerOpen(true);
    setIsSocialLoading(true);
    try {
      const result = await request(`/products/${item.id}/social-kit`, { method: "POST" });
      setSelectedProductPosts(result.social_posts || null);
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border border-pink-200/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl">
          <p className="text-sm text-pink-100/90">Total Items</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{stats.totalItems}</h3>
        </article>
        <article className="rounded-3xl border border-pink-200/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl">
          <p className="text-sm text-pink-100/90">Inventory Value</p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {settings.currency_symbol}
            {stats.totalValue.toFixed(2)}
          </h3>
        </article>
        <article className="rounded-3xl border border-pink-200/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl">
          <p className="text-sm text-pink-100/90">Most Popular Category</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{stats.topCategory}</h3>
        </article>
      </section>

      <section className="rounded-3xl border border-pink-200/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product..."
              className="w-full rounded-xl border border-white/25 bg-black/20 px-3 py-2 text-white placeholder:text-pink-100/60"
            />
            <select
              value={categoryFilter}
              onChange={async (e) => {
                const value = e.target.value;
                setCategoryFilter(value);
                await loadInventory(value === "All" ? {} : { category: value });
              }}
              className="rounded-xl border border-white/25 bg-black/20 px-3 py-2 text-white"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
              onClick={markActiveSelected}
            >
              Mark Active
            </button>
            <button
              className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
              onClick={deleteSelected}
            >
              Delete
            </button>
            <button
              className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
              onClick={exportInventoryCsv}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-pink-100/90">
                <th className="p-3">Select</th>
                <th className="p-3">Image</th>
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Price</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiLoading ? (
                <SkeletonRows />
              ) : filteredInventory.length ? (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-white/10 text-slate-100 hover:bg-white/5">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="p-3">
                      <img
                        src={`http://127.0.0.1:5108/uploads/${String(
                          item.original_image_path || ""
                        ).split(/[/\\]/).pop()}`}
                        alt={item.name}
                        className="h-10 w-10 rounded-xl object-cover ring-1 ring-pink-200/20"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.category || "General"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          statusStyles[item.status] || statusStyles.Archived
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {settings.currency_symbol}
                      {Number(item.suggested_price || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => openSocialKit(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-300/40 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/30"
                      >
                        <Sparkles size={14} />
                        Social Kit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-pink-100/70" colSpan={7}>
                    No inventory items found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SocialKitDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        posts={selectedProductPosts}
        loading={isSocialLoading}
        productName={drawerProductName}
        productId={selectedProductId}
      />
    </div>
  );
}

