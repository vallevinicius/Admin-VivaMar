'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';

import { BedDouble, Settings2, Plus, Trash2, CircleDollarSign, Save, X, Edit2 } from 'lucide-react';

import { useToast } from '@/components/toast-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfirmDialog } from '@/components/confirm-dialog';

type RoomOperationalStatus = 'vacant' | 'cleaning' | 'awaiting_guest' | 'maintenance' | 'occupied';

type RoomSnapshot = {
  id: string;
  room: string;
  category: string;
  status: RoomOperationalStatus;
  updatedAt: string;
  note: string;
};

type RoomData = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  maxGuests: number;
  status: 'active' | 'maintenance';
  amenities?: string;
};

function getSnapshotUnitNumber(snapshotId: string) {
  const lastUnderscore = snapshotId.lastIndexOf('_');
  if (lastUnderscore === -1) return 1;

  const unitNumber = Number.parseInt(snapshotId.slice(lastUnderscore + 1), 10);
  return Number.isInteger(unitNumber) && unitNumber > 0 ? unitNumber : 1;
}

function getSnapshotGroupKey(snapshotId: string) {
  const lastUnderscore = snapshotId.lastIndexOf('_');
  return lastUnderscore === -1 ? snapshotId : snapshotId.slice(0, lastUnderscore);
}

function roomStatusBadge(status: RoomOperationalStatus) {
  if (status === 'vacant') {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25';
  }

  if (status === 'cleaning') {
    return 'bg-amber-500/10 text-amber-200 border-amber-400/30';
  }

  if (status === 'awaiting_guest') {
    return 'bg-sky-500/10 text-sky-200 border-sky-400/30';
  }

  if (status === 'maintenance') {
    return 'bg-rose-500/10 text-rose-200 border-rose-400/30';
  }

  return 'bg-indigo-500/10 text-indigo-200 border-indigo-400/30';
}

function roomStatusLabel(status: RoomOperationalStatus) {
  if (status === 'vacant') {
    return 'Vaga';
  }

  if (status === 'cleaning') {
    return 'Limpando';
  }

  if (status === 'awaiting_guest') {
    return 'Esperando hóspede';
  }

  if (status === 'maintenance') {
    return 'Manutenção';
  }

  return 'Ocupado';
}

export default function RoomsPage() {
  const { showToast } = useToast();
  const [snapshots, setSnapshots] = useState<RoomSnapshot[]>([]);
  const [selectedSnapshotByGroup, setSelectedSnapshotByGroup] = useState<Record<string, string>>({});
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  const [amenitiesTab, setAmenitiesTab] = useState<'preset' | 'custom'>('preset');
  const [editAmenitiesTab, setEditAmenitiesTab] = useState<'preset' | 'custom'>('preset');
  const [roomBeingEdited, setRoomBeingEdited] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    price: '',
    quantity: '1',
    maxGuests: '2',
    selectedAmenities: [] as string[],
    customAmenities: '',
  });
  const [editRoom, setEditRoom] = useState({
    name: '',
    price: '',
    quantity: '1',
    maxGuests: '2',
    selectedAmenities: [] as string[],
    customAmenities: '',
  });

  const PRESET_AMENITIES = [
    'WiFi',
    'Ar Condicionado',
    'TV Tela Plana',
    'Minibar',
    'Cofre',
    'Frigobar',
    'Chaleira Elétrica',
    'Secador de Cabelo',
    'Amenities de Banho',
    'Roupão de Banho',
    'Cama Premium',
    'Trabalho de Mesas',
    'Serviço de Quarto',
    'Limpeza Diária',
  ];

  const normalizeAmenity = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const PRESET_AMENITIES_MAP = new Map(
    PRESET_AMENITIES.map((amenity) => [normalizeAmenity(amenity), amenity]),
  );

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const cents = numericValue.slice(-2) || '00';
    const reais = numericValue.slice(0, -2) || '0';
    return `${reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
  };

  const toggleAmenity = (amenity: string) => {
    setNewRoom((prev) => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenity)
        ? prev.selectedAmenities.filter((a) => a !== amenity)
        : [...prev.selectedAmenities, amenity],
    }));
  };

  const toggleAmenityEdit = (amenity: string) => {
    setEditRoom((prev) => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenity)
        ? prev.selectedAmenities.filter((a) => a !== amenity)
        : [...prev.selectedAmenities, amenity],
    }));
  };

  const openEditModal = (room: RoomData) => {
    const currentAmenities = room.amenities || '[]';
    let parsedAmenities: string[] = [];
    try {
      const parsed = JSON.parse(currentAmenities);
      parsedAmenities = Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      parsedAmenities = currentAmenities
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    const selectedAmenities = Array.from(
      new Set(
        parsedAmenities
          .map((amenity) => PRESET_AMENITIES_MAP.get(normalizeAmenity(amenity)))
          .filter((amenity): amenity is string => Boolean(amenity)),
      ),
    );

    const customAmenities = Array.from(
      new Set(
        parsedAmenities.filter(
          (amenity) => !PRESET_AMENITIES_MAP.has(normalizeAmenity(amenity)),
        ),
      ),
    ).join(', ');

    setEditRoom({
      name: room.name,
      price: (room.price * 100).toString(),
      quantity: room.quantity.toString(),
      maxGuests: room.maxGuests.toString(),
      selectedAmenities,
      customAmenities,
    });
    setRoomBeingEdited(room.id);
    setEditAmenitiesTab('preset');
    setIsEditModalOpen(true);
  };

  const handleUpdateRoom = async (e: FormEvent) => {
    e.preventDefault();

    if (!editRoom.name.trim()) {
      showToast('Nome do quarto é obrigatório');
      return;
    }

    if (!roomBeingEdited) {
      showToast('Erro ao atualizar quarto');
      return;
    }

    const priceInCents = parseInt(editRoom.price, 10);
    const price = priceInCents / 100;
    const quantity = parseInt(editRoom.quantity, 10);
    const maxGuests = parseInt(editRoom.maxGuests, 10);

    if (!Number.isFinite(price) || price < 0) {
      showToast('Preço inválido');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showToast('Quantidade deve ser um número inteiro maior que zero');
      return;
    }

    if (!Number.isInteger(maxGuests) || maxGuests < 1) {
      showToast('Capacidade deve ser um número inteiro maior que zero');
      return;
    }

    try {
      const res = await fetch(`/api/tenant/rooms/${roomBeingEdited}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRoom.name.trim(),
          price,
          quantity,
          maxGuests,
          amenities: [
            ...editRoom.selectedAmenities,
            ...(editRoom.customAmenities
              .split(',')
              .map((a) => a.trim())
              .filter((a) => a)),
          ],
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setRoomBeingEdited(null);
        fetchRooms();
        showToast('Quarto atualizado com sucesso!');
      } else {
        const error = await res.json();
        showToast(`Erro: ${error.error || 'Não foi possível atualizar'}`);
      }
    } catch (error) {
      showToast('Erro de conexão ao atualizar quarto');
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchSnapshots();
  }, []);

  async function fetchSnapshots() {
    setLoadingSnapshots(true);
    try {
      const res = await fetch('/api/tenant/rooms/panel');
      const data = await res.json();
      if (data.snapshots) setSnapshots(data.snapshots);
    } catch (error) {
      console.error('Erro ao carregar painel de quartos:', error);
      showToast('Erro ao carregar painel de quartos');
    } finally {
      setLoadingSnapshots(false);
    }
  }

  async function fetchRooms() {
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/inventory');
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
    } catch (error) {
      console.error('Erro ao carregar quartos:', error);
      showToast('Erro ao carregar quartos');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: RoomOperationalStatus) {
    const now = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    setSnapshots((prev) => prev.map((room) => (room.id === id ? { ...room, status, updatedAt: now } : room)));
    try {
      await fetch(`/api/tenant/rooms/panel/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      showToast('Erro ao salvar status');
    }
  }

  const handlePriceChange = (roomId: string, value: string) => {
    setEditingPrices((prev) => ({ ...prev, [roomId]: value }));
  };

  const savePriceChange = async (roomId: string) => {
    const newPrice = editingPrices[roomId];
    if (!newPrice) return;

    try {
      const res = await fetch(`/api/tenant/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) }),
      });

      if (res.ok) {
        showToast('Preço atualizado com sucesso!');
        fetchRooms();
        setEditingPrices((prev) => {
          const newState = { ...prev };
          delete newState[roomId];
          return newState;
        });
      } else {
        const error = await res.json();
        showToast(`Erro: ${error.error || 'Não foi possível atualizar'}`);
      }
    } catch (error) {
      showToast('Erro de conexão ao atualizar preço');
    }
  };

  const handleQuantityChange = (roomId: string, value: string) => {
    setEditingQuantities((prev) => ({ ...prev, [roomId]: value }));
  };

  const saveQuantityChange = async (roomId: string) => {
    const newQuantity = editingQuantities[roomId];
    if (!newQuantity) return;

    const qty = parseInt(newQuantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      showToast('Quantidade deve ser um número inteiro maior que zero');
      return;
    }

    try {
      const res = await fetch(`/api/tenant/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });

      if (res.ok) {
        showToast('Quantidade atualizada com sucesso!');
        fetchRooms();
        setEditingQuantities((prev) => {
          const newState = { ...prev };
          delete newState[roomId];
          return newState;
        });
      } else {
        const error = await res.json();
        showToast(`Erro: ${error.error || 'Não foi possível atualizar'}`);
      }
    } catch (error) {
      showToast('Erro de conexão ao atualizar quantidade');
    }
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();

    if (!newRoom.name.trim()) {
      showToast('Nome do quarto é obrigatório');
      return;
    }

    const priceInCents = parseInt(newRoom.price, 10);
    const price = priceInCents / 100;
    const quantity = parseInt(newRoom.quantity, 10);
    const maxGuests = parseInt(newRoom.maxGuests, 10);

    if (!Number.isFinite(price) || price < 0) {
      showToast('Preço inválido');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showToast('Quantidade deve ser um número inteiro maior que zero');
      return;
    }

    if (!Number.isInteger(maxGuests) || maxGuests < 1) {
      showToast('Capacidade deve ser um número inteiro maior que zero');
      return;
    }

    try {
      const res = await fetch('/api/tenant/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoom.name.trim(),
          price,
          quantity,
          maxGuests,
          amenities: [
            ...newRoom.selectedAmenities,
            ...(newRoom.customAmenities
              .split(',')
              .map((a) => a.trim())
              .filter((a) => a)),
          ],
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewRoom({ name: '', price: '', quantity: '1', maxGuests: '2', selectedAmenities: [], customAmenities: '' });
        fetchRooms();
        showToast('Quarto criado com sucesso!');
      } else {
        const error = await res.json();
        showToast(`Erro: ${error.error || 'Não foi possível criar'}`);
      }
    } catch (error) {
      showToast('Erro de conexão ao criar quarto');
    }
  };

  const deleteRoom = (roomId: string) => {
    setRoomToDelete(roomId);
  };

  const handleRoomDeleteConfirm = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    try {
      const res = await fetch(`/api/tenant/rooms/${roomToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Quarto removido com sucesso!');
        setRoomToDelete(null);
        fetchRooms();
      } else {
        const error = await res.json();
        showToast(`Erro: ${error.error || 'Não foi possível remover'}`);
      }
    } catch (error) {
      showToast('Erro de conexão ao remover quarto');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const totals = {
    vacant: snapshots.filter((room) => room.status === 'vacant').length,
    cleaning: snapshots.filter((room) => room.status === 'cleaning').length,
    awaitingGuest: snapshots.filter((room) => room.status === 'awaiting_guest').length,
    maintenance: snapshots.filter((room) => room.status === 'maintenance').length,
    occupied: snapshots.filter((room) => room.status === 'occupied').length,
  };

  const groupedSnapshots = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; category: string; snapshots: RoomSnapshot[] }
    >();

    for (const snapshot of snapshots) {
      const key = getSnapshotGroupKey(snapshot.id);
      const current = groups.get(key);

      if (current) {
        current.snapshots.push(snapshot);
      } else {
        groups.set(key, {
          key,
          category: snapshot.category,
          snapshots: [snapshot],
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        snapshots: [...group.snapshots].sort(
          (a, b) => getSnapshotUnitNumber(a.id) - getSnapshotUnitNumber(b.id),
        ),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));
  }, [snapshots]);

  useEffect(() => {
    setSelectedSnapshotByGroup((prev) => {
      const next: Record<string, string> = {};
      let hasChanges = false;

      for (const group of groupedSnapshots) {
        const previousSelection = prev[group.key];
        const isSelectionValid = group.snapshots.some((snapshot) => snapshot.id === previousSelection);
        next[group.key] = isSelectionValid ? previousSelection : group.snapshots[0]?.id ?? '';
        if (next[group.key] !== previousSelection) {
          hasChanges = true;
        }
      }

      if (Object.keys(prev).length !== Object.keys(next).length) {
        hasChanges = true;
      }

      return hasChanges ? next : prev;
    });
  }, [groupedSnapshots]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Governança operacional</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Painel de quartos</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Gerencie seus quartos: visualize status operacional, configure preços, quantidade de unidades e crie novos quartos.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            Ideal para troca rápida de turno.
          </div>
        </div>
      </section>

      {/* STATUS TOTALS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Vaga</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-100">{totals.vacant}</p>
        </article>
        <article className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Limpando</p>
          <p className="mt-2 text-2xl font-semibold text-amber-100">{totals.cleaning}</p>
        </article>
        <article className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Esperando hóspede</p>
          <p className="mt-2 text-2xl font-semibold text-sky-100">{totals.awaitingGuest}</p>
        </article>
        <article className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Manutenção</p>
          <p className="mt-2 text-2xl font-semibold text-rose-100">{totals.maintenance}</p>
        </article>
        <article className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Ocupado</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-100">{totals.occupied}</p>
        </article>
      </section>

      {/* OPERATIONAL STATUS */}
      <section className="grid gap-3 lg:grid-cols-2">
        {loadingSnapshots ? (
          <p className="col-span-2 text-slate-400">Carregando quartos...</p>
        ) : snapshots.length === 0 ? (
          <p className="col-span-2 text-sm text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-2xl">
            Nenhum quarto cadastrado. Crie um novo na seção abaixo.
          </p>
        ) : null}
        {groupedSnapshots.map((group) => {
          const selectedSnapshotId = selectedSnapshotByGroup[group.key] ?? group.snapshots[0]?.id;
          const selectedSnapshot = group.snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? group.snapshots[0];

          if (!selectedSnapshot) {
            return null;
          }

          return (
            <article key={group.key} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-sky-300" />
                <div>
                  <p className="font-medium text-white">{group.category}</p>
                  <p className="text-xs text-slate-400">Unidade {getSnapshotUnitNumber(selectedSnapshot.id)}</p>
                </div>
              </div>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${roomStatusBadge(selectedSnapshot.status)}`}>
                {roomStatusLabel(selectedSnapshot.status)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{selectedSnapshot.note}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Settings2 className="h-3.5 w-3.5" /> Atualizado: {selectedSnapshot.updatedAt}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSnapshot.id}
                  onChange={(e) =>
                    setSelectedSnapshotByGroup((prev) => ({
                      ...prev,
                      [group.key]: e.target.value,
                    }))
                  }
                  className="cursor-pointer rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 outline-none ring-sky-300 transition focus:ring"
                >
                  {group.snapshots.map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      Quarto {getSnapshotUnitNumber(snapshot.id)}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSnapshot.status}
                  onChange={(e) => updateStatus(selectedSnapshot.id, e.target.value as RoomOperationalStatus)}
                  className="cursor-pointer rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 outline-none ring-sky-300 transition focus:ring"
                >
                  <option value="vacant">Vaga</option>
                  <option value="cleaning">Limpando</option>
                  <option value="awaiting_guest">Esperando hóspede</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="occupied">Ocupado</option>
                </select>
              </div>
            </div>
          </article>
          );
        })}
      </section>

      {/* PRICING & INVENTORY MANAGEMENT */}
      <section className="rounded-[30px] border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-2">
              <CircleDollarSign className="h-5 w-5 text-sky-300" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              Gestão de Preços e Inventário
            </h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" /> Novo Quarto
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Carregando quartos...</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-2xl">
            Nenhum quarto configurado. Crie um novo para começar.
          </p>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition-all hover:border-white/20"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">{room.name}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                    Até {room.maxGuests} {room.maxGuests === 1 ? 'hóspede' : 'hóspedes'}
                  </p>
                </div>

                {/* Preço */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm font-medium">R$</span>
                    <input
                      type="number"
                      placeholder={String(room.price)}
                      value={editingPrices[room.id] ?? ''}
                      onChange={(e) => handlePriceChange(room.id, e.target.value)}
                      className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    />
                    {editingPrices[room.id] && (
                      <button
                        onClick={() => savePriceChange(room.id)}
                        className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        title="Salvar Novo Preço"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm font-medium">Qtd:</span>
                    <input
                      type="number"
                      placeholder={String(room.quantity)}
                      value={editingQuantities[room.id] ?? ''}
                      onChange={(e) => handleQuantityChange(room.id, e.target.value)}
                      className="w-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                      min="1"
                    />
                    {editingQuantities[room.id] && (
                      <button
                        onClick={() => saveQuantityChange(room.id)}
                        className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        title="Salvar Nova Quantidade"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(room)}
                    className="rounded-xl border border-white/10 bg-slate-900 p-2 text-blue-400 transition hover:bg-blue-400/10"
                    title="Editar Quarto"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteRoom(room.id)}
                    className="rounded-xl border border-white/10 bg-slate-900 p-2 text-rose-400 transition hover:bg-rose-400/10"
                    title="Remover Quarto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL DE NOVO QUARTO */}
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
                    Criar Quarto
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Configure um novo quarto para sua pousada.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white bg-slate-950/50 p-2 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Nome do Quarto
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Suíte Atlântico"
                    value={newRoom.name}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Preço Diário (R$)
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="0,00"
                      value={formatCurrency(newRoom.price)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setNewRoom({ ...newRoom, price: rawValue });
                      }}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Quantidade
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1"
                      value={newRoom.quantity}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, quantity: e.target.value })
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Capacidade Máxima (hóspedes)
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2"
                    value={newRoom.maxGuests}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, maxGuests: e.target.value })
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>

                {/* COMODIDADES */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-slate-200">Comodidades</p>
                  
                  {/* TABS */}
                  <div className="flex gap-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setAmenitiesTab('preset')}
                      className={`px-3 py-2 text-xs font-semibold transition ${
                        amenitiesTab === 'preset'
                          ? 'border-b-2 border-sky-400 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pré-selecionadas
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmenitiesTab('custom')}
                      className={`px-3 py-2 text-xs font-semibold transition ${
                        amenitiesTab === 'custom'
                          ? 'border-b-2 border-sky-400 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Customizadas
                    </button>
                  </div>

                  {/* PRESET AMENITIES */}
                  {amenitiesTab === 'preset' && (
                    <div className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_AMENITIES.map((amenity) => (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenity(amenity)}
                            className={`rounded-xl border-2 px-3 py-2 text-xs font-medium transition ${
                              newRoom.selectedAmenities.includes(amenity)
                                ? 'border-sky-400 bg-sky-400/20 text-sky-300'
                                : 'border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CUSTOM AMENITIES */}
                  {amenitiesTab === 'custom' && (
                    <div className="space-y-3 pt-3">
                      <input
                        type="text"
                        placeholder="Separe por vírgula (ex: Churrasqueira, Piscina)"
                        value={newRoom.customAmenities}
                        onChange={(e) =>
                          setNewRoom({
                            ...newRoom,
                            customAmenities: e.target.value,
                          })
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                      />
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-slate-400">Comodidades selecionadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ...newRoom.selectedAmenities,
                            ...(newRoom.customAmenities
                              .split(',')
                              .map((a) => a.trim())
                              .filter((a) => a)),
                          ].map((amenity) => (
                            <span
                              key={amenity}
                              className="inline-block rounded-lg bg-sky-400/20 px-2.5 py-1.5 text-xs text-sky-300 font-medium"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                  >
                    Criar Quarto
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO DE QUARTO */}
      <AnimatePresence>
        {isEditModalOpen && (
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
                    Editar Quarto
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Atualize as informações do quarto.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white bg-slate-950/50 p-2 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRoom} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Nome do Quarto
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Suíte Atlântico"
                    value={editRoom.name}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Preço Diário (R$)
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="0,00"
                      value={formatCurrency(editRoom.price)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setEditRoom({ ...editRoom, price: rawValue });
                      }}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Quantidade
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1"
                      value={editRoom.quantity}
                      onChange={(e) =>
                        setEditRoom({ ...editRoom, quantity: e.target.value })
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Capacidade Máxima (hóspedes)
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2"
                    value={editRoom.maxGuests}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, maxGuests: e.target.value })
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>

                {/* COMODIDADES */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-slate-200">Comodidades</p>
                  
                  {/* TABS */}
                  <div className="flex gap-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditAmenitiesTab('preset')}
                      className={`px-3 py-2 text-xs font-semibold transition ${
                        editAmenitiesTab === 'preset'
                          ? 'border-b-2 border-sky-400 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pré-selecionadas
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAmenitiesTab('custom')}
                      className={`px-3 py-2 text-xs font-semibold transition ${
                        editAmenitiesTab === 'custom'
                          ? 'border-b-2 border-sky-400 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Customizadas
                    </button>
                  </div>

                  {/* PRESET AMENITIES */}
                  {editAmenitiesTab === 'preset' && (
                    <div className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_AMENITIES.map((amenity: string) => (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenityEdit(amenity)}
                            className={`rounded-xl border-2 px-3 py-2 text-xs font-medium transition ${
                              editRoom.selectedAmenities.includes(amenity)
                                ? 'border-sky-400 bg-sky-400/20 text-sky-300'
                                : 'border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CUSTOM AMENITIES */}
                  {editAmenitiesTab === 'custom' && (
                    <div className="space-y-3 pt-3">
                      <input
                        type="text"
                        placeholder="Separe por vírgula (ex: Churrasqueira, Piscina)"
                        value={editRoom.customAmenities}
                        onChange={(e) =>
                          setEditRoom({
                            ...editRoom,
                            customAmenities: e.target.value,
                          })
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
                      />
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-slate-400">Comodidades selecionadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ...editRoom.selectedAmenities,
                            ...(editRoom.customAmenities
                              .split(',')
                              .map((a) => a.trim())
                              .filter((a) => a)),
                          ].map((amenity) => (
                            <span
                              key={amenity}
                              className="inline-block rounded-lg bg-sky-400/20 px-2.5 py-1.5 text-xs text-sky-300 font-medium"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                  >
                    Atualizar Quarto
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
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
        open={roomToDelete !== null}
        title="Remover quarto?"
        description="Esta ação remove o quarto de forma permanente e não pode ser desfeita."
        confirmLabel="Confirmar remoção"
        loading={isDeletingRoom}
        onConfirm={handleRoomDeleteConfirm}
        onCancel={() => { if (!isDeletingRoom) setRoomToDelete(null); }}
      />
    </div>
  );
}

