const fs = require('fs');
const path = require('path');

// 1. Polish BackOfficeView.tsx
const boPath = path.resolve(__dirname, '../src/components/BackOfficeView.tsx');
let boContent = fs.readFileSync(boPath, 'utf8');
const isBoCRLF = boContent.includes('\r\n');
if (isBoCRLF) boContent = boContent.replace(/\r\n/g, '\n');

// Add 'group' to product card container
boContent = boContent.replace(
  'className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id)',
  'className={`group bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id)'
);

// Make drag/reorder overlay indicators appear on hover
boContent = boContent.replace(
  '<div className="absolute bottom-2 right-2 flex gap-1 z-10">\n                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, \'up\'); }} disabled={isShopOrderMoveDisabled(item, \'up\')} className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο πάνω στο Shop">↑</button>\n                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, \'down\'); }} disabled={isShopOrderMoveDisabled(item, \'down\')} className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο κάτω στο Shop">↓</button>\n                                                </div>\n                                                <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200">Σύρε</div>',
  '<div className="absolute bottom-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">\n                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, \'up\'); }} disabled={isShopOrderMoveDisabled(item, \'up\')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο πάνω στο Shop">↑</button>\n                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, \'down\'); }} disabled={isShopOrderMoveDisabled(item, \'down\')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο κάτω στο Shop">↓</button>\n                                                </div>\n                                                <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">Σύρε</div>'
);

// Improve Grid card action buttons
boContent = boContent.replace(
  `<div className="flex gap-1.5">
                                                        {!isSold && (
                                                            <button onClick={(e) => handleQuickSold(e, item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                        )}
                                                        <button onClick={() => handleCloneItem(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Αντιγραφή"><IconClone /></button>
                                                        <button onClick={() => handleViewDetails(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Προβολή"><IconEye /></button>
                                                        <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Επεξεργασία"><IconEdit /></button>
                                                        <button onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Διαγραφή"><IconTrash /></button>
                                                    </div>`,
  `<div className="flex gap-1">
                                                        {!isSold && (
                                                            <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                        )}
                                                        <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                        <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                        <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                        <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                                    </div>`
);

// Improve List view card action buttons
boContent = boContent.replace(
  `<button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="p-2 text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο πάνω στο Shop">↑</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="p-2 text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο κάτω στο Shop">↓</button>
                                                {!isSold && (
                                                    <button onClick={(e) => handleQuickSold(e, item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                )}
                                                <button onClick={() => handleCloneItem(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                <button onClick={() => handleViewDetails(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                <button onClick={() => handleOpenEdit(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                <button onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>`,
  `<button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο πάνω στο Shop">↑</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο κάτω στο Shop">↓</button>
                                                {!isSold && (
                                                    <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                )}
                                                <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>`
);

if (isBoCRLF) boContent = boContent.replace(/\n/g, '\r\n');
fs.writeFileSync(boPath, boContent, 'utf8');
console.log('Successfully polished BackOfficeView.tsx');

// 2. Polish OrdersManager.tsx
const omPath = path.resolve(__dirname, '../src/components/OrdersManager.tsx');
let omContent = fs.readFileSync(omPath, 'utf8');
const isOmCRLF = omContent.includes('\r\n');
if (isOmCRLF) omContent = omContent.replace(/\r\n/g, '\n');

omContent = omContent.replace(
  '<button onClick={onBack} className="mb-2 text-sm underline">← Κατάλογος</button>',
  '<button type="button" onClick={onBack} className="mb-2 text-sm font-bold text-stone-700 hover:text-stone-900 transition flex items-center gap-1.5">← Επιστροφή στον Κατάλογο</button>'
);

omContent = omContent.replace(
  '<button disabled={loading} onClick={() => void load()} className="rounded-lg border px-4 py-2">{loading ? \'Φόρτωση…\' : \'Ανανέωση\'}</button>',
  '<button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-bold transition shadow-xs">{loading ? \'Φόρτωση…\' : \'Ανανέωση\'}</button>'
);

omContent = omContent.replace(
  'className="rounded-lg border px-3 py-2 text-sm">Δοκιμή ειδοποίησης email</button>',
  'type="button" className="rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-bold transition shadow-xs">Δοκιμή ειδοποίησης email</button>'
);

if (isOmCRLF) omContent = omContent.replace(/\n/g, '\r\n');
fs.writeFileSync(omPath, omContent, 'utf8');
console.log('Successfully polished OrdersManager.tsx');

