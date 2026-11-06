export const SITE_URL = 'https://aramcreationsofficial.netlify.app';
export const searchPages = {
  shop: {
    path: '/',
    title: 'Aram Creations | Χειροποίητα κοσμήματα στον Βόλο',
    description: 'Χειροποίητα κοσμήματα με αληθινά άνθη, υγρό γυαλί και χάλκινο σύρμα από το Aram Creations στον Βόλο. Ανακαλύψτε τις δημιουργίες και επικοινωνήστε για custom παραγγελίες.',
    heading: 'Χειροποίητα κοσμήματα από τον Βόλο',
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
<p>Το Aram Creations είναι ανεξάρτητο καλλιτεχνικό εργαστήριο στον Βόλο. Δημιουργεί χειροποίητα κοσμήματα με αληθινά άνθη, υγρό γυαλί και χάλκινο σύρμα, καθώς και έργα γλυπτικής, σχεδίου, φωτογραφίας και ψηφιακού σχεδιασμού.</p>
<h3>Μπορώ να ζητήσω μια προσωπική δημιουργία;</h3><p>Για custom κόσμημα ή ανάθεση εικαστικού έργου, στείλτε την ιδέα σας στο <a href="mailto:aristeaamnta@gmail.com">aristeaamnta@gmail.com</a> ή στο <a href="https://www.instagram.com/aram.creations/">Instagram του Aram Creations</a>. Επιβεβαιώστε υλικά, διαστάσεις, τιμή και χρόνο προετοιμασίας πριν από την παραγγελία.</p>
<h3>Πώς ενημερώνομαι για την αποστολή;</h3><p>Οι δημιουργίες αποστέλλονται μετά την προετοιμασία τους με BOX NOW ή courier. Το κόστος παράδοσης εμφανίζεται κατά την ολοκλήρωση της παραγγελίας. Μετά την αποστολή λαμβάνετε αριθμό εντοπισμού ή κωδικό θυρίδας.</p>
<h3>Πού βρίσκω λεπτομέρειες για κάθε δημιουργία;</h3><p>Στο κατάστημα μπορείτε να δείτε την τιμή, τη διαθεσιμότητα και τα υλικά κάθε κομματιού. Για διαστάσεις, φροντίδα ή δυνατότητα κατασκευής παρόμοιου κομματιού, επικοινωνήστε πριν από την αγορά.</p>
<p><a href="/">Χειροποίητα κοσμήματα</a> · <a href="/portfolio/">Portfolio έργων</a> · <a href="https://www.vinted.gr/member/231329281">Προφίλ και αξιολογήσεις στο Vinted</a></p></section>`;
}

export function initialContent(portfolio = false) {
  return `<main style="max-width:960px;margin:3rem auto;padding:0 1.5rem;line-height:1.8"><nav aria-label="Κύρια πλοήγηση"><a href="/">Shop</a> · <a href="/portfolio/">Portfolio</a></nav><h1>${searchPages[portfolio ? 'portfolio' : 'shop'].heading}</h1>${studioContent(portfolio)}<p>Ο διαδραστικός κατάλογος απαιτεί JavaScript. Μπορείτε επίσης να επικοινωνήσετε με το εργαστήριο μέσω email ή Instagram.</p></main>`;
}
