import { CategoryInfo, ArtItem, JewelryProduct } from './types';
import { WIX_MIGRATED_ART_ITEMS } from './wix_migrated_items';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'jewelry',
    title: 'Jewelry',
    subtitle: 'Boutique & Wearable Creations',
    pillar: 'shop',
    pillarLabel: 'The Boutique (E-Shop)',
    description: 'Μοναδικά χειροποίητα κοσμήματα (σκουλαρίκια, κολιέ, βραχιόλια) με αληθινά άνθη, βότσαλα, χάλκινο σύρμα και υγρό γυαλί.',
    itemCount: 8,
    coverImage: 'https://static.wixstatic.com/media/a497a5_a2b9c8e3dce5421a93c225998463eba3~mv2.jpg'
  },
  {
    id: 'sculptures',
    title: 'Sculptures',
    subtitle: 'Form, Texture & Materiality',
    pillar: 'physical',
    pillarLabel: 'Objects & Dimensional Art',
    description: 'Κυκλαδικό ειδώλιο (21x10cm) και Προτομή γυναίκας (17x20cm, 1.381g) από χαρτοπολτό, σύρμα, πηλό και χρώματα κιμωλίας.',
    itemCount: 2,
    coverImage: 'https://static.wixstatic.com/media/a497a5_3a89992d66cd42519defc49271c1f2d8~mv2.jpg'
  },
  {
    id: 'handcrafted-memories',
    title: 'Handcrafted Memories',
    subtitle: 'Keepsakes & Emotional Relics',
    pillar: 'physical',
    pillarLabel: 'Objects & Dimensional Art',
    description: 'Χειροποίητα ξύλινα μπρελόκ και ζωγραφισμένα βότσαλα από την Πάρο και τη Νάξο με 3D Mod Podge εφέ.',
    itemCount: 2,
    coverImage: 'https://static.wixstatic.com/media/a497a5_ef22ea2b5d1f43769587ab3b011c5915~mv2.png'
  },
  {
    id: 'custom-objects',
    title: 'Custom Objects',
    subtitle: 'Bespoke Artifacts & Spatial Accents',
    pillar: 'physical',
    pillarLabel: 'Objects & Dimensional Art',
    description: 'Ζωγραφισμένοι αναπτήρες, θήκες κινητών και custom κιθάρα στο χέρι με ακρυλικά και ειδικό βερνίκι.',
    itemCount: 3,
    coverImage: 'https://static.wixstatic.com/media/a497a5_e2487d2537134306977f93982fdf7a84~mv2.png'
  },
  {
    id: '3d-designs',
    title: '3D Designs',
    subtitle: 'Parametric & Digital Sculpting',
    pillar: 'digital',
    pillarLabel: 'Visual & Digital Media',
    description: 'Demon & Skull: 3D σχεδιασμός & εκτύπωση σε συνεργασία με το wood_laser_cut_gr, μελέτες με gouache & υγρό γυαλί.',
    itemCount: 2,
    coverImage: 'https://static.wixstatic.com/media/a497a5_6c225554dcee4e75bd88a5146198825c~mv2.png'
  },
  {
    id: 'drawings',
    title: 'Drawings',
    subtitle: 'Charcoal, Ink & Freehand Studies',
    pillar: 'fine-art',
    pillarLabel: 'Fine Art & Studies',
    description: 'Ελεύθερα σχέδια 50x70 σε χαρτί Schoeller (Architecture, Angel, Ποσειδώνας με φύλλα χρυσού, Faces).',
    itemCount: 5,
    coverImage: 'https://static.wixstatic.com/media/a497a5_cdb716231b3845a48d4c2f5f14257e92~mv2.jpg'
  },
  {
    id: 'photography',
    title: 'Photography',
    subtitle: 'Light, Contrast & Documented Spaces',
    pillar: 'digital',
    pillarLabel: 'Visual & Digital Media',
    description: 'Φωτογραφικές σειρές: Trans (Performance art & ρευστότητα), Crime (Κόκκινο & μαύρο κοντράστ), Mysterious Girl.',
    itemCount: 3,
    coverImage: 'https://static.wixstatic.com/media/a497a5_af1160fc592444098d8b4992a25d9bcd~mv2.jpg'
  },
  {
    id: 'graphic-design',
    title: 'Graphic Design',
    subtitle: 'Identity, Typography & Editorial',
    pillar: 'digital',
    pillarLabel: 'Visual & Digital Media',
    description: 'i-Thea Αρχαία Θέατρα Ηπείρου, Human Traces, Radical Design, Branding Τμήματος Πολιτισμού, 100 Years Bauhaus, Fanzine.',
    itemCount: 6,
    coverImage: 'https://static.wixstatic.com/media/a497a5_4fd370bf36df4aa8b8937d6ec5e64c5b~mv2.jpg'
  },
  {
    id: 'art-projects',
    title: 'Art Projects',
    subtitle: 'Installations, Curated Series & Narratives',
    pillar: 'fine-art',
    pillarLabel: 'Fine Art & Studies',
    description: 'Κάτοψη Εαυτού (Γλυπτικός λαβύρινθος), Ημέρες Πανδημίας (Stop-motion installation), Παράξενη Φύση (E-waste εγκατάσταση).',
    itemCount: 3,
    coverImage: 'https://static.wixstatic.com/media/a497a5_66537e431cd6418aa7fbcdb8737ec9a0~mv2.png'
  }
];

export const JEWELRY_CATALOG: JewelryProduct[] = [
  {
    id: 'jw-01',
    title: 'Aura Torc Minimalist Choker',
    subtitle: 'Hand-hammered sterling silver 925 neckpiece',
    price: 135,
    originalPrice: 155,
    materials: ['Sterling Silver 925', 'Satin Brushed Finish'],
    description: 'Ευέλικτο περιλαίμιο με ανοιχτό τελείωμα. Σμιλεμένο στο χέρι με ήπιες κρούσεις σφυριού που δημιουργούν φυσική διάθλαση του φωτός.',
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1000&auto=format&fit=crop'
    ],
    inStock: true,
    stockCount: 3,
    badge: 'Signature Piece',
    vintedSynced: true,
    vintedUrl: 'https://www.vinted.gr/member/231329281',
    weight: '24g',
    edition: 'Limited Handmade Batch'
  },
  {
    id: 'jw-02',
    title: 'Sculpted Signet Monolith Ring',
    subtitle: 'Solid cast silver with raw textured plateau',
    price: 88,
    materials: ['Recycled Silver 925', 'Oxidized Patina Details'],
    description: 'Δαχτυλίδι με έντονο όγκο και αρχιτεκτονική γεωμετρία. Φινίρισμα με μερική οξείδωση για βάθος και κοντράστ.',
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?q=80&w=1000&auto=format&fit=crop'
    ],
    inStock: true,
    stockCount: 5,
    vintedSynced: true,
    vintedUrl: 'https://www.vinted.gr/member/231329281',
    weight: '14g',
    edition: 'Made to Size'
  },
  {
    id: 'jw-03',
    title: 'Drop Silhouette Kinetic Earrings',
    subtitle: 'Organic gold-vermeil articulated drops',
    price: 95,
    materials: ['18k Gold Plated Brass', 'Silver Ear Posts'],
    description: 'Σκουλαρίκια με ελεύθερη κίνηση εμπνευσμένα από τη ροή του υγρού μετάλλου. Ελαφριά και άνετα για καθημερινή χρήση.',
    images: [
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?q=80&w=1000&auto=format&fit=crop'
    ],
    inStock: true,
    stockCount: 2,
    badge: 'Popular',
    vintedSynced: true,
    vintedUrl: 'https://www.vinted.gr/member/231329281',
    weight: '8g/pair',
    edition: 'Ready to Ship'
  },
  {
    id: 'jw-04',
    title: 'Brutalist Link Chain Bracelet',
    subtitle: 'Custom formed irregular links with secure hook',
    price: 110,
    materials: ['Solid Brass & Micro-Silver Dipped'],
    description: 'Βραχιόλι με χειροποίητους κρίκους, καθένας ελαφρώς διαφορετικός από τον άλλον. Βιομηχανική κομψότητα και διαχρονικός χαρακτήρας.',
    images: [
      'https://images.unsplash.com/photo-1611591475155-426477484d26?q=80&w=1000&auto=format&fit=crop'
    ],
    inStock: true,
    stockCount: 4,
    vintedSynced: true,
    vintedUrl: 'https://www.vinted.gr/member/231329281',
    weight: '32g',
    edition: 'Small Batch'
  },
  {
    id: 'jw-05',
    title: 'Flower Earrings & Natural Bloom Drops',
    subtitle: 'Χειροποίητα σκουλαρίκια με αληθινά άνθη & υγρό γυαλί',
    price: 45,
    materials: ['Αληθινά πέταλα λουλουδιών', 'Υγρό γυαλί', 'Χάλκινο σύρμα', 'Ασήμι 925'],
    description: 'Μοναδικά χειροποίητα κοσμήματα δημιουργημένα με αληθινά άνθη λουλουδιών, υγρό γυαλί και χάλκινο σύρμα. Από τη συλλογή κοσμημάτων του Wix.',
    images: [
      'https://static.wixstatic.com/media/a497a5_470534b859b94edd9791a95bdc3dbfea~mv2.jpg',
      'https://static.wixstatic.com/media/a497a5_a2b9c8e3dce5421a93c225998463eba3~mv2.jpg'
    ],
    inStock: true,
    stockCount: 6,
    badge: 'Wix Signature Bloom',
    vintedSynced: true,
    vintedUrl: 'https://www.vinted.gr/member/231329281',
    weight: '6g',
    edition: 'JamJar & Vinted Batch'
  }
];

// All precise projects migrated directly from Aristea Amountzia's Wix site
export const ART_ITEMS: ArtItem[] = WIX_MIGRATED_ART_ITEMS;
