import currentCopy from './portfolio-english-copy.json';
import { textFingerprint } from './public-copy';
import { ART_ITEMS, CATEGORIES } from '../data';
import type { ArtItem } from '../types';
import { isGreekText, type PublicLocale } from './public-locale';

const english: Record<string, [medium: string, description: string, details: string[]]> = {
  'sculpt-01': ["Paper pulp, wire, paper, acrylic paint and varnish","A Cycladic figurine made from paper pulp, wire, paper, acrylic paint and varnish. Its pared-back form recreates the simplicity of Cycladic art in modern, recyclable materials.",["Minimal Cycladic form","Recyclable materials and paper pulp","Original handmade sculpture"]],
  'sculpt-02': ["Paper pulp, paper, wire, glue, acrylic filler, clay, chalk paint and varnish","A bust combining archaic and modern styles. Made from paper pulp, paper, wire, glue, acrylic filler, clay, chalk paint and varnish, the piece draws on ancient Greek art and contemporary aesthetics.",["Archaic and modern styles","Weight: 1,381 grams","Chalk paint and acrylic filler"]],
  'mem-01': ["Wood, beads, rhinestones, acrylic paint, Mod Podge and varnish","Wooden keychains made to order with wood_laser_cut_gr. Each is hand-painted with acrylics, finished with raised Mod Podge details and sealed with varnish.",["With wood_laser_cut_gr","Raised Mod Podge details","Handmade souvenir"]],
  'mem-02': ["Paros pebbles, acrylic paint, Mod Podge and protective varnish","Pebbles from Paros, painted by hand. Acrylics mixed with Mod Podge create a raised surface, and varnish protects the pieces and brings out the colors.",["Collected on Paros","Hand-painted relief","Protective gloss varnish"]],
  'obj-01': ["Hand-painted acrylics and protective varnish","Lighters and lighter cases painted by hand in acrylics and sealed with a durable varnish for daily use.",["Original painted design","Art for everyday use","Protective varnish"]],
  'obj-02': ["Hand-painted acrylics and durable protective varnish","Phone cases decorated by hand in acrylics. A protective varnish helps preserve the finish and colors through daily use.",["Decorative and protective","Hand-painted details","Designed for everyday use"]],
  'obj-03': ["Hand-painted acrylics and instrument varnish","A guitar painted by hand in acrylics and sealed with varnish to protect its finish from wear.",["One-off custom instrument","Hand-painted design","Acoustic instrument varnish"]],
  '3d-01': ["3D modeling and printing, mixed media on paper","Decorative objects designed and 3D printed with wood_laser_cut_gr, alongside studies on paper in acrylic, gouache, watercolor, dry and oil pastel, colored pencil, graphite and clear resin.",["With wood_laser_cut_gr","3D printing and mixed media","Clear resin and gouache"]],
  '3d-02': ["3D design and printing, gouache, watercolor, dry pastel and clear resin","A 3D design and print created with wood_laser_cut_gr, accompanied by studies on paper in acrylic, gouache, watercolor, dry and oil pastel, colored pencil, graphite and clear resin.",["Parametric 3D print","With wood_laser_cut_gr","Study on paper"]],
  'drw-01': ["Pencil on Schoeller paper","Freehand drawings in pencil on 50 × 70 cm Schoeller paper.",["50 × 70 cm Schoeller paper","Observational pencil drawing","Original drawing"]],
  'drw-02': ["Pencil linework on Schoeller paper","Freehand architectural drawings in pencil on 50 × 70 cm Schoeller paper, exploring perspective and space.",["50 × 70 cm Schoeller paper","Perspective and architectural space","Precise linework"]],
  'drw-03': ["Pencil on Schoeller paper","An ongoing pencil study of anatomy, light and shadow on 50 × 70 cm Schoeller paper.",["Work in progress","50 × 70 cm Schoeller paper","Anatomy study"]],
  'drw-04': ["Acrylic, gouache, watercolor, gold leaf and varnish on cardboard","A portrayal of Poseidon using bold colors and gold details to convey the ancient god’s power. Painted on cardboard in acrylic, gouache and watercolor with gold leaf and varnish.",["Gold leaf and acrylic","Gouache and varnish on cardboard","Raised texture"]],
  'drw-05': ["Acrylic, gouache, watercolor, dry and oil pastel, colored pencil, graphite and clear resin","Drawings on paper in different sizes, using acrylic, gouache, watercolor, dry and oil pastel, colored pencil, graphite and clear resin. The series studies facial expressions and what a gaze can convey.",["Mixed media and clear resin","Dry and oil pastels","Psychological portraiture"]],
  'pht-01': ["Performance photography in four parts","A photographic series exploring gender and sexual fluidity through performance. A man in drag makeup is the central figure in four parts covering childhood, adulthood, military service and the afterlife.",["Performance art","Four stages of life","Photographic documentation"]],
  'pht-02': ["Abstract photographic series in red and black","An abstract photographic series following the course of a crime. The contrast between red and black carries the story from calm through conflict to defeat and resolution.",["Red and black contrast","Visual narrative","Abstract photography"]],
  'pht-03': ["Narrative photographic series","The series introduces the setting before turning to its central character. Her face remains hidden throughout.",["Narrative photography","Hidden identity","Cinematic lighting"]],
  'grp-01': ["Graphic design and visual identity for a cultural route","A project from the five-day, 40-hour i-Thea workshop. It developed graphic materials for the cultural route linking the ancient theaters of Epirus at Dodona, Nicopolis, Kassope and Gitana.",["40-hour i-Thea workshop","Ancient theaters of Epirus","Visual identity"]],
  'grp-02': ["Exhibition catalog design and typography","A group university project for a fictional exhibition. The catalog explores the idea of human traces through abstract design.",["Editorial design","Conceptual typography","Book design"]],
  'grp-03': ["Exhibition catalog and visual teaser","An exhibition catalog and teaser for a fictional show, produced as a group university project using experimental graphics and visual storytelling.",["Radical design aesthetics","University project","Experimental typography"]],
  'grp-04': ["Visual identity, logo, color palette and brand applications","A visual identity for the Department of Culture, Creative Media and Industries, including a logo, a color palette and applications.",["Visual identity","Logo and palette design","Print applications"]],
  'grp-05': ["Posters and notebooks with geometric forms","Posters and notebooks marking the Bauhaus centenary, using geometric forms and strong contrasts. Jewelry and posters were also shown in the exhibition.",["Bauhaus centenary","Exhibition participant","Minimalist geometry"]],
  'grp-06': ["Hand-drawn and digitally edited fanzine and poster","A fanzine and poster about family, using hand drawings edited digitally to convey personal and emotional aspects of the subject.",["Fanzine and typography","Hand drawings and vector art","Personal storytelling"]],
  'artp-01': ["Paper, stiff cardboard, thread, glue, beads and small objects","A sculptural exploration of the artist’s inner life. Hard black cardboard walls represent a protective exterior. Toward the center, more fragile walls and red and black threads form an intricate maze.",["Sculptural maze","Red and black thread and cardboard","Conceptual sculpture"]],
  'artp-02': ["Cardboard, clay, acrylic paint, small objects and stop-motion video","A sculpture and stop-motion video made during the COVID-19 lockdown. Black walls and bars depict isolation below. Above, a person lies in a boat with books on the waves. Reading becomes a source of escape, relief and light.",["Stop-motion video and sculpture","Confinement and escape","Art installation"]],
  'artp-03': ["Cables, CDs, computer cases, stones, branches, leaves and fabric","An installation and video about electronic waste. Discarded technology gathered from illegal dumps is set alongside natural materials in a forest by a river. A CD case marked “Save me” and a disc titled “Strange Nature” sit at its center.",["Site-specific installation","Electronic waste and natural materials","Environmental video documentation"]],
};

type CopyField<T> = { source: string; text: T };
type ArtworkCopy = { title?: CopyField<string>; description?: CopyField<string>; medium?: CopyField<string>; details?: CopyField<string[]> };
const current: Record<string, ArtworkCopy> = currentCopy;

function matchCopy<T extends string | string[]>(source: T | undefined, translation?: CopyField<T>) {
  if (source == null || !translation) return undefined;
  return textFingerprint(typeof source === 'string' ? source : JSON.stringify(source)) === translation.source ? translation.text : undefined;
}

const seed = new Map(ART_ITEMS.map(item => [item.id, item]));
const categorySeed = new Map(CATEGORIES.map(category => [category.id, category]));
const categoryCopy: Record<string, string> = {
  jewelry: 'Handmade necklaces, earrings and bracelets made with real flowers, pebbles and clear resin.',
  sculptures: 'A Cycladic figurine and a bust made with paper pulp, wire, clay and chalk paint.',
  'handcrafted-memories': 'Handmade wooden keychains and painted pebbles from Paros and Naxos.',
  'custom-objects': 'Lighters, phone cases and a guitar, hand-painted in acrylics and finished with varnish.',
  '3d-designs': 'Demon and Skull, 3D printed with wood_laser_cut_gr, with studies in gouache and clear resin.',
  drawings: 'Freehand drawings on 50 × 70 cm Schoeller paper, including Architecture, Angel, Poseidon and Faces.',
  photography: 'Three photographic series: Trans, Crime and Mysterious Girl.',
  'graphic-design': 'Cultural identities, exhibition catalogs, posters and a fanzine.',
  'art-projects': 'A sculptural maze, a stop-motion installation and a project about electronic waste.',
};

export function localizedArt(item: ArtItem, locale: PublicLocale) {
  if (locale === 'el') return item;
  const original = seed.get(item.id);
  const entry = english[item.id];
  const saved = current[item.id];
  const title = item.title.replace(/\s*\(([^()]*)\)\s*$/, (match, suffix) => isGreekText(suffix) ? '' : match);
  return {
    ...item,
    title: item.titleEn?.trim() || matchCopy(item.title, saved?.title) || (item.title === original?.title
      ? item.id === 'grp-04' ? 'Branding for the Department of Culture and Creative Media' : title
      : item.title),
    medium: item.mediumEn?.trim() || matchCopy(item.medium, saved?.medium) || (entry && item.medium === original?.medium ? entry[0] : item.medium),
    description: item.descriptionEn?.trim() || matchCopy(item.description, saved?.description) || (entry && item.description === original?.description ? entry[1] : item.description),
    details: matchCopy(item.details, saved?.details) || (entry && item.details && JSON.stringify(item.details) === JSON.stringify(original?.details) ? entry[2] : item.details),
  };
}

export function localizedCategory(category: { id: string; description: string }, locale: PublicLocale) {
  return locale === 'en' && category.description === categorySeed.get(category.id)?.description
    ? categoryCopy[category.id] || category.description
    : category.description;
}
