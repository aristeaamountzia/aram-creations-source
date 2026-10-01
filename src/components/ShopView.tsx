= (item.colors || []).join(' ');

      const matchesCat = selectedCategory === 'Όλα' || cat === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        [name, cat, desc, materials, colors].join(' ').toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesFav = !showFavoritesOnly || favoriteIds.includes(item.id);

      return matchesCat && matchesSearch && matchesFav;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === 'popular') return getItemLikes(b) - getItemLikes(a);
      if (sortBy === 'views') return getItemViews(b) - getItemViews(a);
      return (Number(b.shopOrder) || 0) - (Number(a.shopOrder) || 0);
    });
  }, [jewelryList, selectedCategory, searchQuery, showFavoritesOnly, favoriteIds, availableOnly, sortBy]);

  // Catalog Stats
  const totalAvailable = useMemo(() => {
    return jewelryList.filter(isAvailableForSale).length;
  }, [jewelryList]);

  // Modal item navigation
  const currentModalIndex = selectedItem ? filteredItems.findIndex((it) => it.id === selectedItem.id) : -1;
  const hasPrevModalItem = currentModalIndex > 0;
  const hasNextModalItem = currentModalIndex !== -1 && currentModalIndex < filteredItems.length - 1;

  const handlePrevModalItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrevModalItem) {
      handleOpenDetail(filteredItems[currentModalIndex - 1]);
    }
  };

  const handleNextModalItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNextModalItem) {
      handleOpenDetail(filteredItems[currentModalIndex + 1]);
    }
  };

  // Selected item media list
  const selectedMediaList = useMemo(() => {
    return selectedItem ? getItemMediaList(selectedItem) : [];
  }, [selectedItem]);

  const activeMedia = selectedMediaList[activeMediaIndex] || selectedMediaList[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: shopSettings.bgColor, color: shopSettings.textColor, fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
      {/* Authentic Artisan Hero Banner */}
      <section className="relative overflow-hidden py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-800 text-center" style={{ backgroundColor: shopSettings.heroBgColor, color: shopSettings.heroTitleColor }}>
        {shopSettings.heroVideoUrl && <video className="absolute inset-0 h-full w-full object-cover" src={shopSettings.heroVideoUrl} autoPlay muted loop playsInline aria-hidden="true" />}
        {shopSettings.heroVideoUrl && <div className="absolute inset-0 bg-black/50" aria-hidden="true" />}
        <div className="relative max-w-4xl mx-auto space-y-4">
          <h1 className={`${shopSettings.heroTitleSize} font-bold tracking-tight break-words`} style={{ color: shopSettings.heroVideoUrl ? '#fff' : shopSettings.heroTitleColor, fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
            {shopSettings.heroTitle}
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed opacity-90" style={{ color: shopSettings.heroVideoUrl ? '#fff' : shopSettings.heroSubtitleColor }}>
            {shopSettings.heroSubtitle}
          </p>

          {/* Quick Stats badges */}
          <div className="pt-2 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {isCatalogLoading ? '—' : totalAvailable} διαθέσιμα κομμάτια
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {visibleCategories.length - 1} κατηγορίες
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {isCatalogLoading ? '—' : jewelryList.length} συνολικές δημιουργίες
            </span>
          </div>
        </div>
      </section>

      {shopSettings.announcementEnabled && shopSettings.announcementText && (
        <div className="px-4 py-3 text-center text-sm font-semibold" style={{ backgroundColor: shopSettings.primaryColor, color: '#fff' }}>
          {shopSettings.announcementLink ? <a href={shopSettings.announcementLink} className="underline underline-offset-2">{shopSettings.announcementText}</a> : shopSettings.announcementText}
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        
        {/* Category Navigation Bar */}
        <div className="border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 horizontal-scrollbar">
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                  className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border ${isSelected ? 'text-white shadow-sm' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                  style={{ borderRadius: shopSettings.borderRadius, ...(isSelected ? { backgroundColor: shopSettings.primaryColor, borderColor: shopSettings.primaryColor } : {}) }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση με όνομα, υλικό, χρώμα..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Καθαρισμός αναζήτησης"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Available only, Favorites only, Sort */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              aria-pressed={availableOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                availableOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              Μόνο Διαθέσιμα
            </button>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-pressed={showFavoritesOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                showFavoritesOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
              <span>Αγαπημένα ({favoriteIds.length})</span>
            </button>

            {/* Sort Select */}
            <div className="flex max-w-full min-w-0 items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700">
              <span className="text-[11px] text-stone-400 uppercase font-bold">Ταξινόμηση:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-0 max-w-full bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="featured">Προτεινόμενα</option>
                <option value="popular">Πιο Δημοφιλή (Likes)</option>
                <option value="views">Περισσότερες Προβολές</option>
                <option value="price-asc">Τιμή (Χαμηλή → Υψηλή)</option>
                <option value="price-desc">Τιμή (Υψηλή → Χαμηλή)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Catalog Results Header */}
        <div className="flex items-center justify-between text-xs font-bold text-stone-500 px-1">
          <span>{isCatalogLoading ? 'Φόρτωση καταλόγου…' : `${filteredItems.length} δημιουργίες βρέθηκαν`}</span>
          {(selectedCategory !== 'Όλα' || searchQuery || availableOnly || showFavoritesOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="text-stone-800 hover:underline font-bold"
            >
              Καθαρισμός φίλτρων
            </button>
          )}
        </div>

        {catalogOffline && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Δεν ήταν δυνατή η σύνδεση με τον ζωντανό κατάλογο. Εμφανίζονται ενδεικτικά τοπικά προϊόντα και η διαθεσιμότητά τους μπορεί να μην είναι ενημερωμένη.
          </div>
        )}

        {/* Products Grid */}
        {isCatalogLoading ? (
          <div role="status" className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 text-sm text-stone-500">
            Φόρτωση καταλόγου…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 space-y-3">
            <p className="text-base font-bold text-stone-800">
              {showFavoritesOnly ? 'Δεν έχεις προσθέσει ακόμα αγαπημένα κοσμήματα.' : 'Δεν βρέθηκαν δημιουργίες που να ταιριάζουν στα κριτήριά σου.'}
            </p>
            <p className="text-xs text-stone-500">
              Δοκίμασε να αλλάξεις κατηγορία ή να καθαρίσεις τα ενεργά φίλτρα αναζήτησης.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
            >
              Επιστροφή σε όλη τη συλλογή
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 ${shopSettings.catalogDensity === 'compact' ? 'gap-3 sm:gap-4' : shopSettings.catalogDensity === 'spacious' ? 'gap-8 sm:gap-10' : 'gap-6 sm:gap-8'}`}>
            {filteredItems.map((item) => {
              const isFav = favoriteIds.includes(item.id);
              const isAvailable = isAvailableForSale(item);
              const isSold = item.status === 'Πουλήθηκε' || (item.status !== 'Κρατημένο' && item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0);
              const isAdded = !!addedIds[item.id];
              const vintedLink = (item.purchaseLinks || []).find((l) => l.site?.toLowerCase() === 'vinted')?.url;

              // Media list & active media index on card
              const mediaList = getItemMediaList(item);
              const currentCardMediaIdx = cardActiveMediaIndex[item.id] || 0;
              const activeCardMedia = mediaList[currentCardMediaIdx] || mediaList[0];
              const hasMultipleMedia = mediaList.length > 1;
              const hasVideo = mediaList.some((m) => m.type === 'video');

              const likesCount = getItemLikes(item);
              const viewsCount = getItemViews(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleOpenDetail(item);
                    }
                  }}
                  role="group"
                  tabIndex={0}
                  aria-label={`${item.name || item.title || 'Κόσμημα'}. Πατήστε Enter για λεπτομέρειες.`}
                  className={`group bg-white border border-stone-200/90 rounded-2xl overflow-hidden hover:border-stone-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    !isAvailable ? 'opacity-85' : ''
                  }`}
                  style={{ borderRadius: shopSettings.borderRadius }}
                >
                  {/* Media Container with multi-media support */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                    {activeCardMedia.type === 'video' ? (
                      <video
                        src={activeCardMedia.url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={activeCardMedia.url}
                        alt={item.name || item.title || 'Κόσμημα Aram Creations'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Media type indicators */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      {hasVideo && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Play className="w-2.5 h-2.5 fill-white" />
                          <span>Βίντεο</span>
                        </span>
                      )}
                      {hasMultipleMedia && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold shadow-sm">
                          {mediaList.length} φωτό
                        </span>
                      )}
                    </div>

                    {/* Card mini-gallery navigation dots if item has multiple images */}
                    {hasMultipleMedia && (
                      <div
                        className="absolute bottom-3 right-3 flex items-center gap-1 z-10 bg-black/50 backdrop-blur-sm px-1.5 py-1 rounded-full opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {mediaList.slice(0, 5).map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={() =>
                              setCardActiveMediaIndex((prev) => ({
                                ...prev,
                                [item.id]: dotIdx
                              }))
                            }
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              currentCardMediaIdx === dotIdx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                            }`}
                            aria-label={`Φωτογραφία ${dotIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Category badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-stone-200 text-stone-800 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-sm">
                      {item.category || 'Κόσμημα'}
                    </div>

                    {/* Like & Status buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {!isAvailable && (
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg shadow-sm ${isSold ? 'text-rose-800 bg-rose-100 border-rose-200' : 'text-amber-900 bg-amber-100 border-amber-200'}`}>
                          {isSold ? 'Πουλήθηκε' : item.status || 'Μη διαθέσιμο'}
                        </span>
                      )}
                      <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          aria-label={isFav ? `Αφαίρεση ${item.name || item.title} από τα αγαπημένα` : `Προσθήκη ${item.name || item.title} στα αγαπημένα`}
                          aria-pressed={isFav}
                          className={`p-2 rounded-xl backdrop-blur-md transition-transform active:scale-95 shadow-sm flex items-center gap-1 border ${
                            isFav
                              ? 'bg-rose-50 border-rose-200 text-rose-600'
                              : 'bg-white/90 border-stone-200 text-stone-700 hover:text-rose-600 hover:bg-white'
                          }`}
                          title={isFav ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span className="text-[11px] font-bold">{likesCount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {item.collection && (
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {item.collection}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-400 ml-auto">
                          <Eye className="w-3 h-3" />
                          <span>{viewsCount}</span>
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-stone-900 line-clamp-2 group-hover:text-stone-700 transition-colors">
                        {item.name || item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Footer: Price & Actions */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Τιμή</span>
                        <span className="text-lg font-bold text-stone-900" style={{ fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
                          {item.price ? `${item.price}€` : '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {vintedLink && (
                          <a
                            href={vintedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition flex items-center gap-1"
                            title="Αγορά μέσω Vinted"
                          >
                            <span>Vinted</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          disabled={!isAvailable}
                          onClick={(e) => handleAdd(item, e)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            !isAvailable
                              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-stone-900 hover:bg-stone-800 text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Μπήκε!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{!isAvailable ? (isSold ? 'Πουλήθηκε' : item.status || 'Μη διαθέσιμο') : 'Καλάθι'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Product Detail Modal with Full Media & Metrics Support */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedItem(null);
          }}
        >
          {/* Previous product catalog arrow */}
          {hasPrevModalItem && (
            <button
              onClick={handlePrevModalItem}
              className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-stone-900 shadow-2xl items-center justify-center hover:bg-stone-100 transition z-50 border border-stone-200"
              title="Προηγούμενο κόσμημα"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next product catalog arrow */}
          {hasNextModalItem && (
            <button
              onClick={handleNextModalItem}
              className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-stone-900 shadow-2xl items-center justify-center hover:bg-stone-100 transition z-50 border border-stone-200"
              title="Επόμενο κόσμημα"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            className="bg-white border border-stone-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden text-stone-900 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200 border border-stone-300 transition shadow-sm"
              aria-label="Κλείσιμο παραθύρου"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT COLUMN: Rich Media Stage (Images & Videos) */}
            <div className="w-full md:w-1/2 bg-stone-100 p-4 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200">
              {/* Primary Active Media Display */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-stone-200 border border-stone-300 flex items-center justify-center">
                {activeMedia ? (
                  activeMedia.type === 'video' ? (
                    <video
                      key={activeMedia.url}
                      src={activeMedia.url}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      key={activeMedia.url}
                      src={activeMedia.url}
                      alt={selectedItem.name || selectedItem.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : null}

                {/* Lightbox / Zoom full size button */}
                {activeMedia && activeMedia.type !== 'video' && (
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute top-3 left-3 p-2 rounded-xl bg-white/80 backdrop-blur-md text-stone-700 hover:text-stone-900 hover:bg-white border border-stone-200 shadow-sm transition"
                    title="Πλήρης μεγέθυνση εικόνας"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}

                {/* Previous/Next media navigation inside the item */}
                {selectedMediaList.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveMediaIndex((prev) =>
                          prev > 0 ? prev - 1 : selectedMediaList.length - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md text-stone-800 hover:bg-white shadow-sm border border-stone-200 transition"
                      title="Προηγούμενη φωτογραφία"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveMediaIndex((prev) =>
                          prev < selectedMediaList.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md text-stone-800 hover:bg-white shadow-sm border border-stone-200 transition"
                      title="Επόμενη φωτογραφία"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Media Counter Badge */}
                {selectedMediaList.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold">
                    {activeMediaIndex + 1} / {selectedMediaList.length}
                  </div>
                )}
              </div>

              {/* Bottom Thumbnail Strip */}
              {selectedMediaList.length > 1 && (
                <div className="flex gap-2.5 mt-3.5 overflow-x-auto pb-1 horizontal-scrollbar">
                  {selectedMediaList.map((media, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      aria-label={`Εμφάνιση ${media.type === 'video' ? 'βίντεο' : 'εικόνας'} ${idx + 1}`}
                      aria-pressed={activeMediaIndex === idx}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeMediaIndex === idx
                          ? 'border-stone-900 scale-105 shadow-sm'
                          : 'border-stone-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full bg-stone-900 text-white flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white" />
                        </div>
                      ) : (
                        <img
                          src={media.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Product Details, Metrics, Materials & Actions */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Category & Collection */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {selectedItem.category} {selectedItem.collection && `• ${selectedItem.collection}`}
                  </span>

                  {/* Likes & Views Metrics Display */}
                  <div className="flex items-center gap-3 text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{getItemViews(selectedItem)} προβολές</span>
                    </span>
                    <button
                      onClick={(e) => toggleFavorite(selectedItem.id, e)}
                      aria-label={favoriteIds.includes(selectedItem.id) ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                      aria-pressed={favoriteIds.includes(selectedItem.id)}
                      className={`flex items-center gap-1 transition ${
                        favoriteIds.includes(selectedItem.id) ? 'text-rose-600' : 'hover:text-stone-800'
                      }`}
                      title="Αγαπημένο"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          favoriteIds.includes(selectedItem.id) ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span>{getItemLikes(selectedItem)}</span>
                    </button>
                  </div>
                </div>

                {/* Title & Price */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-snug" style={{ fontFamily: 'Jura, sans-serif' }}>
                    {selectedItem.name || selectedItem.title}
                  </h2>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-stone-900">
                      {selectedItem.price ? `${selectedItem.price}€` : '-'}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      !isAvailableForSale(selectedItem)
                        ? selectedItem.status === 'Πουλήθηκε' || (selectedItem.status !== 'Κρατημένο' && selectedItem.stock !== undefined && selectedItem.stock !== null && Number(selectedItem.stock) <= 0)
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedItem.status || 'Διαθέσιμο'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {selectedItem.description && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans whitespace-pre-wrap pt-2">
                    {selectedItem.description}
                  </p>
                )}

                {/* Materials list */}
                {selectedItem.materials && selectedItem.materials.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Υλικά Κατασκευής
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.materials.map((mat, i) => (
                        <span
                          key={i}
                          className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-stone-200"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {selectedItem.colors && selectedItem.colors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Χρώματα
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.colors.map((col, i) => (
                        <span
                          key={i}
                          className="bg-white border border-stone-200 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 border border-stone-200 align-middle" style={{ backgroundColor: shopSettings.colorPalette[col] || '#e7e5e4' }} aria-hidden="true" />
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dimensions / Weight */}
                {(selectedItem.dimensions || selectedItem.weight) && (
                  <div className="flex gap-6 text-xs text-stone-600 pt-2">
                    {selectedItem.dimensions && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-stone-400">Διαστάσεις</span>
                        <span className="font-medium">{selectedItem.dimensions}</span>
                      </div>
                    )}
                    {selectedItem.weight && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-stone-400">Βάρος</span>
                        <span className="font-medium">{selectedItem.weight}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Purchase and Add to Bag Actions */}
              <div className="pt-6 border-t border-stone-100 space-y-2.5 mt-6">
                <button
                  disabled={!isAvailableForSale(selectedItem)}
                  onClick={() => {
                    handleAdd(selectedItem);
                    setSelectedItem(null);
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    !isAvailableForSale(selectedItem)
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {!isAvailableForSale(selectedItem)
                      ? selectedItem.status === 'Πουλήθηκε' || (selectedItem.status !== 'Κρατημένο' && selectedItem.stock !== undefined && selectedItem.stock !== null && Number(selectedItem.stock) <= 0) ? 'Πουλήθηκε' : selectedItem.status || 'Μη διαθέσιμο'
                      : 'Προσθήκη στην Τσάντα Αγορών'}
                  </span>
                </button>

                {/* Vinted and External Purchase Links */}
                {(selectedItem.purchaseLinks || []).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <span>Αγορά μέσω {link.site || 'Vinted'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for High-Resolution Media Inspection */}
      {isLightboxOpen && activeMedia && activeMedia.type !== 'video' && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/20 text-white hover:bg-white/40 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeMedia.url}
            alt="Μεγέθυνση κοσμήματος"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {Object.entries(shopSettings.fallbackLinks).some(([, url]) => /^https:\/\//i.test(url)) && (
        <nav aria-label="Σύνδεσμοι Aram Creations" className="mt-12 border-t border-stone-200 px-4 py-8 text-center text-xs font-semibold sm:px-6">
          <p className="mb-4 text-[11px] uppercase tracking-wider text-stone-500">Βρείτε μας και εδώ</p>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(shopSettings.fallbackLinks).filter(([, url]) => /^https:\/\//i.test(url)).map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-700 transition hover:border-stone-400 hover:text-stone-950">{name}</a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};


