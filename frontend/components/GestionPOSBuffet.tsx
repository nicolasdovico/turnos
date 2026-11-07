"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Coffee,
  Package,
  Layers,
  Search,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Lock,
  Unlock,
  FileText,
} from "lucide-react";

export interface ProductoItem {
  id: number;
  nombre: string;
  codigo_barra?: string | null;
  categoria?: string | null;
  precio_costo?: number | string | null;
  precio_venta: number | string;
  stock_actual: number;
  stock_minimo?: number | null;
  estado?: string;
}

export interface CartItem {
  producto: ProductoItem;
  cantidad: number;
}

interface GestionPOSBuffetProps {
  subdomain: string;
  token?: string | null;
}

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function GestionPOSBuffet({ subdomain, token }: GestionPOSBuffetProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pos" | "inventario">("pos");
  const [productos, setProductos] = useState<ProductoItem[]>([]);

  // Categorías dinámicas derivadas de los productos existentes + base inicial
  const categoriasDisponibles = useMemo(() => {
    const defaultList = ["Bebidas", "Snacks", "Cafetería", "Equipamiento"];
    const fromProds = productos
      .map((p) => p.categoria?.trim())
      .filter((c): c is string => Boolean(c && c.length > 0));

    const combined = Array.from(new Set([...defaultList, ...fromProds]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [productos]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros POS
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("todas");

  // Carrito de ventas
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipoPago, setTipoPago] = useState<"efectivo" | "tarjeta" | "transferencia" | "billetera">("efectivo");
  const [montoRecibido, setMontoRecibido] = useState<string>("");
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [comandaTurnoId, setComandaTurnoId] = useState<string>("");
  const [turnosActivos, setTurnosActivos] = useState<
    Array<{
      id: number;
      hora_inicio: string;
      hora_fin: string;
      cancha_nombre: string;
      cliente_nombre: string;
      estado: string;
    }>
  >([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);

  // Modal Nuevo/Editar Producto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formCategoria, setFormCategoria] = useState("Bebidas");
  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);
  const [formNuevaCategoria, setFormNuevaCategoria] = useState("");
  const [formPrecioCosto, setFormPrecioCosto] = useState("");
  const [formPrecioVenta, setFormPrecioVenta] = useState("");
  const [formStockActual, setFormStockActual] = useState("");
  const [formStockMinimo, setFormStockMinimo] = useState("5");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const getHeaders = () => {
    const activeToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("saas_token") || localStorage.getItem("token")
        : null);

    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Tenant-Subdomain": subdomain,
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/pos/productos`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al cargar productos del buffet.");
      }
      setProductos(data.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTurnosActivos = async () => {
    try {
      setLoadingTurnos(true);
      const res = await fetch(`${API_BASE}/pos/turnos-activos`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setTurnosActivos(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingTurnos(false);
    }
  };

  useEffect(() => {
    fetchProductos();
    fetchTurnosActivos();
  }, [subdomain]);

  // Carrito Helpers
  const addToCart = (prod: ProductoItem) => {
    if (prod.stock_actual <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === prod.id);
      if (existing) {
        if (existing.cantidad >= prod.stock_actual) return prev;
        return prev.map((item) =>
          item.producto.id === prod.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  };

  const updateCartQty = (prodId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === prodId) {
            const nextQty = item.cantidad + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.producto.stock_actual) return item;
            return { ...item, cantidad: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (prodId: number) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== prodId));
  };

  const clearCart = () => setCart([]);

  const totalVenta = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + Number(item.producto.precio_venta) * item.cantidad;
    }, 0);
  }, [cart]);

  const vuelto = useMemo(() => {
    if (tipoPago !== "efectivo") return 0;
    const num = Number(montoRecibido);
    return num > totalVenta ? num - totalVenta : 0;
  }, [tipoPago, montoRecibido, totalVenta]);

  // Ejecutar venta POS
  const handleFinalizarVenta = async () => {
    if (cart.length === 0) return;
    setIsProcessingSale(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      tipo_pago: tipoPago,
      items: cart.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        precio_unitario: Number(i.producto.precio_venta),
      })),
    };

    try {
      const url = comandaTurnoId.trim()
        ? `${API_BASE}/turnos/${comandaTurnoId.trim()}/consumos`
        : `${API_BASE}/pos/ventas`;

      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al procesar la venta.");
      }

      setSuccessMsg(
        comandaTurnoId.trim()
          ? `¡Comanda asignada al turno #${comandaTurnoId} con éxito!`
          : `¡Venta #${data.data?.id || ""} registrada con éxito por $${totalVenta.toLocaleString()}!`
      );
      clearCart();
      setMontoRecibido("");
      setComandaTurnoId("");
      fetchProductos();
      fetchCajaResumen();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar la venta.");
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Crear o Editar Producto
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormNombre("");
    setFormCodigo("");
    setFormCategoria(categoriasDisponibles[0] || "Bebidas");
    setIsCreatingNewCat(false);
    setFormNuevaCategoria("");
    setFormPrecioCosto("");
    setFormPrecioVenta("");
    setFormStockActual("20");
    setFormStockMinimo("5");
    setIsProductModalOpen(true);
  };

  const openEditModal = (prod: ProductoItem) => {
    setEditingProduct(prod);
    setFormNombre(prod.nombre);
    setFormCodigo(prod.codigo_barra || "");
    setFormCategoria(prod.categoria || "Bebidas");
    setIsCreatingNewCat(false);
    setFormNuevaCategoria("");
    setFormPrecioCosto(prod.precio_costo ? String(prod.precio_costo) : "");
    setFormPrecioVenta(String(prod.precio_venta));
    setFormStockActual(String(prod.stock_actual));
    setFormStockMinimo(prod.stock_minimo ? String(prod.stock_minimo) : "5");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    setErrorMsg(null);

    const resolvedCategoria = isCreatingNewCat
      ? formNuevaCategoria.trim()
      : formCategoria.trim();

    if (!resolvedCategoria) {
      setErrorMsg("Debes especificar una categoría para el producto.");
      setIsSavingProduct(false);
      return;
    }

    const payload = {
      nombre: formNombre,
      codigo_barra: formCodigo || null,
      categoria: resolvedCategoria,
      precio_costo: formPrecioCosto ? Number(formPrecioCosto) : null,
      precio_venta: Number(formPrecioVenta),
      stock_actual: Number(formStockActual),
      stock_minimo: formStockMinimo ? Number(formStockMinimo) : 5,
    };

    try {
      const url = editingProduct
        ? `${API_BASE}/pos/productos/${editingProduct.id}`
        : `${API_BASE}/pos/productos`;
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar el producto.");
      }

      setIsProductModalOpen(false);
      setSuccessMsg(`Producto "${formNombre}" guardado exitosamente.`);
      fetchProductos();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar producto.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId: number) => {
    if (!confirm("¿Seguro que deseas dar de baja este producto del buffet?")) return;
    try {
      const res = await fetch(`${API_BASE}/pos/productos/${prodId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al dar de baja el producto.");
      }
      setSuccessMsg("Producto dado de baja exitosamente.");
      fetchProductos();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar producto.");
    }
  };

  // Productos filtrados para el POS
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchesSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.codigo_barra && p.codigo_barra.includes(searchQuery));
      const matchesCat =
        selectedCat === "todas" ||
        (p.categoria && p.categoria.toLowerCase() === selectedCat.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [productos, searchQuery, selectedCat]);

  return (
    <div className="space-y-6" data-testid="gestion-pos-buffet">
      {/* Notificaciones */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-navegación de Módulo POS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("pos")}
            data-testid="tab-pos-terminal"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === "pos"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Terminal POS (Ventas)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("inventario")}
            data-testid="tab-pos-inventario"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === "inventario"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventario & Productos</span>
          </button>
        </div>

        {activeSubTab === "inventario" && (
          <button
            type="button"
            onClick={openCreateModal}
            data-testid="btn-nuevo-producto"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* 1. VISTA TERMINAL POS */}
      {activeSubTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catálogo de selección táctil (2 columnas) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Buscador & Categorías */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o código de barra..."
                  data-testid="input-buscar-pos"
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCat("todas")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCat === "todas"
                      ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  Todas
                </button>
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCat === cat
                        ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla de Productos */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Cargando catálogo de productos...
              </div>
            ) : filteredProductos.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                No se encontraron productos disponibles para la búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProductos.map((prod) => {
                  const isAgotado = prod.stock_actual <= 0;
                  const isBajo = prod.stock_actual <= (prod.stock_minimo || 5) && !isAgotado;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={isAgotado}
                      onClick={() => addToCart(prod)}
                      data-testid={`pos-producto-card-${prod.id}`}
                      className={`p-3.5 rounded-2xl text-left border transition flex flex-col justify-between h-32 relative ${
                        isAgotado
                          ? "bg-slate-950/60 border-slate-900 opacity-50 cursor-not-allowed"
                          : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/80 cursor-pointer shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                            {prod.nombre}
                          </h4>
                          <span className="text-lg">
                            {prod.categoria === "bebidas" ? "🥤" : prod.categoria === "pelotas" ? "🎾" : "🥪"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isAgotado
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : isBajo
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            Stock: {prod.stock_actual}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-black text-emerald-400">
                        ${Number(prod.precio_venta).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Carrito de Compra / Terminal de Cobro */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Ticket de Venta ({cart.length})
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Items en el carrito */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  El ticket está vacío. Selecciona productos del menú.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.producto.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {item.producto.nombre}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ${Number(item.producto.precio_venta).toLocaleString()} c/u
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.producto.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-white w-5 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.producto.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.producto.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opciones de Cobro & Totales */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-base font-black text-white">
                <span>Total a Cobrar:</span>
                <span className="text-emerald-400 text-lg">
                  ${totalVenta.toLocaleString()}
                </span>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoPago("efectivo")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      tipoPago === "efectivo"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago("tarjeta")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      tipoPago === "tarjeta"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tarjeta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago("transferencia")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      tipoPago === "transferencia"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>QR / Transf.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago("billetera")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      tipoPago === "billetera"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Billetera</span>
                  </button>
                </div>
              </div>

              {/* Calculadora de Vuelto para Efectivo */}
              {tipoPago === "efectivo" && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Paga con:</span>
                    <input
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder={`$${totalVenta}`}
                      className="w-28 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-right text-white font-bold focus:outline-none"
                    />
                  </div>
                  {Number(montoRecibido) > totalVenta && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 pt-1 border-t border-slate-800">
                      <span>Vuelto / Cambio:</span>
                      <span>${vuelto.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Opción Comanda a Turno de Cancha (Vigentes y Anteriores de Hoy) */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🎾 Cargar a Cancha / Turno:</span>
                  </label>
                  {comandaTurnoId && (
                    <button
                      type="button"
                      onClick={() => setComandaTurnoId("")}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                    >
                      (Quitar asignación)
                    </button>
                  )}
                </div>

                <select
                  value={comandaTurnoId}
                  onChange={(e) => setComandaTurnoId(e.target.value)}
                  data-testid="select-comanda-turno"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- Cobro Directo en Mostrador (Sin asignar) --</option>
                  {turnosActivos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.cancha_nombre} ({t.hora_inicio} a {t.hora_fin}) • {t.cliente_nombre}
                    </option>
                  ))}
                </select>

                {comandaTurnoId && (
                  <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 p-2 rounded-xl">
                    ✓ El gasto quedará pendiente en la comanda del turno #{comandaTurnoId} para ser cobrado al salir.
                  </p>
                )}
              </div>

              {/* Botón de Confirmación */}
              <button
                type="button"
                disabled={cart.length === 0 || isProcessingSale}
                onClick={handleFinalizarVenta}
                data-testid="btn-confirmar-venta-pos"
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
                  cart.length === 0 || isProcessingSale
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                }`}
              >
                {isProcessingSale ? (
                  <span>Procesando Venta...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar y Cobrar (${totalVenta.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. VISTA INVENTARIO & PRODUCTOS */}
      {activeSubTab === "inventario" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Catálogo de Mercadería ({productos.length} Productos)
            </h3>
            <span className="text-[11px] text-slate-400">
              Control de stock y precios de venta
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Costo</th>
                  <th className="py-3 px-4">Precio Venta</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Alerta</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {productos.map((prod) => {
                  const isAgotado = prod.stock_actual <= 0;
                  const isBajo = prod.stock_actual <= (prod.stock_minimo || 5) && !isAgotado;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{prod.nombre}</div>
                        {prod.codigo_barra && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            SKU: {prod.codigo_barra}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-400">
                        {prod.categoria || "General"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {prod.precio_costo ? `$${Number(prod.precio_costo).toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        ${Number(prod.precio_venta).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            isAgotado
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : isBajo
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          {prod.stock_actual}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {isAgotado ? (
                          <span className="text-rose-400 font-bold">🔴 Agotado</span>
                        ) : isBajo ? (
                          <span className="text-amber-400 font-bold">🟡 Stock Bajo</span>
                        ) : (
                          <span className="text-emerald-400">🟢 Normal</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          data-testid={`btn-editar-producto-${prod.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          data-testid={`btn-eliminar-producto-${prod.id}`}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 text-xs font-semibold"
                        >
                          Baja
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingProduct ? `Editar "${editingProduct.nombre}"` : "Nuevo Producto para el Buffet"}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Gatorade Manzana 500ml"
                  data-testid="input-producto-nombre"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">
                      Categoría *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCat(!isCreatingNewCat)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      {isCreatingNewCat ? "← Existente" : "+ Nueva"}
                    </button>
                  </div>

                  {isCreatingNewCat ? (
                    <input
                      type="text"
                      required
                      value={formNuevaCategoria}
                      onChange={(e) => setFormNuevaCategoria(e.target.value)}
                      placeholder="Ej: Parrilla, Golosinas..."
                      data-testid="input-nueva-categoria"
                      className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  ) : (
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      data-testid="select-categoria-producto"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    >
                      {categoriasDisponibles.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    placeholder="Opcional..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Precio Venta *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formPrecioVenta}
                    onChange={(e) => setFormPrecioVenta(e.target.value)}
                    placeholder="Ej: 2500"
                    data-testid="input-producto-precio"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Precio Costo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPrecioCosto}
                    onChange={(e) => setFormPrecioCosto(e.target.value)}
                    placeholder="Ej: 1200"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStockActual}
                    onChange={(e) => setFormStockActual(e.target.value)}
                    data-testid="input-producto-stock"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  data-testid="btn-guardar-producto"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                >
                  {isSavingProduct ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
