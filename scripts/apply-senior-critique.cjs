const fs = require('fs');
const path = require('path');

const targets = ['09_NEW_APPLICATION', '01_GITHUB/aram-creations-source'];

for (const targetRoot of targets) {
  // 1. CatalogControls.tsx
  const ccPath = path.join(targetRoot, 'src/components/CatalogControls.tsx');
  if (fs.existsSync(ccPath)) {
    let content = fs.readFileSync(ccPath, 'utf8');
    const oldCategories = `{categories.length > 0 && <nav aria-label={\`\${label} — κατηγορίες\`} className="catalog-categories horizontal-scrollbar">
      {categories.map(category => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => onCategory(category.id)}>
        {category.label}{category.count !== undefined && <span className="catalog-count">{category.count}</span>}
      </button>)}
    </nav>}`;

    const newCategories = `{categories.length > 0 && (
      <div className="relative min-w-0">
        <nav aria-label={\`\${label} — κατηγορίες\`} className="catalog-categories horizontal-scrollbar">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onCategory(category.id)}
              className="transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-800 focus-visible:outline-none"
            >
              {category.label}
              {category.count !== undefined && <span className="catalog-count">{category.count}</span>}
            </button>
          ))}
        </nav>
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-4 w-6 bg-gradient-to-l from-white/90 to-transparent sm:hidden" />
      </div>
    )}`;

    content = content.replace(/\r\n/g, '\n');
    content = content.replace(oldCategories.replace(/\r\n/g, '\n'), newCategories.replace(/\r\n/g, '\n'));
    fs.writeFileSync(ccPath, content, 'utf8');
    console.log(`Updated CatalogControls in ${targetRoot}`);
  }

  // 2. CartDrawer.tsx
  const cdPath = path.join(targetRoot, 'src/components/CartDrawer.tsx');
  if (fs.existsSync(cdPath)) {
    let content = fs.readFileSync(cdPath, 'utf8');
    content = content.replace(
      'className="p-6 border-t border-stone-200 bg-stone-50 space-y-4"',
      'className="sticky bottom-0 z-10 p-5 sm:p-6 border-t border-stone-200 bg-stone-50/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] space-y-4"'
    );
    content = content.replace(
      'className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 group"',
      'className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:outline-none"'
    );
    fs.writeFileSync(cdPath, content, 'utf8');
    console.log(`Updated CartDrawer in ${targetRoot}`);
  }

  // 3. ShopView.tsx
  const svPath = path.join(targetRoot, 'src/components/ShopView.tsx');
  if (fs.existsSync(svPath)) {
    let content = fs.readFileSync(svPath, 'utf8');
    content = content.replace(
      'className="px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition flex items-center gap-1"',
      'className="px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 active:scale-[0.98] transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:outline-none"'
    );
    content = content.replace(
      ": 'bg-stone-900 hover:bg-stone-800 text-white'",
      ": 'bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:outline-none'"
    );
    fs.writeFileSync(svPath, content, 'utf8');
    console.log(`Updated ShopView in ${targetRoot}`);
  }

  // 4. index.css
  const cssPath = path.join(targetRoot, 'src/index.css');
  if (fs.existsSync(cssPath)) {
    let content = fs.readFileSync(cssPath, 'utf8');
    if (!content.includes('scroll-behavior: smooth;')) {
      content = content.replace(
        '  overflow-x: auto;\n  padding-bottom: 16px;',
        '  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n  scroll-behavior: smooth;\n  padding-bottom: 16px;'
      );
      fs.writeFileSync(cssPath, content, 'utf8');
      console.log(`Updated index.css in ${targetRoot}`);
    }
  }
}

console.log('Senior design enhancements applied successfully.');

