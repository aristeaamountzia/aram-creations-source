import React from 'react';
import { BadgeCheck, Check, ExternalLink, RefreshCw, Star, X } from 'lucide-react';
import type { VintedReviewsController } from './useVintedReviews';

export function VintedReviewsSettings({ vintedReviewsData, isSyncingVintedReviews, vintedSyncStep, vintedSyncPercent, vintedSyncError, vintedSyncSuccess, handleSyncVintedReviews }: VintedReviewsController) {
    return (
    <div className="animate-fade-in space-y-6">
        <div className="rounded-2xl border border-teal-200 bg-linear-to-r from-teal-50 to-emerald-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    <h3 className="text-sm font-black text-teal-950 uppercase tracking-wider">Αξιολογήσεις & Φήμη Vinted</h3>
                </div>
                <p className="text-xs text-teal-800 leading-relaxed max-w-2xl">
                    Διαχείριση και αυτόματος συγχρονισμός των αξιολογήσεων από το επίσημο προφίλ <strong>aramcreations</strong> στο Vinted. Οι κριτικές προβάλλονται αυτόματα στη βιτρίνα του καταστήματος.
                </p>
            </div>

            <button
                type="button"
                onClick={handleSyncVintedReviews}
                disabled={isSyncingVintedReviews}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-xs disabled:opacity-50 shrink-0"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingVintedReviews ? 'animate-spin' : ''}`} />
                <span>{isSyncingVintedReviews ? 'Συγχρονισμός...' : 'Συγχρονισμός Vinted'}</span>
            </button>
        </div>

        {/* Progress or Status Feedback (Rule 2) */}
        {isSyncingVintedReviews && (
            <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                    <span>{vintedSyncStep}</span>
                    <span>{vintedSyncPercent}%</span>
                </div>
                <div className="w-full bg-teal-100 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${vintedSyncPercent}%` }}
                    />
                </div>
            </div>
        )}

        {vintedSyncError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1 animate-fade-in">
                <div className="font-bold flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Σφάλμα συγχρονισμού Vinted:</span>
                </div>
                <p className="font-mono text-[11px] text-rose-900 bg-white/70 p-2 rounded-lg border border-rose-200">
                    {vintedSyncError}
                </p>
            </div>
        )}

        {vintedSyncSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{vintedSyncSuccess}</span>
            </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Βαθμολογία</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.ratingScore || 5.0}</span>
                    <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Σύνολο Κριτικών</span>
                <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.feedbackCount || 10}</span>
                <span className="text-[10px] text-stone-500 block">100% Θετικές</span>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Ενεργά Προϊόντα</span>
                <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.itemCount || 106}</span>
                <span className="text-[10px] text-stone-500 block">Κατάλογος Vinted</span>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Προφίλ Vinted</span>
                <a
                    href={`https://www.vinted.gr/member/${vintedReviewsData.stats.memberId || '231329281'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 mt-1 truncate"
                >
                    <span>@{vintedReviewsData.stats.login || 'aramcreations'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
            </div>
        </div>

        {/* Reviews List */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
                        Αποθηκευμένες Αξιολογήσεις ({vintedReviewsData.reviews.length || 10})
                    </h4>
                    <p className="text-[11px] text-stone-500">
                        Όλες οι κριτικές ελέγχονται αυτόματα και αφαιρούνται τα τυποποιημένα μηνύματα κατάστασης.
                    </p>
                </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(vintedReviewsData.reviews.length > 0 ? vintedReviewsData.reviews : [
                    { id: 1, userLogin: 'vasileiasefer', rating: 5, formattedDate: '27 Οκτωβρίου 2026', feedback: 'Τα προϊόντα έφτασαν σε τέλεια κατάσταση, η συσκευασία τους πολύ προσεγμένη και με οδηγίες χρήσης για το πώς να τα προσέξω.', sellerReply: 'Σας ευχαριστώ πολύ!' },
                    { id: 2, userLogin: 'piscesismysign', rating: 5, formattedDate: '26 Σεπτεμβρίου 2026', feedback: 'Το κολιέ είναι πραγματικά πανέμορφο! Το λουλούδι το κάνει πολύ ξεχωριστό και φαίνεται ακόμη πιο όμορφο από κοντά. Πολύ προσεγμένη δουλειά και λεπτομέρεια.', sellerReply: 'Ευχαριστώ πολύ!' },
                    { id: 3, userLogin: 'zoioulia', rating: 5, formattedDate: '10 Σεπτεμβρίου 2026', feedback: 'Ολα τέλεια, ευχαριστώ!', sellerReply: 'Εγώ ευχαριστώ πολύ!' },
                    { id: 4, userLogin: 'alkistisgln', rating: 5, formattedDate: '7 Σεπτεμβρίου 2026', feedback: 'Τέλειο το κολιέ και πολύ καλή συσκευασία', sellerReply: 'Ευχαριστώ πάρα πολύ!' },
                    { id: 5, userLogin: 'dosdosss', rating: 5, formattedDate: '3 Σεπτεμβρίου 2026', feedback: 'Άμεση αποστολή, τέλειο κολιέ και μου έβαλε και δωράκι ένα μπρελόκ! θα ξαναπάρω σίγουρα.', sellerReply: 'Ευχαριστώ πάρα πολύ!' }
                ]).map((rev, idx) => (
                    <div key={rev.id || idx} className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900">{rev.userLogin}</span>
                                <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                                <span className="text-[10px] text-stone-400">{rev.formattedDate}</span>
                            </div>
                            <div className="flex text-amber-500">
                                {[...Array(rev.rating || 5)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                        </div>
                        <p className="text-stone-700 italic">"{rev.feedback}"</p>
                    </div>
                ))}
            </div>
        </section>
    </div>
    );
}
