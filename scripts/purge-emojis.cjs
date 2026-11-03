const fs = require('fs');
const path = require('path');

const targetRoot = process.argv[2] || '09_NEW_APPLICATION';

function replaceInFile(relPath, replacements) {
  const filePath = path.join(targetRoot, relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [target, replacement] of replacements) {
    if (typeof target === 'string') {
      if (content.includes(target)) {
        content = content.replaceAll(target, replacement);
        changed = true;
      }
    } else if (target instanceof RegExp) {
      if (target.test(content)) {
        content = content.replace(target, replacement);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

// 1. CartDrawer.tsx
replaceInFile('src/components/CartDrawer.tsx', [
  [/<span className="text-base">\s*⚠️\s*<\/span>/g, '<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />'],
  [/💡\s*Συμβουλή:/g, 'Συμβουλή:']
]);

// 2. DesignStudioSettings.tsx
replaceInFile('src/components/DesignStudioSettings.tsx', [
  ['✨ Φωτογραφία Έργου', 'Φωτογραφία Έργου'],
  ["'🎨 Προεπιλογές Στιλ (Presets)'", "'Προεπιλογές Στιλ (Presets)'"],
  ["'🌈 Χρώματα & Παλέτα'", "'Χρώματα & Παλέτα'"],
  ["'✍️ Τυπογραφία & Μεγέθη'", "'Τυπογραφία & Μεγέθη'"],
  ["'🧭 Κεφαλίδα & Μενού'", "'Κεφαλίδα & Μενού'"],
  ["'🃏 Κάρτες & Badges'", "'Κάρτες & Badges'"],
  ["'🎬 Hero Αρχικής & Βίντεο'", "'Hero Αρχικής & Βίντεο'"]
]);

// 3. PortfolioView.tsx
replaceInFile('src/components/PortfolioView.tsx', [
  ["{isVideo ? '🎬 Βίντεο' : `📸 Εικόνα ${activeMediaIdx + 1} / ${mediaList.length}`}",
   "{isVideo ? 'Βίντεο' : `Εικόνα ${activeMediaIdx + 1} / ${mediaList.length}`}"]
]);

// 4. PortfolioManager.tsx
replaceInFile('src/components/PortfolioManager.tsx', [
  ['🎬 {media.length} αρχεία', '{media.length} αρχεία'],
  ['📏 {item.dimensions}', '{item.dimensions}'],
  ['✂️ Edit', 'Edit'],
  ['✂️', '<IconEdit />'],
  ['🖼️', ''],
  ['📩 Μόνο κατόπιν επικοινωνίας', 'Μόνο κατόπιν επικοινωνίας']
]);

// 5. ItemDetailModal.tsx
replaceInFile('src/components/ItemDetailModal.tsx', [
  ['✂️ Επεξεργασία Εικόνας', 'Επεξεργασία Εικόνας'],
  ['📄 Αντιγραφή', 'Αντιγραφή'],
  ['🗑️ Διαγραφή', 'Διαγραφή'],
  ['✏️ Επεξεργασία', 'Επεξεργασία']
]);

// 6. BackOfficeView.tsx
replaceInFile('src/components/BackOfficeView.tsx', [
  ['alert(`✅ Ολοκληρώθηκε:', 'alert(`Ολοκληρώθηκε:'],
  ['🎬 {item.mediaList.length} αρχεία', '{item.mediaList.length} αρχεία'],
  ['📦 {item.storage}', '{item.storage}'],
  ['<div className="w-full h-full flex items-center justify-center text-xs">✨</div>', '<div className="w-full h-full flex items-center justify-center text-xs text-stone-300">ARAM</div>'],
  ["['fields', '📋 Βασικά Στοιχεία']", "['fields', 'Βασικά Στοιχεία']"],
  ["['search_replace', '🔍 Εντοπισμός & Αντικατάσταση']", "['search_replace', 'Εντοπισμός & Αντικατάσταση']"],
  ["['pricing', '💶 Τιμές & Απόθεμα']", "['pricing', 'Τιμές & Απόθεμα']"],
  ["['tags', '🏷️ Χρώματα & Υλικά']", "['tags', 'Χρώματα & Υλικά']"],
  ['🔄 Αντικατάσταση στα', 'Αντικατάσταση στα'],
  ['🗑️ Διαγραφή λέξης από τα επιλεγμένα', 'Διαγραφή λέξης από τα επιλεγμένα'],
  ['<div className="text-4xl mb-4 animate-bounce">☁️</div>', '<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold">CSV</div>'],
  ['<span className="text-2xl">✨</span>', ''],
  ['🎨 <span className="hidden md:inline">Επεξεργασία εικόνας</span>', '<span className="hidden md:inline">Επεξεργασία εικόνας</span>'],
  ['<span className="animate-spin text-sm">✨</span>', ''],
  ['<span>⚠️</span>', ''],
  ['💡 Πώς να ενεργοποιήσετε το Google Gemini AI:', 'Οδηγός Ενεργοποίησης Google Gemini AI:'],
  ['➕ Προσθήκη Νέας...', '+ Προσθήκη Νέας...'],
  ['➕ Άλλη Πλατφόρμα...', '+ Άλλη Πλατφόρμα...'],
  ['👀 Ορατό', 'Ορατό'],
  ['🔒 Κρυφό', 'Κρυφό'],
  ['🔒', ''],
  ['📹', 'VIDEO'],
  ['🎨 Design Studio', 'Design Studio'],
  ['🛍️ Βιτρίνα Shop', 'Βιτρίνα Shop'],
  ['🖼️ Portfolio', 'Portfolio'],
  ['⚙️ Προσαρμοσμένα Πεδία', 'Προσαρμοσμένα Πεδία'],
  ['🤖 AI Back Office', 'AI Back Office'],
  ['⚠️ Προσοχή:', 'Προσοχή:'],
  ["['color', '🎨 Χρώματα'", "['color', 'Χρώματα'"],
  ["['material', '🧵 Υλικά'", "['material', 'Υλικά'"],
  ["['category', '📁 Κατηγορίες'", "['category', 'Κατηγορίες'"],
  ["['collection', '🏷️ Συλλογές'", "['collection', 'Συλλογές'"],
  ["['status', '📦 Καταστάσεις'", "['status', 'Καταστάσεις'"],
  ["['platform', '🌐 Πλατφόρμες'", "['platform', 'Πλατφόρμες'"],
  ['🎯 Πού δουλεύει', 'Πού δουλεύει'],
  ['🖼️ Εικόνες & Όραση', 'Εικόνες & Όραση'],
  ['🔒 Ασφάλεια & Πρόσβαση', 'Ασφάλεια & Πρόσβαση'],
  ['💡 Οδηγός Αντιμετώπισης Σφαλμάτων', 'Οδηγός Αντιμετώπισης Σφαλμάτων'],
  ['💡 Οι ρυθμίσεις αποθηκεύονται', 'Οι ρυθμίσεις αποθηκεύονται']
]);

// 7. VintedRefresh.tsx
replaceInFile('src/components/VintedRefresh.tsx', [
  ['<span>🔄</span>', ''],
  ['<span className="text-xl">🔄</span>', ''],
  ['<span>🟢 Μόνο με αλλαγές</span>', '<span>Μόνο με αλλαγές</span>'],
  ['<span>⚪ Αμετάβλητα</span>', '<span>Αμετάβλητα</span>'],
  ['<span>⚠️ Σφάλματα</span>', '<span>Σφάλματα</span>'],
  ['<span className="text-xs text-stone-400">🖼️</span>', ''],
  ['🟢 Εντοπίστηκαν αλλαγές', 'Εντοπίστηκαν αλλαγές'],
  ['⚪ Αμετάβλητο', 'Αμετάβλητο'],
  ['<span className="text-stone-400">🔒</span>', ''],
  ['<span>💰 Αλλαγή Τιμής Shop</span>', '<span>Αλλαγή Τιμής Shop</span>'],
  ['<span>📦 Κατάσταση / Απόθεμα</span>', '<span>Κατάσταση / Απόθεμα</span>'],
  ['<span>⚠️</span>', ''],
  ['<span>✅</span>', ''],
  ['<span className="text-stone-400">➔</span>', '<span className="text-stone-400">→</span>']
]);

// 8. ImageEditorModal.tsx
replaceInFile('src/components/ImageEditorModal.tsx', [
  ['<span>⚠️</span>', '']
]);

console.log(`Sanitization complete for ${targetRoot}`);
