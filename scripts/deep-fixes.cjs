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

// 1. VideoPlayer.tsx: Add referrerPolicy="no-referrer" to <video>
const vpPath = path.resolve(__dirname, '../src/components/VideoPlayer.tsx');
updateFile(vpPath, [
  {
    target: '<video key={url} src={url} controls={!background} autoPlay={autoPlay} muted={background} loop={background} playsInline preload="metadata" onError={() => {setFailed(true); onError?.();}} aria-hidden={background || undefined} className={`h-full w-full ${background ? \'object-cover\' : \'object-contain\'}`} />',
    replacement: '<video key={url} src={url} controls={!background} autoPlay={autoPlay} muted={background} loop={background} playsInline preload="metadata" referrerPolicy="no-referrer" onError={() => {setFailed(true); onError?.();}} aria-hidden={background || undefined} className={`h-full w-full ${background ? \'object-cover\' : \'object-contain\'}`} />'
  }
]);

// 2. PortfolioHero.tsx: Ensure bg-stone-950 when hasVideo is active
const phPath = path.resolve(__dirname, '../src/components/PortfolioHero.tsx');
updateFile(phPath, [
  {
    target: '<section className={`portfolio-hero ${hasVideo ? \'portfolio-hero--video\' : \'\'} min-h-[58vh] sm:min-h-[68vh] flex flex-col justify-center items-center relative overflow-hidden border-b border-[#e5def3] bg-white px-4 py-16 sm:py-24 text-center sm:px-6 lg:px-8`}>',
    replacement: '<section className={`portfolio-hero ${hasVideo ? \'portfolio-hero--video bg-stone-950 text-white\' : \'bg-white text-[#252134]\'} min-h-[58vh] sm:min-h-[68vh] flex flex-col justify-center items-center relative overflow-hidden border-b border-[#e5def3] px-4 py-16 sm:py-24 text-center sm:px-6 lg:px-8`}>'
  }
]);

// 3. Header.tsx: Add referrerPolicy="no-referrer" and width/height for layout stability
const headerPath = path.resolve(__dirname, '../src/components/Header.tsx');
updateFile(headerPath, [
  {
    target: `<img src={isPortfolio ? '/logo-portfolio.png' : '/logo.png'} alt="Aram Creations"
              className="h-11 w-8 sm:h-12 sm:w-9 shrink-0 object-contain"`,
    replacement: `<img src={isPortfolio ? '/logo-portfolio.png' : '/logo.png'} alt="Aram Creations"
              referrerPolicy="no-referrer"
              width="36" height="48"
              className="h-11 w-8 sm:h-12 sm:w-9 shrink-0 object-contain"`
  }
]);

// 4. PortfolioManager.tsx: Add referrerPolicy="no-referrer" to <video>
const pmPath = path.resolve(__dirname, '../src/components/PortfolioManager.tsx');
updateFile(pmPath, [
  {
    target: '<video src={first.url} className="w-full h-full object-cover" muted />',
    replacement: '<video src={first.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" muted />'
  }
]);

console.log('Deep fixes applied!');

