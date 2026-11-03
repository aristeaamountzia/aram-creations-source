const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/App.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const isCRLF = content.includes('\r\n');
if (isCRLF) {
  content = content.replace(/\r\n/g, '\n');
}

const target = `      {/* Header (clean for customers: Shop | Portfolio only) */}
      <Header
        currentMode={currentMode}
        onSelectMode={selectMode}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onContactArtist={() => handleContactArtist()}
        design={designStudioContent}
      />`;

const replacement = `      {/* Header (clean for customers: Shop | Portfolio only - hidden in back-office to prevent navigation conflict) */}
      {currentMode !== 'admin' && (
        <Header
          currentMode={currentMode}
          onSelectMode={selectMode}
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onContactArtist={() => handleContactArtist()}
          design={designStudioContent}
        />
      )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Successfully updated App.tsx');
} else {
  console.error('Target not found in App.tsx');
  process.exit(1);
}

