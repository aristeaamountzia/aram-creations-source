import { getBuildHeroSnapshot, heroPosterFor } from './hero-media';
import { DEFAULT_PORTFOLIO_DESIGN } from './portfolio-settings';

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
<details><summary>Μπορώ να ζητήσω μια προσωπική δημιουργία;</summary><p>Για custom κόσμημα ή ανάθεση εικαστικού έργου, στείλτε την ιδέα σας στο <a href="mailto:aristeaamnta@gmail.com">aristeaamnta@gmail.com</a> ή στο <a href="https://www.instagram.com/aram.creations/">Instagram του Aram Creations</a>. Επιβεβαιώστε υλικά, διαστάσεις, τιμή και χρόνο προετοιμασίας πριν από την παραγγελία.</p></details>
<details><summary>Πώς ενημερώνομαι για την αποστολή;</summary><p>Οι δημιουργίες αποστέλλονται μετά την προετοιμασία τους με BOX NOW ή courier. Το κόστος παράδοσης εμφανίζεται κατά την ολοκλήρωση της παραγγελίας. Μετά την αποστολή λαμβάνετε αριθμό εντοπισμού ή κωδικό θυρίδας.</p></details>
<details><summary>Πού βρίσκω λεπτομέρειες για κάθε δημιουργία;</summary><p>Στο κατάστημα μπορείτε να δείτε την τιμή, τη διαθεσιμότητα και τα υλικά κάθε κομματιού. Για διαστάσεις, φροντίδα ή δυνατότητα κατασκευής παρόμοιου κομματιού, επικοινωνήστε πριν από την αγορά.</p></details>
<p><a href="/">Χειροποίητα κοσμήματα</a> · <a href="/portfolio/">Portfolio έργων</a> · <a href="https://www.vinted.gr/member/231329281">Προφίλ και αξιολογήσεις στο Vinted</a> · <a href="https://www.instagram.com/aram.creations/">Instagram</a> · <a href="https://www.tiktok.com/@aram.creations">TikTok</a> · <a href="https://www.facebook.com/share/1DmHHwXCMC/">Facebook</a></p></section>`;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function heroShell(portfolio: boolean) {
  const hero = getBuildHeroSnapshot();
  const collection = portfolio ? 'portfolio' : 'shop';
  const fallback = '/assets/hero/' + collection + '-hero-v1.jpg';
  const poster = portfolio ? heroPosterFor(hero.portfolioHeroVideoUrl) || fallback : '/assets/hero/shop-gallery.webp';
  const title = escapeHtml(portfolio ? DEFAULT_PORTFOLIO_DESIGN.title : hero.heroTitle.trim() || 'Χειροποίητα κοσμήματα');
  const description = escapeHtml(portfolio ? DEFAULT_PORTFOLIO_DESIGN.subtitle : hero.heroSubtitle);
  return `<section class="collection-hero gallery-hero gallery-hero--${collection}" aria-hidden="true"><div class="collection-hero-copy">${portfolio ? '<p class="collection-kicker">Aram Creations / Portfolio</p>' : ''}<h1 class="collection-title">${title}</h1>${description ? `<p class="collection-intro">${description}</p>` : ''}</div><div class="collection-hero-media"><img src="${poster}" alt="" fetchpriority="high" decoding="async" /></div></section>`;
}

export function initialContent(portfolio = false) {
  return `<div id="root-loader"><div class="studio-loading-header"><span>aram.creations</span></div>${heroShell(portfolio)}</div><main style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"><nav aria-label="Κύρια πλοήγηση"><a href="/">Shop</a> · <a href="/portfolio/">Portfolio</a></nav><h1>${searchPages[portfolio ? 'portfolio' : 'shop'].heading}</h1>${studioContent(portfolio)}<p>Ο διαδραστικός κατάλογος απαιτεί JavaScript. Μπορείτε επίσης να επικοινωνήσετε με το εργαστήριο μέσω email ή Instagram.</p></main>`;
}
