import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";

const AppContext = createContext(null);

const computeStats = (inventory = []) => {
  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + Number(item.suggested_price || 0), 0);

  const categoryCount = inventory.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const topCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return {
    totalItems,
    totalValue,
    categoryCount,
    topCategory,
  };
};

export const AppProvider = ({ children }) => {
  const api = useApi();
  const [inventory, setInventory] = useState([]);
  const [settings, setSettings] = useState({
    currency_symbol: "$",
    default_tax_rate: 0,
  });

  const stats = useMemo(() => computeStats(inventory), [inventory]);

  const loadInventory = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const data = await api.request(`/products${query ? `?${query}` : ""}`);
    setInventory(Array.isArray(data) ? data : []);
    return data;
  };

  const loadSettings = async () => {
    const data = await api.request("/settings");
    setSettings(data);
    return data;
  };

  const saveProduct = async (productPayload) => {
    const created = await api.request("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productPayload),
    });
    setInventory((prev) => [created, ...prev]);
    return created;
  };

  const updateProduct = async (id, patchPayload) => {
    const updated = await api.request(`/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload),
    });
    setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const markProductsActive = async (ids) => {
    const result = await api.request("/products/bulk/mark-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: ids }),
    });
    setInventory((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, status: "Active" } : item))
    );
    return result;
  };

  const deleteProducts = async (ids) => {
    const result = await api.request("/products/bulk/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: ids }),
    });
    setInventory((prev) => prev.filter((item) => !ids.includes(item.id)));
    return result;
  };

  const exportInventoryCsv = async () => {
    const blob = await api.request("/products/export/csv");
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "inventory_export.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadInventory().catch(() => null);
    loadSettings().catch(() => null);
  }, []);

  const value = useMemo(
    () => ({
      inventory,
      settings,
      stats,
      apiLoading: api.loading,
      apiError: api.error,
      clearApiError: api.clearError,
      loadInventory,
      loadSettings,
      saveProduct,
      updateProduct,
      markProductsActive,
      deleteProducts,
      exportInventoryCsv,
      request: api.request,
    }),
    [inventory, settings, stats, api.loading, api.error, api.request]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider.");
  }
  return context;
};

