const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/components/ShopView.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Normalize line endings to \n for replacement
const isCRLF = content.includes('\r\n');
if (isCRLF) {
  content = content.replace(/\r\n/g, '\n');
}

// 1. Add heroVideoFailed state
const targetState = '  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);';
const replaceState = `  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState<boolean>(false);

  useEffect(() => {
    setHeroVideoFailed(false);
  }, [shopSettings.heroVideoUrl]);`;

if (!content.includes('heroVideoFailed')) {
  content = content.replace(targetState, replaceState);
}

// 2. Add hasHeroVideo
const targetHeroStart = '  const ds = shopSettings.designStudio || DEFAULT_DESIGN_STUDIO;\n\n  return (\n    <div className="catalog-view shop-view min-h-screen"';
const replaceHeroStart = `  const ds = shopSettings.designStudio || DEFAULT_DESIGN_STUDIO;
  const hasHeroVideo = Boolean(shopSettings.heroVideoUrl) && !heroVideoFailed;

  return (
    <div className="catalog-view shop-view min-h-screen"`;

content = content.replace(targetHeroStart, replaceHeroStart);

// 3. Replace Hero section
const sectionRegex = /<section\s+className=\{`shop-hero \$\{shopSettings\.heroVideoUrl \? 'catalog-hero--video' : ''\}[\s\S]*?<\/section>/;

const newSection = `<section
        className={\`shop-hero \${hasHeroVideo ? 'catalog-hero--video bg-stone-950' : 'bg-stone-900'} min-h-[58vh] sm:min-h-[68vh] flex flex-col justify-center items-center relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-stone-800 text-center transition-colors\`}
        style={{
          backgroundColor: hasHeroVideo ? '#0c0a09' : (shopSettings.heroBgColor && shopSettings.heroBgColor !== '#ffffff' ? shopSettings.heroBgColor : '#0c0a09'),
          color: '#ffffff'
        }}
      >
        {hasHeroVideo && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={shopSettings.heroVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            referrerPolicy="no-referrer"
            onError={() => setHeroVideoFailed(true)}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
          style={{ opacity: Number(ds.heroOverlay) || 0.55 }}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-4xl mx-auto space-y-4 my-auto">
          <h1
            className={\`\${shopSettings.heroTitleSize || 'text-3xl sm:text-4xl md:text-5xl'} font-bold tracking-tight break-words text-white drop-shadow-sm\`}
            style={{
              fontFamily: ds.fontFamily || \`'\${shopSettings.fontFamily}', sans-serif\`
            }}
          >
            {shopSettings.heroTitle}
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-stone-200 opacity-95 drop-shadow-xs"
          >
            {shopSettings.heroSubtitle}
          </p>

          {/* Quick Stats badges */}
          <div className="pt-2 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15 backdrop-blur-xs">
              {isCatalogLoading ? '—' : totalAvailable} διαθέσιμα κομμάτια
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15 backdrop-blur-xs">
              {visibleCategories.length - 1} κατηγορίες
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15 backdrop-blur-xs">
              {isCatalogLoading ? '—' : jewelryList.length} συνολικές δημιουργίες
            </span>
          </div>
        </div>

        {/* Animated scroll down indicator for mobile & desktop */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('shop-catalog') || document.querySelector('.catalog-controls');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer transition group focus:outline-hidden text-white/90 hover:text-white"
          aria-label="Κύλιση προς τα κάτω για προβολή δημιουργιών"
        >
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest drop-shadow-md group-hover:scale-105 transition-transform">
            Κύλιση για δημιουργίες
          </span>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg animate-bounce group-hover:bg-black/60 transition">
            <ChevronDown className="w-4 h-4 text-white drop-shadow" />
          </div>
        </button>
      </section>`;

content = content.replace(sectionRegex, newSection);

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated ShopView.tsx');

