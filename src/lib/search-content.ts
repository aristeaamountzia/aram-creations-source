import { getBuildHeroSnapshot, heroPosterFor } from './hero-media';

export const SITE_URL = 'https://aramcreationsofficial.netlify.app';
export const searchPages = {
  shop: {
    path: '/',
    title: 'Aram Creations | Χειροποίητα κοσμήματα & μοναδικές δημιουργίες',
    description: 'Χειροποίητα κοσμήματα με αληθινά άνθη, υγρό γυαλί και χάλκινο σύρμα από το Aram Creations. Ανακαλύψτε τις δημιουργίες και επικοινωνήστε για custom παραγγελίες.',
    heading: 'Χειροποίητα κοσμήματα & μοναδικές δημιουργίες',
  },
  portfolio: {
    path: '/portfolio/',
    title: 'Έργα & δημιουργίες | Portfolio Aram Creations',
    description: 'Το εικαστικό portfolio του Aram Creations: γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες. Επικοινωνήστε για ανάθεση έργου.',
    heading: 'Έργα & δημιουργίες του Aram Creations',
  },
};

export function studioContent(portfolio = false) {
  return `<section aria-labelledby="studio-heading"><h2 id="studio-heading">${portfolio ? 'Το εικαστικό εργαστήριο' : 'Το εργαστήριο Aram Creations'}</h2>
<p>Το Aram Creations είναι ανεξάρτητο καλλιτεχνικό εργαστήριο. Δημιουργεί χειροποίητα κοσμήματα με αληθινά άνθη, υγρό γυαλί και χάλκινο σύρμα, καθώς και έργα γλυπτικής, σχεδίου, φωτογραφίας και ψηφιακού σχεδιασμού.</p>
<h3>Μπορώ να ζητήσω μια προσωπική δημιουργία;</h3><p>Για custom κόσμημα ή ανάθεση εικαστικού έργου, στείλτε την ιδέα σας στο <a href="mailto:aristeaamnta@gmail.com">aristeaamnta@gmail.com</a> ή στο <a href="https://www.instagram.com/aram.creations/">Instagram του Aram Creations</a>. Επιβεβαιώστε υλικά, διαστάσεις, τιμή και χρόνο προετοιμασίας πριν από την παραγγελία.</p>
<h3>Πώς ενημερώνομαι για την αποστολή;</h3><p>Οι δημιουργίες αποστέλλονται μετά την προετοιμασία τους με BOX NOW ή courier. Το κόστος παράδοσης εμφανίζεται κατά την ολοκλήρωση της παραγγελίας. Μετά την αποστολή λαμβάνετε αριθμό εντοπισμού ή κωδικό θυρίδας.</p>
<h3>Πού βρίσκω λεπτομέρειες για κάθε δημιουργία;</h3><p>Στο κατάστημα μπορείτε να δείτε την τιμή, τη διαθεσιμότητα και τα υλικά κάθε κομματιού. Για διαστάσεις, φροντίδα ή δυνατότητα κατασκευής παρόμοιου κομματιού, επικοινωνήστε πριν από την αγορά.</p>
<p><a href="/">Χειροποίητα κοσμήματα</a> · <a href="/portfolio/">Portfolio έργων</a> · <a href="https://www.vinted.gr/member/231329281">Προφίλ και αξιολογήσεις στο Vinted</a> · <a href="https://www.instagram.com/aram.creations/">Instagram</a> · <a href="https://www.tiktok.com/@aram.creations">TikTok</a> · <a href="https://www.facebook.com/share/1DmHHwXCMC/">Facebook</a></p></section>`;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function heroShell(portfolio: boolean) {
  const hero = getBuildHeroSnapshot();
  const poster = heroPosterFor(portfolio ? hero.portfolioHeroVideoUrl : hero.heroVideoUrl);
  const text = portfolio ? '' : `<div style="position:relative;max-width:896px;padding:0 16px;"><div style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:clamp(28px,5vw,40px);line-height:1.2;letter-spacing:.025em;margin:0 0 16px;">${escapeHtml(hero.heroTitle)}</div><div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#e7e5e4;max-width:672px;margin:0 auto;">${escapeHtml(hero.heroSubtitle)}</div></div>`;
  return `<section aria-hidden="true" style="position:relative;height:clamp(520px,62svh,680px);overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;background:#0c0a09;">${poster ? `<img src="${poster}" alt="" fetchpriority="high" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" /><div style="position:absolute;inset:0;background:rgba(0,0,0,.55);"></div>` : ''}${text}</section>`;
}

export function initialContent(portfolio = false) {
  const logoSrc = portfolio ? '/logo-portfolio.png' : '/logo.png';
  const logoFallback = portfolio ? '/logo-portfolio.svg' : '/logo.svg';

  // Static shell painted before any JavaScript runs: header bar + hero with the
  // video's first frame, so first-time visitors see the page instantly.
  return `<div id="root-loader" style="min-height:100vh;width:100%;background-color:#fafaf9;"><div style="height:64px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #e7e5e4;"><img src="${logoSrc}" alt="Aram Creations" width="36" height="48" style="height:44px;width:auto;object-fit:contain;display:block;" onerror="this.onerror=null;this.src='${logoFallback}';" /></div>${heroShell(portfolio)}</div><main style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"><nav aria-label="Κύρια πλοήγηση"><a href="/">Shop</a> · <a href="/portfolio/">Portfolio</a></nav><h1>${searchPages[portfolio ? 'portfolio' : 'shop'].heading}</h1>${studioContent(portfolio)}<p>Ο διαδραστικός κατάλογος απαιτεί JavaScript. Μπορείτε επίσης να επικοινωνήσετε με το εργαστήριο μέσω email ή Instagram.</p></main>`;
}
