'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wine, UserSettings, PublicUser, PurchaseEntry, isTasted } from '@/lib/types';
import { WineRecommendation } from '@/lib/recommendations';
import { api, createWineApi, updateWineApi, WineSubmission } from '@/lib/api-client';
import { awaitingRating, reviewStatus, ReviewInput } from '@/lib/wine-logic';
import { canonicalShop } from '@/lib/shops';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { FilterBar, SortOption } from '@/components/FilterBar';
import { WineCard } from '@/components/WineCard';
import { WineDetailModal } from '@/components/WineDetailModal';
import { AddWineModal } from '@/components/AddWineModal';
import { ShelfCheckModal } from '@/components/ShelfCheckModal';
import { ActivityStrip } from '@/components/ActivityStrip';
import { InsightsView } from '@/components/InsightsView';
import { SettingsModal } from '@/components/SettingsModal';
import { RecommendedSection } from '@/components/RecommendedSection';
import { customShopsFrom, popularShopsFrom } from '@/components/ShopPicker';
import { ShopSheet } from '@/components/ShopSheet';
import { RateSheet } from '@/components/RateSheet';
import { ShoppingList } from '@/components/ShoppingList';
import { Toast, ToastState } from '@/components/Toast';
import { Wine as WineIcon, Plus, ChevronRight, Heart } from 'lucide-react';

interface CellarAppProps {
  me: PublicUser;
  partner: PublicUser | null;
}

const INITIAL_SETTINGS: UserSettings = {
  partner1Name: '',
  partner2Name: '',
  partner1Avatar: '',
  partner2Avatar: '',
  defaultCurrency: '£',
};

// How often to pick up your partner's changes while the app is open.
const REFRESH_MS = 30_000;

export function CellarApp({ me: initialMe, partner }: CellarAppProps) {
  const [me, setMe] = useState(initialMe);
  const [wines, setWines] = useState<Wine[]>([]);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Tab & filters
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVerdict, setActiveVerdict] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [activeShop, setActiveShop] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Sheets & Modals
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shopView, setShopView] = useState<string | null>(null);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);
  const [draft, setDraft] = useState<Partial<Wine> | null>(null);
  const [addMode, setAddMode] = useState<'tasted' | 'wishlist'>('tasted');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShelfCheckOpen, setIsShelfCheckOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [rateSession, setRateSession] = useState<{ queue: Wine[]; startAtSummary?: boolean } | null>(null);

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'info') => {
    setToast({ message, tone });
  }, []);

  const selectedWine = useMemo(() => wines.find((w) => w.id === selectedId) ?? null, [wines, selectedId]);
  const tastedWines = useMemo(() => wines.filter(isTasted), [wines]);
  const myTurn = useMemo(() => wines.filter((w) => awaitingRating(w, me.slot)), [wines, me.slot]);

  const loadWines = useCallback(async () => {
    try {
      const { wines: fresh } = await api<{ wines: Wine[] }>('/api/wines');
      setWines(fresh);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the cellar.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([
        loadWines(),
        api<{ settings: UserSettings }>('/api/settings')
          .then(({ settings: s }) => setSettings(s))
          .catch((err) => console.error('Error loading settings:', err)),
      ]);
      setIsLoading(false);
    })();
  }, [loadWines]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadWines();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadWines();
    }, REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [loadWines]);

  const upsert = (saved: Wine) =>
    setWines((prev) =>
      prev.some((w) => w.id === saved.id) ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev]
    );

  const handleSubmitWine = async (submission: WineSubmission, existingId?: string) => {
    const saved = existingId ? await updateWineApi(existingId, submission) : await createWineApi(submission);
    upsert(saved);
    notify(
      existingId
        ? 'Bottle updated.'
        : saved.tasted === false
          ? 'Saved to your To Try list.'
          : 'Bottle logged to your cellar.',
      'success'
    );
  };

  const quickUpdate = async (wine: Wine, changes: WineSubmission['changes'], okMessage?: string) => {
    try {
      upsert(await updateWineApi(wine.id, { changes }));
      if (okMessage) notify(okMessage, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'That change was not saved.', 'error');
    }
  };

  const handleUpdateStock = async (wine: Wine, nextStock: number) => {
    try {
      upsert(await updateWineApi(wine.id, { changes: { stock: nextStock } }));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update rack count.', 'error');
    }
  };

  const handleAddPurchase = async (wine: Wine, entry: PurchaseEntry, addStock: number) => {
    const prevHistory = wine.purchaseHistory ?? [];
    const nextHistory = [...prevHistory];
    // Preserve the prior purchase in history if it had a store or price and isn't already recorded
    if (
      (wine.purchase?.store || wine.purchase?.price > 0) &&
      !nextHistory.some(
        (h) =>
          h.date === (wine.purchase.date ?? '') &&
          h.store === canonicalShop(wine.purchase.store) &&
          h.price === wine.purchase.price
      )
    ) {
      nextHistory.unshift({
        id: `p-prev-${Date.now()}`,
        store: canonicalShop(wine.purchase.store),
        price: wine.purchase.price,
        currency: wine.purchase.currency || '£',
        date: wine.purchase.date || wine.createdAt.slice(0, 10),
        isSpecialOffer: wine.purchase.isSpecialOffer,
      });
    }
    nextHistory.unshift(entry);
    const nextStock = Math.min(99, (wine.stock ?? 0) + Math.max(0, addStock));

    const saved = await updateWineApi(wine.id, {
      changes: {
        purchase: {
          store: entry.store,
          price: entry.price,
          currency: entry.currency,
          date: entry.date,
          isSpecialOffer: entry.isSpecialOffer,
          notes: wine.purchase?.notes ?? '',
        },
        purchaseHistory: nextHistory.slice(0, 50),
        stock: nextStock,
      },
    });
    upsert(saved);
    notify(`Recorded purchase of ${wine.name}.`, 'success');
  };

  const handleRate = async (wineId: string, review: ReviewInput | null) => {
    upsert(await updateWineApi(wineId, { changes: {}, myReview: review }));
  };

  const handleDeleteWine = async (wine: Wine) => {
    await api(`/api/wines/${encodeURIComponent(wine.id)}`, { method: 'DELETE' });
    setWines((prev) => prev.filter((w) => w.id !== wine.id));
    setSelectedId(null);
    notify('Bottle deleted.', 'info');
  };

  const handleAddComment = async (wine: Wine, text: string) => {
    const { wine: saved } = await api<{ wine: Wine }>(`/api/wines/${encodeURIComponent(wine.id)}/comments`, {
      method: 'POST',
      body: { text },
    });
    upsert(saved);
  };

  const handleDeleteComment = async (wine: Wine, commentId: string) => {
    const { wine: saved } = await api<{ wine: Wine }>(
      `/api/wines/${encodeURIComponent(wine.id)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' }
    );
    upsert(saved);
  };

  const recommendationDraft = (rec: WineRecommendation): Partial<Wine> => ({
    name: rec.name,
    producer: rec.producer,
    type: rec.type,
    grape: rec.grape,
    region: rec.region,
    country: rec.country,
    purchase: { store: '', price: 0, currency: rec.currency },
    onlineLinks: rec.onlineLinks,
  });

  const handleAddRecommendationToWishlist = async (rec: WineRecommendation) => {
    const existing = wines.find((w) => w.name.toLowerCase() === rec.name.toLowerCase());
    if (existing) {
      const nextWishlist = !existing.wishlist;
      await quickUpdate(
        existing,
        { wishlist: nextWishlist },
        nextWishlist ? 'Added to To Try list.' : 'Removed from To Try list.'
      );
      return;
    }
    try {
      upsert(
        await createWineApi({
          changes: {
            ...recommendationDraft(rec),
            tasted: false,
            wishlist: true,
            jointNotes: [
              rec.reason && `Suggested: ${rec.reason}`,
              rec.estimatedPrice > 0 && `Around ${rec.currency}${rec.estimatedPrice.toFixed(2)}.`,
            ]
              .filter(Boolean)
              .join(' '),
          },
        })
      );
      notify(`Saved ${rec.name} to To Try.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Not added to the wishlist.', 'error');
    }
  };

  const handleSaveShelfDraftToWishlist = async (scannedDraft: Partial<Wine>) => {
    const saved = await createWineApi({
      changes: {
        ...scannedDraft,
        tasted: false,
        wishlist: true,
      },
    });
    upsert(saved);
    notify(`Saved ${saved.name} to To Try.`, 'success');
  };

  const openAdd = (opts: { editing?: Wine; draft?: Partial<Wine>; mode?: 'tasted' | 'wishlist' } = {}) => {
    setEditingWine(opts.editing ?? null);
    setDraft(opts.draft ?? null);
    setAddMode(opts.mode ?? 'tasted');
    setIsAddModalOpen(true);
  };

  // Counts for verdict, style & in-stock filters
  const verdictCounts = useMemo(() => {
    const c: Record<string, number> = { all: tastedWines.length };
    for (const w of tastedWines) c[w.coupleVerdict] = (c[w.coupleVerdict] || 0) + 1;
    return c;
  }, [tastedWines]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const w of tastedWines) c[w.type] = (c[w.type] || 0) + 1;
    return c;
  }, [tastedWines]);

  const inStockCount = useMemo(
    () => tastedWines.filter((w) => (w.stock ?? 0) > 0).length,
    [tastedWines]
  );

  const tastedShops = useMemo(() => {
    const set = new Set<string>();
    for (const w of tastedWines) {
      const s = canonicalShop(w.purchase?.store);
      if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tastedWines]);

  const filteredWines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tastedWines
      .filter((w) => {
        if (
          q &&
          ![w.name, w.producer, w.grape, w.region, w.country, w.purchase?.store, w.jointNotes]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(q))
        ) {
          return false;
        }
        if (activeVerdict !== 'all' && w.coupleVerdict !== activeVerdict) return false;
        if (activeType !== 'all' && w.type !== activeType) return false;
        if (activeShop !== 'all' && canonicalShop(w.purchase?.store) !== activeShop) return false;
        if (inStockOnly && !(w.stock && w.stock > 0)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
        if (sortBy === 'price-low') return (a.purchase?.price || 0) - (b.purchase?.price || 0);
        if (sortBy === 'price-high') return (b.purchase?.price || 0) - (a.purchase?.price || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tastedWines, searchQuery, activeVerdict, activeType, activeShop, inStockOnly, sortBy]);

  const searchedWines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return wines;
    return wines.filter((w) =>
      [w.name, w.producer, w.grape, w.region, w.country, w.purchase?.store]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [wines, searchQuery]);

  const customShops = useMemo(() => customShopsFrom(wines.map((w) => w.purchase?.store)), [wines]);
  const popularShops = useMemo(() => popularShopsFrom(wines.map((w) => w.purchase?.store), 6), [wines]);
  const wishlistWineNames = useMemo(() => wines.filter((w) => w.wishlist).map((w) => w.name.toLowerCase()), [wines]);
  const filtersActive = Boolean(
    searchQuery || activeVerdict !== 'all' || activeType !== 'all' || activeShop !== 'all' || inStockOnly
  );

  const resetFilters = () => {
    setSearchQuery('');
    setActiveVerdict('all');
    setActiveType('all');
    setActiveShop('all');
    setInStockOnly(false);
  };

  const namedSettings: UserSettings = {
    ...settings,
    partner1Name: me.slot === 1 ? me.name : partner?.name ?? settings.partner1Name,
    partner2Name: me.slot === 2 ? me.name : partner?.name ?? settings.partner2Name,
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        me={me}
        partner={partner}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 px-4 py-4 space-y-4 font-sans pb-28">
        {loadError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button type="button" onClick={loadWines} className="underline font-semibold flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {activeTab === 'shopping' ? (
          <ShoppingList
            wines={searchedWines}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            me={me}
            partner={partner}
            onOpen={(w) => setSelectedId(w.id)}
            onShopClick={setShopView}
            onLogWishlistWine={(w) => openAdd({ editing: w })}
            onAddToWishlist={() => openAdd({ mode: 'wishlist' })}
            onOpenShelfCheck={() => setIsShelfCheckOpen(true)}
          />
        ) : activeTab === 'recommendations' ? (
          <RecommendedSection
            settings={namedSettings}
            wines={wines}
            onAddToWishlist={handleAddRecommendationToWishlist}
            onLogAsTasted={(rec) => openAdd({ draft: recommendationDraft(rec), mode: 'tasted' })}
            onOpenWine={(w) => setSelectedId(w.id)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            wishlistWineNames={wishlistWineNames}
          />
        ) : activeTab === 'stats' ? (
          <InsightsView
            wines={tastedWines}
            me={me}
            partner={partner}
            settings={namedSettings}
            onSelectWine={(w) => setSelectedId(w.id)}
            onShopClick={setShopView}
          />
        ) : (
          <>
            {/* Partner Activity Strip */}
            <ActivityStrip
              wines={wines}
              me={me}
              partner={partner}
              onOpenWine={(w) => setSelectedId(w.id)}
            />

            {/* Awaiting Your Verdict Deck Card */}
            {myTurn.length > 0 && (
              <button
                type="button"
                onClick={() => setRateSession({ queue: myTurn, startAtSummary: false })}
                className="w-full p-4 rounded-2xl surface-highlight flex items-center justify-between gap-3 text-left transition-all hover:border-wine-300 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center -space-x-2 flex-shrink-0">
                    {myTurn.slice(0, 3).map((w) => (
                      <div
                        key={w.id}
                        className="w-10 h-12 rounded-lg overflow-hidden bg-white border border-wine-200 flex items-center justify-center shadow-sm"
                      >
                        {w.imageUrl ? (
                          <img src={w.imageUrl} alt={w.name} className="w-full h-full object-cover" />
                        ) : (
                          <Heart className="w-4 h-4 text-wine-700" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-wine-700">
                      Awaiting your verdict
                    </span>
                    <span className="block font-serif text-lg font-semibold text-ink-900 leading-tight truncate">
                      {myTurn.length === 1
                        ? `Rate ${myTurn[0].name}`
                        : `${myTurn.length} bottles ready to swipe`}
                    </span>
                    <span className="block text-xs text-ink-500 truncate mt-0.5">
                      {partner ? `${partner.name} logged` : 'Logged'} · Tap to swipe &amp; reveal
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-wine-700 flex-shrink-0" />
              </button>
            )}

            {/* Quick Verdict Summary Strip */}
            {tastedWines.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: 'loved-it',
                      label: 'Buy Again',
                      count: verdictCounts['loved-it'] ?? 0,
                      dotClass: 'bg-emerald-600',
                      activeClass: 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm',
                    },
                    {
                      id: 'good-value',
                      label: 'Great Value',
                      count: verdictCounts['good-value'] ?? 0,
                      dotClass: 'bg-sky-600',
                      activeClass: 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm',
                    },
                    {
                      id: 'bad',
                      label: 'Avoid',
                      count: verdictCounts['bad'] ?? 0,
                      dotClass: 'bg-rose-600',
                      activeClass: 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm',
                    },
                  ] as const
                ).map((item) => {
                  const selected = activeVerdict === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveVerdict(selected ? 'all' : item.id)}
                      aria-pressed={selected}
                      className={`px-3 py-2.5 rounded-2xl border text-left transition-all ${
                        selected
                          ? item.activeClass
                          : 'surface-card hover:border-linen-300 text-ink-900'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.dotClass}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="block font-serif text-xl font-bold tabular-nums mt-0.5">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeVerdict={activeVerdict}
              onSelectVerdict={setActiveVerdict}
              activeType={activeType}
              onSelectType={setActiveType}
              activeShop={activeShop}
              onSelectShop={setActiveShop}
              inStockOnly={inStockOnly}
              onToggleInStockOnly={() => setInStockOnly((v) => !v)}
              inStockCount={inStockCount}
              shops={tastedShops}
              sortBy={sortBy}
              onSortChange={setSortBy}
              verdictCounts={verdictCounts}
              typeCounts={typeCounts}
              totalFiltered={filteredWines.length}
              filtersActive={filtersActive}
              onResetFilters={resetFilters}
            />

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" aria-label="Loading cellar">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="surface-card rounded-2xl p-3.5 flex gap-3.5 animate-pulse"
                  >
                    <div className="w-20 h-[108px] rounded-xl bg-linen-200/70 flex-shrink-0" />
                    <div className="flex-1 space-y-2.5 py-1">
                      <div className="h-4 w-20 rounded-full bg-linen-200/70" />
                      <div className="h-5 w-3/4 rounded-lg bg-linen-200/70" />
                      <div className="h-3.5 w-1/2 rounded-lg bg-linen-200/70" />
                      <div className="h-3.5 w-2/3 rounded-lg bg-linen-200/70 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredWines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredWines.map((wine) => (
                  <WineCard
                    key={wine.id}
                    wine={wine}
                    me={me}
                    partner={partner}
                    onClick={() => setSelectedId(wine.id)}
                    onShopClick={setShopView}
                    onQuickRate={() => setRateSession({ queue: [wine], startAtSummary: false })}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 px-6 surface-card rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-linen-100 border border-linen-200 flex items-center justify-center mx-auto">
                  <WineIcon className="w-6 h-6 text-wine-700/60" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-ink-900">
                    {filtersActive ? 'No bottles match' : 'Your cellar is empty'}
                  </h3>
                  <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    {filtersActive
                      ? 'Try clearing your search or filters to see all bottles.'
                      : 'Snap your first bottle to start building your shared wine cellar.'}
                  </p>
                </div>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2.5 rounded-xl btn-secondary text-xs font-semibold"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAdd({ mode: 'tasted' })}
                    className="px-5 py-2.5 rounded-xl btn-primary text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log first bottle</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => openAdd({ mode: 'tasted' })}
        pendingCount={myTurn.length}
      />

      <WineDetailModal
        wine={selectedWine}
        me={me}
        partner={partner}
        onClose={() => setSelectedId(null)}
        onEdit={(w) => {
          setSelectedId(null);
          openAdd({ editing: w });
        }}
        onDelete={handleDeleteWine}
        onToggleWishlist={(w) =>
          quickUpdate(
            w,
            { wishlist: !w.wishlist },
            !w.wishlist ? 'Saved to To Try list.' : 'Removed from To Try list.'
          )
        }
        onRate={(w) =>
          setRateSession({
            queue: [w],
            startAtSummary: reviewStatus(w, me.slot) === 'rated',
          })
        }
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onUpdateStock={handleUpdateStock}
        onAddPurchase={handleAddPurchase}
        customShops={customShops}
        popularShops={popularShops}
        wishlistNames={wishlistWineNames}
        onAddToWishlist={handleAddRecommendationToWishlist}
        onShopClick={(shop) => {
          setSelectedId(null);
          setShopView(shop);
        }}
        onToast={notify}
      />

      {shopView && (
        <ShopSheet
          shop={shopView}
          wines={wines}
          me={me}
          partner={partner}
          onOpenWine={(w) => setSelectedId(w.id)}
          onClose={() => setShopView(null)}
        />
      )}

      <AddWineModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingWine(null);
          setDraft(null);
        }}
        me={me}
        partner={partner}
        settings={namedSettings}
        wines={wines}
        editingWine={editingWine}
        draft={draft}
        initialMode={addMode}
        onSubmit={handleSubmitWine}
        onOpenExisting={(w) => setSelectedId(w.id)}
        onLogBoughtAgain={handleAddPurchase}
        customShops={customShops}
        popularShops={popularShops}
      />

      <ShelfCheckModal
        isOpen={isShelfCheckOpen}
        onClose={() => setIsShelfCheckOpen(false)}
        me={me}
        partner={partner}
        hasGeminiKey={namedSettings.hasGeminiKey}
        onOpenExisting={(w) => setSelectedId(w.id)}
        onBoughtAgain={(w) => {
          setSelectedId(w.id);
        }}
        onSaveToTry={handleSaveShelfDraftToWishlist}
        onLogTasted={(d) => openAdd({ draft: d, mode: 'tasted' })}
      />

      {rateSession && (
        <RateSheet
          queue={rateSession.queue}
          me={me}
          partner={partner}
          startAtSummary={rateSession.startAtSummary}
          onRate={handleRate}
          onClose={() => setRateSession(null)}
        />
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        me={me}
        partner={partner}
        settings={namedSettings}
        wineCount={wines.length}
        onSettingsChanged={setSettings}
        onRenamed={setMe}
        onImported={setWines}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
