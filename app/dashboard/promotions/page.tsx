"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  BadgePercent,
  Plus,
  Power,
  PowerOff,
  Trash2,
  X,
} from "lucide-react";

interface Coupon {
  id: number;
  code: string;
  discountPercentage: string | number;
  status: "active" | "inactive";
  usageLimit: number | null;
  usedCount: number;
}

export default function PromotionsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<number | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount: "",
    limit: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const coupRes = await fetch("/api/tenant/coupons");
      const coupData = await coupRes.json();
      setCoupons(coupData);
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
      showToast("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  }

  // ===================== LÓGICA DE CUPONS =====================
  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount || isCreatingCoupon) {
      if (!newCoupon.code || !newCoupon.discount) {
        showToast("Preencha o código e o percentual de desconto.");
      }
      return;
    }

    setIsCreatingCoupon(true);
    try {
      const res = await fetch("/api/tenant/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCoupon.code,
          discountPercentage: newCoupon.discount,
          usageLimit: newCoupon.limit ? parseInt(newCoupon.limit) : null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewCoupon({ code: "", discount: "", limit: "" });
        fetchData();
        showToast("Cupom criado com sucesso!");
      } else {
        const errorData = await res.json();
        showToast(`Erro: ${errorData.error}`);
      }
    } catch (error) {
      showToast("Erro de conexão ao criar cupom.");
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const toggleCouponStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/tenant/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error ? `Erro: ${errorData.error}` : "Erro ao alterar status do cupom.");
        return;
      }

      fetchData();
      showToast(
        newStatus === "active" ? "Cupom ativado!" : "Cupom desativado."
      );
    } catch (error) {
      showToast("Erro de conexão ao alterar status do cupom.");
    }
  };

  const deleteCoupon = (id: number) => {
    setCouponToDelete(id);
  };

  const handleCouponDeleteConfirm = async () => {
    if (couponToDelete === null) return;
    setIsDeletingCoupon(true);
    try {
      await fetch(`/api/tenant/coupons/${couponToDelete}`, { method: "DELETE" });
      setCouponToDelete(null);
      fetchData();
      showToast("Cupom excluído com sucesso.");
    } catch (error) {
      showToast("Erro ao excluir cupom.");
    } finally {
      setIsDeletingCoupon(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-white font-medium">
        Carregando promoções...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-[30px] border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
            Revenue Management
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Promoções
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Crie e gerencie códigos promocionais para impulsionar reservas diretas e campanhas sazonais.
          </p>
        </div>
      </section>

      {/* CUPONS DE DESCONTO */}
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-2">
              <BadgePercent className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Cupons de Desconto
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {coupons.filter((c) => c.status === "active").length} ativo{coupons.filter((c) => c.status === "active").length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>

        <div className="space-y-4">
          {coupons.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-2xl">
              Nenhum cupom criado ainda.
            </p>
          ) : (
            coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition-all hover:border-white/20"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-white bg-slate-900 px-2 py-1 rounded-md border border-white/5">
                      {coupon.code}
                    </span>
                    <span
                      className={
                        coupon.status === "active"
                          ? "text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20"
                          : "text-xs font-semibold text-slate-500 bg-slate-800 px-2 py-1 rounded-full"
                      }
                    >
                      {coupon.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    <strong className="text-violet-300">
                      {Number(coupon.discountPercentage)}% OFF
                    </strong>{" "}
                    • Usos: {coupon.usedCount}{" "}
                    {coupon.usageLimit
                      ? `/ ${coupon.usageLimit}`
                      : "(Ilimitado)"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleCouponStatus(coupon.id, coupon.status)
                    }
                    className={`rounded-xl border border-white/10 p-2 transition ${coupon.status === "active" ? "bg-slate-900 text-amber-400 hover:bg-amber-400/10" : "bg-slate-900 text-emerald-400 hover:bg-emerald-400/10"}`}
                    title={
                      coupon.status === "active" ? "Desativar" : "Ativar"
                    }
                  >
                    {coupon.status === "active" ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon.id)}
                    className="rounded-xl border border-white/10 bg-slate-900 p-2 text-rose-400 transition hover:bg-rose-400/10"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL DE NOVO CUPOM */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-md rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-white">
                    Criar Cupom
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Gere um novo código promocional.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white bg-slate-950/50 p-2 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Código do Cupom
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: VERAO2026"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white uppercase outline-none focus:border-violet-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Desconto (%)
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      placeholder="Ex: 15"
                      value={newCoupon.discount}
                      onChange={(e) =>
                        setNewCoupon({ ...newCoupon, discount: e.target.value })
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Limite de Uso
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Vazio = Sem limite"
                      value={newCoupon.limit}
                      onChange={(e) =>
                        setNewCoupon({ ...newCoupon, limit: e.target.value })
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isCreatingCoupon}
                    className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingCoupon ? "Criando..." : "Criar Cupom"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isCreatingCoupon}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={couponToDelete !== null}
        title="Excluir cupom?"
        description="Esta ação exclui o cupom de forma permanente e não pode ser desfeita."
        confirmLabel="Confirmar exclusão"
        loading={isDeletingCoupon}
        onConfirm={handleCouponDeleteConfirm}
        onCancel={() => { if (!isDeletingCoupon) setCouponToDelete(null); }}
      />
    </div>
  );
}
