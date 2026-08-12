// Farben aus dem gedruckten Portfolio: die vollflächigen Rechtecke.
export const FARBEN = {
  blau: '#1512eb',
  orange: '#e0873a',
  magenta: '#ff00e6',
  pink: '#ee5fc4',
}

export interface Bild {
  src: string
  w: number
  h: number
  ar: number
}

export interface ProjektLink {
  label: string
  url: string
}

export type ProjektArt = 'bühne' | 'kostüm' | 'beides' | 'intervention'

export interface Projekt {
  slug: string
  titel: string
  rolle: string
  jahr: string
  jahrNum: number
  ort: string
  art: ProjektArt
  farbe: string
  blurb: string
  credits: string[]
  links?: ProjektLink[]
  video?: string
  videoDatei?: string
  bilder: Bild[]
}

const img = (slug: string, n: number, w: number, h: number): Bild => ({
  src: `${import.meta.env.BASE_URL}images/${slug}-${n}.jpg`,
  w,
  h,
  ar: w / h,
})

// Reihenfolge = Reihenfolge im gedruckten Portfolio.
export const PROJEKTE: Projekt[] = [
  {
    slug: 'um-ordnen',
    titel: 'UM/ORDNEN',
    rolle: 'Intervention',
    jahr: 'seit 2021',
    jahrNum: 2021.5,
    ort: 'urbaner Raum, Berlin',
    art: 'intervention',
    farbe: FARBEN.orange,
    blurb:
      'Berlin ist voll mit Dingen. Oder ist es voll mit Müll? Was einmal wertvoll war, wird plötzlich zum Abfall — weggeworfen, vergessen, liegen gelassen. Wir steigen ein, mitten in den Verfall. Dokumentieren. Sortieren. Spielen. Wir ordnen die Unordnung. Oder wir ordnen die Unordnung um.',
    credits: ['strolling_____ (Lara Scheuermann und Carolin Pflüger)'],
    links: [
      { label: 'strolling.de', url: 'https://strolling.de/um-ordnung/' },
      { label: 'instagram', url: 'https://www.instagram.com/strolling_____' },
    ],
    bilder: [img('um-ordnen', 1, 1080, 811), img('um-ordnen', 2, 1080, 817), img('um-ordnen', 3, 1080, 803), img('um-ordnen', 4, 1080, 807)],
  },
  {
    slug: 'heavy-matters',
    titel: 'Heavy Matters',
    rolle: 'walk in progress',
    jahr: '2026',
    jahrNum: 2026,
    ort: 'performativer Müllwalk',
    art: 'intervention',
    farbe: FARBEN.magenta,
    blurb:
      'Ein performativer Walk im öffentlichen Raum, der sich mit Müll, körperlicher Arbeit und geschlechtlich codierten Zuschreibungen von Gewicht, Wert und Sichtbarkeit auseinandersetzt. Wer trägt was — und unter welchen Bedingungen? Der Weg zur Entsorgungsstelle wird zur Choreografie.',
    credits: ['Konzept und Performance: Carolin Pflüger'],
    links: [{ label: 'Video', url: 'https://vimeo.com/1190920248' }],
    video: 'https://player.vimeo.com/video/1190920248',
    bilder: [img('heavy-matters', 1, 1080, 761), img('heavy-matters', 2, 1080, 761), img('heavy-matters', 3, 1080, 784)],
  },
  {
    slug: 'love-western',
    titel: 'Love Western',
    rolle: 'Kostüm',
    jahr: '2026',
    jahrNum: 2026,
    ort: 'Theater Freiburg',
    art: 'kostüm',
    farbe: FARBEN.blau,
    blurb:
      '»Wanted: Wilder Westen trifft queere Liebe!« In einer dystopischen Zukunft erzählt das Stück von einem queeren Paar, dessen geplante Hochzeit durch das Verbot der gleichgeschlechtlichen Ehe in Ohio verhindert wird. Eine rebellische Neuerzählung amerikanischer Geschichte als queerer Western.',
    credits: ['Regie und Text: Onur Karaoglu', 'Bühne: Doruk Çiftçi', 'Kostüme: Carolin Pflüger', 'Premiere: 16.05.2026'],
    bilder: [img('love-western', 1, 1080, 785), img('love-western', 2, 1080, 709), img('love-western', 3, 1037, 1080), img('love-western', 4, 960, 1080), img('love-western', 5, 830, 1080), img('love-western', 6, 836, 1080)],
  },
  {
    slug: 'reden',
    titel: 'Vielleicht können wir mal miteinander reden',
    rolle: 'Kostüm und Bühne',
    jahr: '2026',
    jahrNum: 2026,
    ort: 'Theater für Niedersachsen',
    art: 'beides',
    farbe: FARBEN.blau,
    blurb:
      'Eine Versuchsanordnung. Text, Schauspiel, Tanz, Ausstattung, Licht und Musik sind nicht aufeinander abgestimmt. Die Positionen gehen improvisiert und reagierend in ein Gespräch auf Augenhöhe — ein Gespräch, an dem auch das Publikum teilnimmt.',
    credits: ['Konzept: Alexander Hanauer', 'Bühne und Kostüm: Carolin Pflüger', 'Premiere: 07.05.2026'],
    bilder: [img('reden', 1, 763, 1080), img('reden', 2, 1080, 748), img('reden', 3, 738, 1080), img('reden', 4, 1080, 913)],
  },
  {
    slug: 'lost',
    titel: 'LOST',
    rolle: 'Bühne',
    jahr: '2025',
    jahrNum: 2025,
    ort: 'Staatstheater Braunschweig',
    art: 'bühne',
    farbe: FARBEN.orange,
    blurb:
      'In »LOST« forschen wir nach den körperlichen Reaktionen der allgegenwärtigen paralysierenden Überforderung. Zwischen Ekstase und Erschöpfung, Fluktuation, Stagnation und Stillstand glauben wir fest daran, uns gemeinsam aus der Erstarrung zu lösen. Tanzperformance beim tanzstark! Festival.',
    credits: ['Konzept: Milena Kaltenbach, Wilma Schapp', 'Bühne: Carolin Pflüger', 'Kostüm und Sound: Iggi Bühler', 'Premiere: 27.06.2025'],
    bilder: [img('lost', 1, 1080, 620), img('lost', 2, 1080, 712), img('lost', 3, 1080, 952), img('lost', 4, 932, 1080), img('lost', 5, 1080, 869)],
  },
  {
    slug: 'ein-stueck-vom-mond',
    titel: 'Ein Stück vom Mond',
    rolle: 'Bühne und Kostüm',
    jahr: '2025',
    jahrNum: 2025,
    ort: 'Das Weite Theater Berlin',
    art: 'beides',
    farbe: FARBEN.blau,
    blurb:
      'Kindertheater ab 4 Jahren. Bei dem Versuch, einen neuen Stern zu erschaffen, stellen die beiden Weltenbauer*innen so Einiges her, nur keinen strahlenden Himmelskörper. Von der Erkenntnis, dass Scheitern auch Schönheit hervorbringen kann. Mit Rauch, Licht und ein bisschen Magie.',
    credits: ['Regie: Karoline Hoffmann', 'Bühne und Kostüme: Carolin Pflüger', 'Musik: Niklas Kraft', 'Premiere: 06.04.2025'],
    bilder: [img('ein-stueck-vom-mond', 1, 1080, 619), img('ein-stueck-vom-mond', 2, 662, 1080), img('ein-stueck-vom-mond', 3, 1080, 874), img('ein-stueck-vom-mond', 4, 1080, 874)],
  },
  {
    slug: 'draussen-feiern',
    titel: 'Draußen feiern die Leute',
    rolle: 'Bühne und Kostüm',
    jahr: '2025',
    jahrNum: 2025,
    ort: 'Theater Bremen',
    art: 'beides',
    farbe: FARBEN.pink,
    blurb:
      'Uraufführung nach dem Roman von Sven Pfizenmaier. In einem Dorf in Niedersachsen verschwinden junge Menschen. Die inneren Konflikte des Coming-of-Age, der Wunsch nach Zugehörigkeit sowie die Suche nach Glück werden in einer fantastisch-komischen Formsprache nach außen getragen.',
    credits: ['Regie: Viktor Lamert', 'Bühne und Kostüme: Carolin Pflüger', 'Premiere: 23.01.2025'],
    bilder: [img('draussen-feiern', 1, 1080, 619), img('draussen-feiern', 2, 1080, 710), img('draussen-feiern', 3, 1080, 868), img('draussen-feiern', 4, 1080, 1075), img('draussen-feiern', 5, 1080, 868)],
  },
  {
    slug: 'spuren',
    titel: 'Spuren',
    rolle: 'Kostüm',
    jahr: '2024',
    jahrNum: 2024,
    ort: 'Theaterhaus Jena',
    art: 'kostüm',
    farbe: FARBEN.orange,
    blurb:
      '»If the past gets twisted all the time, what’s the base for research?« Leon Pfannenmüller und Maxim Mamochkin schlüpfen versuchsweise in die Figuren ihrer Großmütter. Sie streiten, tanzen und singen — was versperrt den Blick in die Vergangenheit?',
    credits: ['Konzept und Regie: Leon Pfannenmüller', 'Kostüm: Carolin Pflüger', 'Premiere: 04.05.2024'],
    bilder: [img('spuren', 1, 1080, 618), img('spuren', 2, 1080, 573), img('spuren', 3, 1080, 769), img('spuren', 4, 1080, 772)],
  },
  {
    slug: 'amygdala',
    titel: 'Die Entführung der Amygdala',
    rolle: 'Bühne und Kostüm',
    jahr: '2024',
    jahrNum: 2024,
    ort: 'Theaterhaus Jena',
    art: 'beides',
    farbe: FARBEN.orange,
    blurb:
      'Eine Frau begeht einen Tabubruch: Nach einem Unfall und einer scheinbaren Amnesie entscheidet sie sich für eine neue Identität. Jenseits ihrer Rolle als Mutter und Ehefrau sucht sie nach einem neuen Platz — vielleicht in einem anderen Universum. Eingeladen zum Heidelberger Stückemarkt 2025.',
    credits: ['Von und mit: Pina Bergemann', 'Bühne und Kostüm: Carolin Pflüger', 'Premiere: 19.01.2024'],
    bilder: [img('amygdala', 1, 1080, 839), img('amygdala', 2, 761, 1080), img('amygdala', 3, 1080, 980), img('amygdala', 4, 1080, 980)],
  },
  {
    slug: 'bitte-auto-komm',
    titel: 'Bitte! Auto! Komm!',
    rolle: 'Bühne, Kostüm, Licht',
    jahr: '2024',
    jahrNum: 2024,
    ort: 'Theaterhaus Jena',
    art: 'beides',
    farbe: FARBEN.magenta,
    blurb:
      'Die vier Bewohner*innen einer WG in einem Haus in einer Straßenkurve haben die Wahrscheinlichkeit, dass ein Auto in ihr Zuhause fahren wird, gut berechnet. Also bleibt ihnen wohl nichts anderes übrig, als darauf zu warten. Warum kam ihnen nicht die Idee, nicht zu warten?',
    credits: ['Regie: Nanine Maria Kok', 'Bühne, Kostüm, Licht: Carolin Pflüger', 'Premiere: 05.04.2024'],
    bilder: [img('bitte-auto-komm', 1, 1080, 618), img('bitte-auto-komm', 2, 681, 1080), img('bitte-auto-komm', 3, 1080, 854), img('bitte-auto-komm', 4, 1080, 854)],
  },
  {
    slug: 'hundekot-attacke',
    titel: 'Die Hundekot-Attacke',
    rolle: 'Kostüm',
    jahr: '2023',
    jahrNum: 2023,
    ort: 'Theaterhaus Jena',
    art: 'kostüm',
    farbe: FARBEN.magenta,
    blurb:
      'Eine Vorstellung über Finsternis, Schönheit und Vergebung, basierend auf einer wahren Begebenheit. Eine Koproduktion mit Wunderbaum. Eingeladen zum Berliner Theatertreffen 2024 und zum Heidelberger Stückemarkt 2024.',
    credits: ['Regie, Text: Walter Bart (Wunderbaum)', 'Kostüm: Carolin Pflüger', 'Premiere: 28.10.2023'],
    bilder: [img('hundekot-attacke', 1, 1080, 619), img('hundekot-attacke', 2, 1080, 728), img('hundekot-attacke', 3, 720, 1080), img('hundekot-attacke', 4, 1080, 627), img('hundekot-attacke', 5, 1080, 603)],
  },
  {
    slug: 'on-repeat',
    titel: 'On Repeat',
    rolle: 'Kostüm',
    jahr: '2023',
    jahrNum: 2023,
    ort: 'Theaterhaus Jena',
    art: 'kostüm',
    farbe: FARBEN.blau,
    blurb:
      '»Das hat mir gerade noch gefehlt… Immer, wenn ich einen Stein umdrehe, sehe ich mein eigenes Gesicht.« Stückentwicklung am Theaterhaus Jena, eine Koproduktion mit dem Theater Rotterdam.',
    credits: ['Regie: Zarah Bracht', 'Kostüme: Carolin Pflüger', 'Premiere: 22.04.2023'],
    bilder: [img('on-repeat', 1, 1080, 1018), img('on-repeat', 2, 774, 1080), img('on-repeat', 3, 679, 1080), img('on-repeat', 4, 679, 1080), img('on-repeat', 5, 1080, 715), img('on-repeat', 6, 1080, 813)],
  },
  {
    slug: 'knast',
    titel: 'Knast',
    rolle: 'Kostüm',
    jahr: '2023',
    jahrNum: 2023,
    ort: 'Theaterhaus Jena',
    art: 'kostüm',
    farbe: FARBEN.blau,
    blurb:
      'Für die Stückentwicklung »Knast« spielen die Spieler*innen des Theaterhaus Jena die Theatergruppe der JVA Hohenleuben unter dem Coaching der Theatergruppe JVA Hohenleuben.',
    credits: ['Konzept und Regie: Leon Pfannenmüller', 'Kostüm: Carolin Pflüger', 'Premiere: 03.03.2023'],
    bilder: [img('knast', 1, 1080, 618), img('knast', 2, 1080, 467), img('knast', 3, 553, 1080), img('knast', 4, 1080, 1080), img('knast', 5, 1080, 1080), img('knast', 6, 1080, 1080)],
  },
  {
    slug: 'parachutes',
    titel: 'parachute(s)',
    rolle: 'Installation',
    jahr: '2021',
    jahrNum: 2021,
    ort: '48 Stunden Neukölln',
    art: 'intervention',
    farbe: FARBEN.pink,
    blurb:
      'Eine multimediale, interdisziplinäre und digitale Ausstellung zum Thema Luft, deren Werke mit Hilfe von Fallschirmen im Stadtraum sichtbar und aufrufbar gemacht werden. QUO möchte eine Brücke zwischen Luft und Erde, Vergangenheit und Zukunft, Digital- und Stadtraum schaffen.',
    credits: ['Künstlerinnenkollektiv QUO', 'partizipative Installation'],
    bilder: [img('parachutes', 1, 1080, 855), img('parachutes', 2, 1080, 854), img('parachutes', 3, 1080, 1028), img('parachutes', 4, 1080, 854), img('parachutes', 5, 612, 1080), img('parachutes', 6, 1080, 1029)],
  },
]

export const KONTAKT = {
  name: 'Carolin Pflüger',
  untertitel: '/Bühnen-, Kostümbildnerin, Kunstvermittlerin/',
  adresse: ['Utrechter Str. 48', '13347 Berlin'],
  email: 'capflueger@googlemail.com',
  telefon: '+49 162 330 8594',
  instagram: 'https://www.instagram.com/_carolinpflueger_',
}

export const byArt = (art: ProjektArt): Projekt[] => PROJEKTE.filter((p) => p.art === art)
export const findProjekt = (slug: string | null | undefined): Projekt | undefined =>
  PROJEKTE.find((p) => p.slug === slug)
