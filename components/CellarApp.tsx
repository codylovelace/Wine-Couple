'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wine, UserSettings, PublicUser, isTasted } from '@/lib/types';
import { WineRecommendation, bothLiked } from '@/lib/recommendations';
import { api, createWineApi, updateWineApi, WineSubmission } from '@/lib/api-client';
import { awaitingRating, ReviewInput } from '@/lib/wine-logic';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { FilterBar } from '@/components/FilterBar';
import { WineCard } from '@/components/WineCard';
import { WineDetailModal } from '@/components/WineDetailModal';
import { AddWineModal } from '@/components/AddWineModal';
import { CoupleStatsModal } from '@/components/CoupleStatsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { RecommendedSection } from '@/components/RecommendedSection';
import { RateSheet } from '@/components/RateSheet';
import { ShoppingList } from '@/components/ShoppingList';
import { Wine as WineIcon, Sparkles, Plus, ArrowUpDown, ChevronRight, Heart } from 'lucide-react';

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

  // Tab & filters
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'price-low' | 'price-high'>('newest');

  // Sheets
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);
  const [draft, setDraft] = useState<Partial<Wine> | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [rateQueue, setRateQueue] = useState<Wine[] | null>(null);

  // Always show the latest copy of the open wine, e.g. after a refresh
  // brings in your partner's comment.
  const selectedWine = useMemo(() => wines.find((w) => w.id === selectedId) ?? null, [wines, selectedId]);

  // Untasted wishlist picks have no verdict or rating, so they stay out of the
  // journal, counts, stats and the recommendation engine.
  const tastedWines = useMemo(() => wines.filter(isTasted), [wines]);
  const sharedFavourites = useMemo(() => bothLiked(wines).length, [wines]);
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

  // Pick up the other phone's changes: when the app comes back to the
  // foreground, and every so often while it's open.
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
    setWines((prev) => (prev.some((w) => w.id === saved.id) ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev]));

  const handleSubmitWine = async (submission: WineSubmission, existingId?: string) => {
    const saved = existingId ? await updateWineApi(existingId, submission) : await createWineApi(submission);
    upsert(saved);
  };

  const quickUpdate = async (wine: Wine, changes: WineSubmission['changes']) => {
    try {
      upsert(await updateWineApi(wine.id, { changes }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'That change was not saved.');
    }
  };

  const handleRate = async (wineId: string, review: ReviewInput | null) => {
    upsert(await updateWineApi(wineId, { changes: {}, myReview: review }));
  };

  const handleDeleteWine = async (wine: Wine) => {
    await api(`/api/wines/${encodeURIComponent(wine.id)}`, { method: 'DELETE' });
    setWines((prev) => prev.filter((w) => w.id !== wine.id));
    setSelectedId(null);
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
      await quickUpdate(existing, { wishlist: !existing.wishlist });
      return;
    }
    try {
      upsert(
        await createWineApi({
          changes: {
            ...recommendationDraft(rec),
            // Not tasted yet: no verdict or score of your own.
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Not added to the wishlist.');
    }
  };

  const openAdd = (opts: { editing?: Wine; draft?: Partial<Wine> } = {}) => {
    setEditingWine(opts.editing ?? null);
    setDraft(opts.draft ?? null);
    setIsAddModalOpen(true);
  };

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'stats') setIsStatsModalOpen(true);
    else setActiveTab(tab);
  };

  // Counts for the filter pills
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tastedWines.length };
    for (const w of tastedWines) c[w.coupleVerdict] = (c[w.coupleVerdict] || 0) + 1;
    return c;
  }, [tastedWines]);

  const filteredWines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wines
      .filter((w) => {
        if (!isTasted(w)) return false;
        if (
          q &&
          ![w.name, w.producer, w.grape, w.region, w.country, w.purchase?.store, w.jointNotes]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(q))
        ) {
          return false;
        }
        if (activeVerdict !== 'all' && (!isTasted(w) || w.coupleVerdict !== activeVerdict)) return false;
        if (activeType !== 'all' && w.type !== activeType) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
        if (sortBy === 'price-low') return (a.purchase?.price || 0) - (b.purchase?.price || 0);
        if (sortBy === 'price-high') return (b.purchase?.price || 0) - (a.purchase?.price || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [wines, searchQuery, activeVerdict, activeType, sortBy]);

  // The shopping tab honours the search box too.
  const searchedWines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return wines;
    return wines.filter((w) =>
      [w.name, w.producer, w.grape, w.region, w.country, w.purchase?.store]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [wines, searchQuery]);

  const wishlistWineNames = useMemo(() => wines.filter((w) => w.wishlist).map((w) => w.name.toLowerCase()), [wines]);
  const filtersActive = Boolean(searchQuery || activeVerdict !== 'all' || activeType !== 'all');

  // Names come from the accounts; settings only fills them in once loaded.
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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 px-4 py-3 space-y-3.5 font-sans pb-28">
        {loadError && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-sm text-rose-100 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={loadWines} className="underline font-semibold flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {activeTab === 'shopping' ? (
          <>
            <h2 className="font-serif text-2xl text-stone-100 font-semibold px-1">Shopping</h2>
            <ShoppingList wines={searchedWines} me={me} partner={partner} onOpen={(w) => setSelectedId(w.id)} />
          </>
        ) : activeTab === 'recommendations' ? (
          <RecommendedSection
            settings={namedSettings}
            onAddToWishlist={handleAddRecommendationToWishlist}
            onLogAsTasted={(rec) => openAdd({ draft: recommendationDraft(rec) })}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            wishlistWineNames={wishlistWineNames}
          />
        ) : (
          <>
            {/* Wines your partner logged that you haven't rated */}
            {activeTab === 'journal' && myTurn.length > 0 && (
              <button
                onClick={() => setRateQueue(myTurn)}
                className="w-full p-3.5 rounded-2xl bg-wine-950/80 border border-champagne-500/45 flex items-center justify-between gap-3 text-left shadow-md"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-black/60 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
                    <Heart className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-stone-100">Your turn to rate</span>
                    <span className="block text-xs text-stone-300 truncate">
                      {myTurn.length === 1 ? myTurn[0].name : `${myTurn.length} wines`}
                      {partner ? ` ${partner.name} logged` : ''}
                    </span>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-champagne-400 flex-shrink-0" />
              </button>
            )}

            {activeTab === 'journal' && sharedFavourites > 0 && myTurn.length === 0 && (
              <button
                onClick={() => setActiveTab('recommendations')}
                className="w-full p-3.5 rounded-2xl luxury-card flex items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-wine-900/70 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-stone-100">Ideas for your next bottle</span>
                    <span className="block text-xs text-stone-300 truncate">Suggestions based on wines you both liked</span>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-champagne-400 flex-shrink-0" />
              </button>
            )}

            {activeTab === 'journal' && (
              <FilterBar
                activeVerdict={activeVerdict}
                onSelectVerdict={setActiveVerdict}
                activeType={activeType}
                onSelectType={setActiveType}
                counts={counts}
              />
            )}

            <div className="flex items-center justify-between text-xs text-stone-300 px-1">
              <span>
                <strong>{filteredWines.length}</strong> {filteredWines.length === 1 ? 'bottle' : 'bottles'}
              </span>
              <label className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-champagne-400" />
                <span className="sr-only">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-stone-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#0f0a0d]">Newest first</option>
                  <option value="rating" className="bg-[#0f0a0d]">Highest rated</option>
                  <option value="price-low" className="bg-[#0f0a0d]">Cheapest first</option>
                  <option value="price-high" className="bg-[#0f0a0d]">Priciest first</option>
                </select>
              </label>
            </div>

            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <WineIcon className="w-10 h-10 text-champagne-500/40 animate-pulse mx-auto" />
                <p className="text-xs text-stone-300">Loading your cellar…</p>
              </div>
            ) : filteredWines.length > 0 ? (
              <div className="space-y-3">
                {filteredWines.map((wine) => (
                  <WineCard key={wine.id} wine={wine} me={me} partner={partner} onClick={() => setSelectedId(wine.id)} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 px-6">
                <div className="w-16 h-16 rounded-3xl bg-black/70 border border-champagne-500/25 flex items-center justify-center mx-auto">
                  <WineIcon className="w-7 h-7 text-champagne-400/60" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-stone-100">
                    {filtersActive ? 'No wines match' : 'No wines yet'}
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
                    {filtersActive
                      ? 'Try clearing the search or filters.'
                      : 'Log your first bottle to start your shared cellar.'}
                  </p>
                </div>
                {filtersActive ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveVerdict('all');
                      setActiveType('all');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 text-stone-100 text-sm font-semibold border border-white/15"
                  >
                    Clear filters
                  </button>
                ) : (
                  activeTab === 'journal' && (
                    <button
                      onClick={() => openAdd()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-champagne-gold" />
                      <span>Log first bottle</span>
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} onOpenAddModal={() => openAdd()} />

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
        onToggleWishlist={(w) => quickUpdate(w, { wishlist: !w.wishlist })}
        onRate={(w) => setRateQueue([w])}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />

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
        editingWine={editingWine}
        draft={draft}
        onSubmit={handleSubmitWine}
      />

      {rateQueue && (
        <RateSheet queue={rateQueue} me={me} partner={partner} onRate={handleRate} onClose={() => setRateQueue(null)} />
      )}

      <CoupleStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        wines={tastedWines}
        settings={namedSettings}
        onSelectWine={(w) => setSelectedId(w.id)}
      />

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
    </div>
  );
}
