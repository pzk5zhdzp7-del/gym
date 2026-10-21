// Dehnübungen fürs Cool-down und die Beweglichkeits-Einheit.
// sec = Haltezeit pro Satz, reps = Wiederholungen, side = je Seite
// area: 'lower' = nach Beintagen, 'upper' = nach Oberkörpertagen, 'all' = passt immer

export const MOBILITY = [
  { id: 'pigeon', name: 'Taube (Po-Dehnung)', sets: 1, sec: 45, side: true, area: 'lower', focus: 'Po, Hüfte',
    cues: 'Aus dem Vierfüßlerstand ein Knie nach vorn zwischen die Hände legen, Unterschenkel schräg. Hinteres Bein lang nach hinten. Oberkörper langsam nach vorn sinken lassen.' },
  { id: 'figure4', name: 'Po-Dehnung in Rückenlage (Figur 4)', sets: 1, sec: 40, side: true, area: 'lower', focus: 'Po',
    cues: 'Rückenlage, rechten Knöchel aufs linke Knie legen. Linken Oberschenkel mit beiden Händen zur Brust ziehen. Ideal, wenn die Taube unangenehm ist.' },
  { id: 'hipflexor', name: 'Hüftbeuger-Dehnung im Kniestand', sets: 1, sec: 40, side: true, area: 'lower', focus: 'Hüftbeuger',
    cues: 'Ausfallschritt mit hinterem Knie auf der Matte. Po anspannen und die Hüfte sanft nach vorn schieben. Arm der hinteren Seite nach oben strecken.' },
  { id: 'hamstring', name: 'Beinrückseite im Liegen', sets: 1, sec: 40, side: true, area: 'lower', focus: 'Oberschenkel hinten',
    cues: 'Rückenlage, ein Bein gestreckt nach oben, mit Handtuch oder Band um den Fuß sanft heranziehen. Anderes Bein bleibt am Boden.' },
  { id: 'quad', name: 'Oberschenkel vorne im Stand', sets: 1, sec: 30, side: true, area: 'lower', focus: 'Oberschenkel vorne',
    cues: 'Festhalten, eine Ferse zum Po ziehen, Knie zeigen nach unten, Po leicht anspannen.' },
  { id: 'butterfly', name: 'Schmetterling', sets: 1, sec: 45, area: 'lower', focus: 'Oberschenkel innen',
    cues: 'Sitzend Fußsohlen aneinander, Knie fallen nach außen. Mit geradem Rücken leicht nach vorn lehnen.' },
  { id: 'lat', name: 'Lat-Dehnung am Rack', sets: 1, sec: 30, side: true, area: 'upper', focus: 'Rücken seitlich',
    cues: 'Mit einer Hand eine Stange auf Hüfthöhe greifen, Hüfte nach hinten und zur Seite schieben, bis es seitlich im Rücken zieht.' },
  { id: 'chest', name: 'Brustdehnung an der Wand', sets: 1, sec: 30, side: true, area: 'upper', focus: 'Brust, vordere Schulter',
    cues: 'Unterarm auf Schulterhöhe an eine Wand oder einen Pfosten, Körper langsam wegdrehen.' },
  { id: 'triceps', name: 'Trizeps-Dehnung über Kopf', sets: 1, sec: 25, side: true, area: 'upper', focus: 'Trizeps, Schulter',
    cues: 'Hand hinter den Kopf zwischen die Schulterblätter, mit der anderen Hand den Ellbogen sanft nach hinten drücken.' },
  { id: 'thread', name: 'Thread the Needle', sets: 1, reps: 6, side: true, area: 'upper', focus: 'Brustwirbelsäule, Schultern',
    cues: 'Vierfüßlerstand, einen Arm unter dem Körper hindurch zur anderen Seite schieben, dann weit nach oben aufdrehen.' },
  { id: 'child', name: 'Kindhaltung', sets: 1, sec: 45, area: 'all', focus: 'Rücken, Entspannung',
    cues: 'Aus dem Fersensitz Oberkörper nach vorn auf die Oberschenkel legen, Arme lang nach vorn. Tief in den Bauch atmen.' },
  { id: 'catcow', name: 'Katze-Kuh', sets: 1, reps: 10, area: 'all', focus: 'Wirbelsäule',
    cues: 'Im Vierfüßlerstand Rücken abwechselnd rund machen und durchhängen lassen, langsam mit der Atmung.' },
];

export function getMobility(id) {
  return MOBILITY.find((m) => m.id === id);
}
