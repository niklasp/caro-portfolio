import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'

const AUSBILDUNG = [
  ['2014', 'Bachelor of Arts Kunst und Sonderpädagogik/Inklusion (Uni Leipzig)'],
  ['2014', 'Auslandsstipendium an der Accademia di Belle Arti di Roma (Rom, Italien)'],
  ['2017', 'Master of Education, Bildende Kunst (UdK Berlin), Sonderpädagogik (HU Berlin)'],
  ['2022', 'Master of Arts Bühnenbild/Szenischer Raum (TU Berlin)'],
]

const WERDEGANG = [
  ['seit 2023', 'freischaffende Bühnenbild- und Kostümbildnerin'],
  ['2022', 'Ausstattungsassistentin am Theater Bremen, Theaterhaus Jena'],
  ['2017–2022', 'Kunstlehrerin an der Carl-von-Linné Schule Berlin'],
  ['2018', 'Kunstvermittlerin „APPScouts“, Berlin Biennale'],
  ['seit 2018', 'freischaffende Künstlerin und Kunstvermittlerin'],
  ['2016–2017', 'Lernbegleiterin an der Revik-Veseli Schule Berlin'],
  ['2017', 'Mitgründerin des Künstlerinnenkollektivs QUO'],
  ['2016', 'Erwachsenenbildung, Deutsch für Geflüchtete bei A&QUA'],
]

const ARBEITEN = [
  ['2026', 'Love Western', 'Theater Freiburg. Kostüm. Regie: Onur Karaoglu'],
  ['2026', 'Coming Out', 'Theater für Niedersachsen. Bühne und Kostüm. Regie: Alexander Hanauer'],
  ['2025', 'Zeitstillstand', 'Theater am Kirchplatz Liechtenstein. künstlerische Mitarbeit Bühnen- und Kostümbild. Regie: Katrin Hilbe'],
  ['2025', 'LOST', 'Bühne. Tanzperformance beim tanzstark! Festival Staatstheater Braunschweig. Regie/Choreografie: Milena Kaltenbach, Wilma Schapp'],
  ['2025', 'Ein Stück vom Mond', 'Das Weite Theater für Puppen und Menschen Berlin. Bühne und Kostüm. Regie: Karoline Hoffmann'],
  ['2025', 'Draußen feiern die Leute', 'Theater Bremen. Bühne und Kostüm. Regie: Viktor Lamert'],
  ['2024', 'Spuren', 'Theaterhaus Jena. Kostüm. Regie: Leon Pfannenmüller'],
  ['2024', 'Blut', 'Theaterhaus Jena. Kostüm. Regie: Leon Pfannenmüller'],
  ['2024', 'Bitte! Auto! Komm!', 'Theaterhaus Jena. Bühne, Kostüm, Licht. Regie: Nanine Maria Kok'],
  ['2024', 'Die Entführung der Amygdala', 'Theaterhaus Jena. Bühne und Kostüm. Regie: Babett Grube/Pina Bergemann'],
  ['2023', 'Die Hundekot-Attacke', 'Theaterhaus Jena. Kostüm. Regie: Walter Bart (Wunderbaum). Eingeladen zum Berliner Theatertreffen 2024 und zum Heidelberger Stückemarkt 2024'],
  ['2023', 'Vom Dorf', 'Theaterhaus Jena. Kostüm. Regie: Lizzy Timmers'],
  ['2023', 'On Repeat', 'Theaterhaus Jena. Kostüm. Regie: Zarah Bracht'],
  ['2023', 'Knast', 'Theaterhaus Jena. Kostüm. Regie: Leon Pfannenmüller'],
  ['2021', 'Alcin*a', 'Ensemble Utopera, Berlin. Bühne. Regie: Teresa Reiber'],
]

const AUSSTELLUNGEN = [
  ['2026', 'Metamorphosen des Abfalls', 'Boss Bitch Baby — Projektraum Galerie M, Berlin. Installation'],
  ['2025', 'All About that Waste', '48 Stunden Neukölln. Installation'],
  ['2023', 'ein Traumspiel', 'Localize Potsdam / TU Berlin, fix-o-tec. Installation'],
  ['2022', 'parachute(s)', 'signals 48 Stunden Neukölln, Berlin. partizipative Installation'],
  ['2022', 'Experimente. Weil wir* euch** feiern***', 'Galerie Grolman, Berlin'],
  ['2021', 'QUO-Gallery II', 'Rundgang UdK, Berlin. Installation'],
  ['2019', 'QUO-Gallery / QUO II', '48h Neukölln / Plattenvereinigung Tempelhofer Feld. Installation'],
]

const AUSZEICHNUNGEN = [
  ['2025', 'Arbeits- und Recherchestipendium des Berliner Senats, Arbeitstitel „Transforming trash“'],
  ['2025', 'Einladung zum Heidelberger Stückemarkt mit „Die Entführung der Amygdala“'],
  ['2024', 'Einladung zum Berliner Theatertreffen mit „Die Hundekot-Attacke“'],
  ['2023', 'Theaterpreis des Bundes in der Kategorie Stadt- und Landestheater für das Theaterhaus Jena'],
  ['2023', 'Einladung zum „Heidelberger Stückemarkt“ mit „Die Hundekot-Attacke“'],
]

export default function Lebenslauf() {
  const navigate = useNavigate()

  // Esc schließt den Lebenslauf wieder.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.history.length > 1) navigate(-1)
        else navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <>
      <Kopf />
      <div className="lebenslauf">
        <section>
          <h2>Lebenslauf</h2>
          <p>
            Freischaffende Bühnen- und Kostümbildnerin, Kunstvermittlerin.
            <br />
            Mitbegründerin des Künstlerinnenkollektivs QUO, Teil des Bühnenbildduos strolling_____
          </p>

          <h3>Ausbildung</h3>
          {AUSBILDUNG.map(([jahr, text], i) => (
            <div className="ll-zeile" key={i}>
              <span className="jahr">{jahr}</span>
              <span>{text}</span>
            </div>
          ))}

          <h3>Beruflicher Werdegang</h3>
          {WERDEGANG.map(([jahr, text], i) => (
            <div className="ll-zeile" key={i}>
              <span className="jahr">{jahr}</span>
              <span>{text}</span>
            </div>
          ))}

          <h3>Software Skills</h3>
          <p>Adobe Creative Suite, Vectorworks, AutoCAD, Blender, 3-D Druck</p>

          <h3>Sprachliche Skills</h3>
          <p>Englisch, Italienisch, Spanisch</p>

          <h3>Sonstige Skills</h3>
          <p>
            Führerschein Klasse B, Genie-/Hebebühnenführerschein, Fortbildung in „graphic
            recording“ an der Akademie für Illustration und Design Berlin, Teilnahme an
            Workshopreihen des Szenografiebundes zum Thema Nachhaltigkeit
          </p>
        </section>

        <section className="werke">
          <h2>künstlerische Arbeiten</h2>

          <h3>Bühne und Kostüm</h3>
          {ARBEITEN.map(([jahr, titel, text], i) => (
            <div className="ll-zeile" key={i}>
              <span className="jahr">{jahr}</span>
              <span>
                <em>{titel}.</em> {text}
              </span>
            </div>
          ))}

          <h3>Ausstellungen</h3>
          {AUSSTELLUNGEN.map(([jahr, titel, text], i) => (
            <div className="ll-zeile" key={i}>
              <span className="jahr">{jahr}</span>
              <span>
                <em>{titel}.</em> {text}
              </span>
            </div>
          ))}

          <h3>Auszeichnungen</h3>
          {AUSZEICHNUNGEN.map(([jahr, text], i) => (
            <div className="ll-zeile" key={i}>
              <span className="jahr">{jahr}</span>
              <span>{text}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
