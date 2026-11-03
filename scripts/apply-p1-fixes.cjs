const fs = require('fs');
const path = require('path');

function updateFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCRLF = content.includes('\r\n');
  if (isCRLF) content = content.replace(/\r\n/g, '\n');

  for (const { target, replacement } of transforms) {
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      console.log(`[Success] Applied transform in ${path.basename(filePath)}`);
    } else {
      console.warn(`[Warning] Target not found in ${path.basename(filePath)}:\n${target.slice(0, 80)}...`);
    }
  }

  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. App.tsx: Hide customer footer in admin mode & add referrerPolicy to footer logo
const appPath = path.resolve(__dirname, '../src/App.tsx');
updateFile(appPath, [
  {
    target: `      {/* Footer */}
      <footer className="site-footer bg-[#fafafa] border-t border-stone-200/90 text-stone-600 py-12 px-4 sm:px-6 lg:px-8">`,
    replacement: `      {/* Footer (hidden in admin mode) */}
      {currentMode !== 'admin' && (
      <footer className="site-footer bg-[#fafafa] border-t border-stone-200/90 text-stone-600 py-12 px-4 sm:px-6 lg:px-8">`
  },
  {
    target: `      </footer>
    </div>
  );
}`,
    replacement: `      </footer>
      )}
    </div>
  );
}`
  },
  {
    target: `              <img
                src={currentMode === 'portfolio' ? '/logo-portfolio.png' : '/logo.png'}
                alt="Aram Creations"
                className="w-8 h-8 object-contain"`,
    replacement: `              <img
                src={currentMode === 'portfolio' ? '/logo-portfolio.png' : '/logo.png'}
                alt="Aram Creations"
                referrerPolicy="no-referrer"
                className="w-8 h-8 object-contain"`
  }
]);

// 2. PortfolioHero.tsx: Add referrerPolicy="no-referrer" to video
const portfolioHeroPath = path.resolve(__dirname, '../src/components/PortfolioHero.tsx');
updateFile(portfolioHeroPath, [
  {
    target: `              preload="metadata"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"`,
    replacement: `              preload="metadata"
              referrerPolicy="no-referrer"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"`
  }
]);

// 3. ItemDetailModal.tsx: Add referrerPolicy="no-referrer" to video
const itemDetailPath = path.resolve(__dirname, '../src/components/ItemDetailModal.tsx');
updateFile(itemDetailPath, [
  {
    target: `<video src={currentMedia.url} controls className="w-full h-full object-cover" />`,
    replacement: `<video src={currentMedia.url} controls referrerPolicy="no-referrer" className="w-full h-full object-cover" />`
  }
]);

// 4. BackOfficeView.tsx: Add referrerPolicy to video elements
const backofficePath = path.resolve(__dirname, '../src/components/BackOfficeView.tsx');
let boContent = fs.readFileSync(backofficePath, 'utf8');
const isCRLF = boContent.includes('\r\n');
if (isCRLF) boContent = boContent.replace(/\r\n/g, '\n');

// Replace videos without referrerPolicy
boContent = boContent.replace(/<video\s+src=\{item\.imageUrl\}\s+className=\{`w-full h-full object-cover \$\{isSold \? 'grayscale' : ''\}`\}\s+muted\s+loop\s+autoPlay\s+playsInline\s*\/>/g,
  '<video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? \'grayscale\' : \'\'}`} muted loop autoPlay playsInline />');

boContent = boContent.replace(/<video\s+src=\{item\.imageUrl\}\s+className=\{`w-full h-full object-cover \$\{isSold \? 'grayscale' : ''\}`\}\s+muted\s*\/>/g,
  '<video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? \'grayscale\' : \'\'}`} muted />');

boContent = boContent.replace(/<video\s+src=\{modalPreviewMedia\}\s+className="w-full h-full object-cover"\s+muted\s+playsInline\s*\/>/g,
  '<video src={modalPreviewMedia} referrerPolicy="no-referrer" className="w-full h-full object-cover" muted playsInline />');

boContent = boContent.replace(/<video\s+src=\{media\.url\}\s+className="w-full h-full object-cover pointer-events-none"\s+muted\s*\/>/g,
  '<video src={media.url} referrerPolicy="no-referrer" className="w-full h-full object-cover pointer-events-none" muted />');

boContent = boContent.replace(/<video\s+src=\{media\.url\}\s+className="w-full h-full object-cover pointer-events-none grayscale"\s+muted\s*\/>/g,
  '<video src={media.url} referrerPolicy="no-referrer" className="w-full h-full object-cover pointer-events-none grayscale" muted />');

boContent = boContent.replace(/<video\s+src=\{activeMedia\.url\}\s+key=\{activeMedia\.url\}\s+className="w-full h-full object-cover"\s+controls\s+autoPlay\s+muted\s+loop\s+playsInline\s*\/>/g,
  '<video src={activeMedia.url} key={activeMedia.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" controls autoPlay muted loop playsInline />');

boContent = boContent.replace(/<video\s+src=\{shopSettings\.heroVideoUrl\}\s+controls\s+muted\s+className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs"\s*\/>/g,
  '<video src={shopSettings.heroVideoUrl} controls muted referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />');

boContent = boContent.replace(/<video\s+src=\{shopSettings\.portfolioHeroVideoUrl\}\s+controls\s+muted\s+className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs"\s*\/>/g,
  '<video src={shopSettings.portfolioHeroVideoUrl} controls muted referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />');

if (isCRLF) boContent = boContent.replace(/\n/g, '\r\n');
fs.writeFileSync(backofficePath, boContent, 'utf8');
console.log('[Success] Updated BackOfficeView.tsx with video referrerPolicy attributes');

console.log('All P1 fixes applied successfully!');

