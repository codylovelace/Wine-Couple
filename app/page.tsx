'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Wine, UserSettings } from '@/lib/types';
import { WineRecommendation, getRecommendationsForCouple } from '@/lib/recommendations';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { FilterBar } from '@/components/FilterBar';
import { WineCard } from '@/components/WineCard';
import { WineDetailModal } from '@/components/WineDetailModal';
import { AddWineModal } from '@/components/AddWineModal';
import { CoupleStatsModal } from '@/components/CoupleStatsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { RecommendedSection } from '@/components/RecommendedSection';
import { 
  Wine as WineIcon, Sparkles, Plus, Bookmark, 
  ArrowUpDown, ChevronRight
} from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  partner1Name: 'Cody',
  partner2Name: 'Jess',
  partner1Avatar: 'C',
  partner2Avatar: 'J',
  defaultCurrency: '£',
};

export default function HomePage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'price-low' | 'price-high'>('newest');

  // Modals
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Recommendations
  const recommendations = useMemo(() => {
    return getRecommendationsForCouple(wines);
  }, [wines]);

  // Initial Fetch
  useEffect(() => {
    async function loadData() {
      try {
        const [winesRes, settingsRes] = await Promise.all([
          fetch('/api/wines'),
          fetch('/api/settings'),
        ]);
        const winesData = await winesRes.json();
        const settingsData = await settingsRes.json();

        if (winesData.success && winesData.wines) {
          setWines(winesData.wines);
        }
        if (settingsData.success && settingsData.settings) {
          setSettings(settingsData.settings);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Save new or edited wine
  const handleSaveWine = async (wine: Wine) => {
    setWines((prev) => {
      const idx = prev.findIndex((w) => w.id === wine.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = wine;
        return next;
      }
      return [wine, ...prev];
    });

    try {
      await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wine),
      });
    } catch (err) {
      console.error('Error saving wine to API:', err);
    }
  };

  // Bulk import wines
  const handleImportWines = async (imported: Wine[]) => {
    setWines(imported);
    try {
      await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wines: imported }),
      });
    } catch (err) {
      console.error('Error importing wines to API:', err);
    }
  };

  // Delete wine
  const handleDeleteWine = async (id: string) => {
    setWines((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch(`/api/wines/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting wine:', err);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (wine: Wine) => {
    const updated = { ...wine, favorite: !wine.favorite };
    handleSaveWine(updated);
    if (selectedWine?.id === wine.id) setSelectedWine(updated);
  };

  // Toggle Wishlist
  const handleToggleWishlist = async (wine: Wine) => {
    const updated = { ...wine, wishlist: !wine.wishlist };
    handleSaveWine(updated);
    if (selectedWine?.id === wine.id) setSelectedWine(updated);
  };

  // Handle recommendation -> Wishlist
  const handleAddRecommendationToWishlist = (rec: WineRecommendation) => {
    const existing = wines.find((w) => w.name.toLowerCase() === rec.name.toLowerCase());
    if (existing) {
      handleToggleWishlist(existing);
      return;
    }

    const newWishlistWine: Wine = {
      id: `wishlist-${Date.now()}`,
      name: rec.name,
      producer: rec.producer,
      vintage: rec.vintage,
      type: rec.type,
      grape: rec.grape,
      region: rec.region,
      country: rec.country,
      imageUrl: rec.imageUrl,
      coupleVerdict: 'loved-it',
      averageRating: 4.8,
      tastedTogether: true,
      body: 4,
      sweetness: 1,
      tannin: 3,
      acidity: 3,
      aromaTags: rec.flavorNotes,
      foodPairings: rec.foodPairings,
      purchase: {
        store: 'Online Selection',
        price: rec.estimatedPrice,
        currency: rec.currency,
        date: new Date().toISOString().split('T')[0],
      },
      onlineLinks: rec.onlineLinks,
      wishlist: true,
      favorite: false,
      jointNotes: `Curated for our cellar: ${rec.matchedReason}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handleSaveWine(newWishlistWine);
  };

  // Handle recommendation -> Log tasting
  const handleLogRecommendationAsTasted = (rec: WineRecommendation) => {
    setEditingWine({
      id: `wine-${Date.now()}`,
      name: rec.name,
      producer: rec.producer,
      vintage: rec.vintage,
      type: rec.type,
      grape: rec.grape,
      region: rec.region,
      country: rec.country,
      imageUrl: rec.imageUrl,
      coupleVerdict: 'good-value',
      averageRating: 4.5,
      tastedTogether: true,
      body: 4,
      sweetness: 1,
      tannin: 3,
      acidity: 3,
      aromaTags: rec.flavorNotes,
      foodPairings: rec.foodPairings,
      purchase: {
        store: 'Waitrose',
        price: rec.estimatedPrice,
        currency: rec.currency,
        date: new Date().toISOString().split('T')[0],
      },
      onlineLinks: rec.onlineLinks,
      wishlist: false,
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsAddModalOpen(true);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  // Switch tabs
  const handleSelectTab = (tab: TabType) => {
    if (tab === 'stats') {
      setIsStatsModalOpen(true);
    } else if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Compute counts for filter pills
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: wines.length };
    for (const w of wines) {
      c[w.coupleVerdict] = (c[w.coupleVerdict] || 0) + 1;
    }
    return c;
  }, [wines]);

  // Filtered & Sorted Wines
  const filteredWines = useMemo(() => {
    return wines
      .filter((w) => {
        if (activeTab === 'wishlist' && !w.wishlist) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            w.name.toLowerCase().includes(q) ||
            w.producer.toLowerCase().includes(q) ||
            w.grape.toLowerCase().includes(q) ||
            w.region.toLowerCase().includes(q) ||
            w.country.toLowerCase().includes(q) ||
            w.purchase?.store.toLowerCase().includes(q) ||
            w.jointNotes?.toLowerCase().includes(q);
          if (!match) return false;
        }

        if (activeVerdict !== 'all' && w.coupleVerdict !== activeVerdict) {
          return false;
        }

        if (activeType !== 'all' && w.type !== activeType) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return (b.averageRating || 0) - (a.averageRating || 0);
        }
        if (sortBy === 'price-low') {
          return (a.purchase?.price || 0) - (b.purchase?.price || 0);
        }
        if (sortBy === 'price-high') {
          return (b.purchase?.price || 0) - (a.purchase?.price || 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [wines, activeTab, searchQuery, activeVerdict, activeType, sortBy]);

  const wishlistCount = useMemo(() => wines.filter((w) => w.wishlist).length, [wines]);
  const wishlistWineNames = useMemo(
    () => wines.filter((w) => w.wishlist).map((w) => w.name.toLowerCase()),
    [wines]
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top Header */}
      <Navbar
        settings={settings}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        totalBottles={wines.length}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        activeFilterCount={activeVerdict !== 'all' || activeType !== 'all' ? 1 : 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-3 space-y-3.5 font-sans">
        {/* TAB 1: RECOMMENDATIONS FOR YOU */}
        {activeTab === 'recommendations' ? (
          <RecommendedSection
            recommendations={recommendations}
            settings={settings}
            onAddToWishlist={handleAddRecommendationToWishlist}
            onLogAsTasted={handleLogRecommendationAsTasted}
            wishlistWineNames={wishlistWineNames}
          />
        ) : (
          <>
            {/* Wishlist Header indicator if in wishlist tab */}
            {activeTab === 'wishlist' && (
              <div className="p-3.5 rounded-2xl luxury-card flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-sans font-semibold text-champagne-100">
                  <Bookmark className="w-4 h-4 text-champagne-gold" />
                  <span>Cellar Wishlist & Repurchase Registry</span>
                </div>
                <button
                  onClick={() => setActiveTab('journal')}
                  className="text-xs text-champagne-300 font-sans font-medium hover:text-white underline"
                >
                  Return to Journal
                </button>
              </div>
            )}

            {/* Quick Recommendation Discovery Banner on Journal */}
            {activeTab === 'journal' && recommendations.length > 0 && (
              <div
                onClick={() => setActiveTab('recommendations')}
                className="p-3.5 rounded-2xl luxury-card flex items-center justify-between cursor-pointer hover:border-champagne-500/45 transition-all shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-wine-900/70 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans font-bold text-stone-100">Recommended For You</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-champagne-950 text-champagne-accent font-sans font-semibold border border-champagne-500/35">
                        {recommendations[0].matchScore}% Match
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 font-sans truncate max-w-[215px] mt-0.5">
                      Based on your {wines.find((w) => w.averageRating >= 4.5)?.name || 'top tastings'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-champagne-400 group-hover:text-champagne-accent group-hover:translate-x-0.5 transition-all" />
              </div>
            )}

            {/* Filter Bar */}
            <FilterBar
              activeVerdict={activeVerdict}
              onSelectVerdict={setActiveVerdict}
              activeType={activeType}
              onSelectType={setActiveType}
              counts={counts}
            />

            {/* Sort & Count Header */}
            <div className="flex items-center justify-between text-xs text-stone-300 px-1 font-sans">
              <span>
                Showing <strong>{filteredWines.length}</strong> {filteredWines.length === 1 ? 'bottle' : 'bottles'}
              </span>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-champagne-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating' | 'price-low' | 'price-high')}
                  className="bg-transparent text-stone-200 font-medium focus:outline-none cursor-pointer font-sans"
                >
                  <option value="newest" className="bg-[#0f0a0d]">Newest Tasted</option>
                  <option value="rating" className="bg-[#0f0a0d]">Highest Rated</option>
                  <option value="price-low" className="bg-[#0f0a0d]">Price: Low to High</option>
                  <option value="price-high" className="bg-[#0f0a0d]">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Wine Card Grid / List */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <WineIcon className="w-10 h-10 text-champagne-500/40 animate-pulse mx-auto" />
                <p className="text-xs text-stone-300 font-sans">Loading cellar vault...</p>
              </div>
            ) : filteredWines.length > 0 ? (
              <div className="space-y-3 pb-8">
                {filteredWines.map((wine) => (
                  <WineCard
                    key={wine.id}
                    wine={wine}
                    settings={settings}
                    onClick={() => setSelectedWine(wine)}
                    onToggleWishlist={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist(wine);
                    }}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(wine);
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-16 text-center space-y-4 px-6">
                <div className="w-16 h-16 rounded-3xl bg-black/70 border border-champagne-500/25 flex items-center justify-center mx-auto shadow-inner">
                  <WineIcon className="w-7 h-7 text-champagne-400/60" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-stone-100 tracking-wide">
                    No wines found
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                    {searchQuery || activeVerdict !== 'all' || activeType !== 'all'
                      ? 'Try clearing your filters or search terms to view all bottles.'
                      : 'Your shared cellar is ready. Capture your first bottle to begin.'}
                  </p>
                </div>

                {searchQuery || activeVerdict !== 'all' || activeType !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveVerdict('all');
                      setActiveType('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-stone-100 text-xs font-sans font-semibold border border-white/15 hover:bg-stone-800"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingWine(null);
                      setIsAddModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-xs font-sans font-bold shadow-lg shadow-wine-950 inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-champagne-gold" />
                    <span>Log First Bottle</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Fixed Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAddModal={() => {
          setEditingWine(null);
          setIsAddModalOpen(true);
        }}
        wishlistCount={wishlistCount}
      />

      {/* Modals */}
      <WineDetailModal
        wine={selectedWine}
        settings={settings}
        isOpen={Boolean(selectedWine)}
        onClose={() => setSelectedWine(null)}
        onEdit={(w) => {
          setEditingWine(w);
          setIsAddModalOpen(true);
        }}
        onDelete={handleDeleteWine}
        onToggleWishlist={handleToggleWishlist}
        onToggleFavorite={handleToggleFavorite}
      />

      <AddWineModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingWine(null);
        }}
        onSave={handleSaveWine}
        settings={settings}
        editingWine={editingWine}
      />

      <CoupleStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        wines={wines}
        settings={settings}
        onSelectWine={(w) => setSelectedWine(w)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        wines={wines}
        onImportWines={handleImportWines}
      />
    </div>
  );
}
