// A small sample campaign so a new user can see how everything fits together.
window.makeSampleCampaign = function makeSampleCampaign() {
  const now = Date.now();
  const items = [
    // Quests
    { id: 'q1', type: 'quest', title: 'Find the missing ferryman', status: 'active',
      notes: 'Hob the ferryman vanished three nights ago. His boat drifted back to Saltmarrow empty, the lantern still lit and burning black.' },
    { id: 'q2', type: 'quest', title: 'Recover the Tidebound Compass', status: 'active',
      notes: 'Captain Vale will pay 200 gp for the compass. It points toward whatever the holder fears most.' },
    { id: 'q3', type: 'quest', title: 'Learn why the Blackwick light burns black', status: 'rumor',
      notes: 'Fishermen say the old lighthouse lit itself on the new moon. Nobody has kept it in forty years.' },
    { id: 'q4', type: 'quest', title: 'Who is buying up the drowned graves?', status: 'rumor',
      notes: 'Old Mag overheard a stranger offering silver for the deeds to the flooded cemetery plots.' },
    { id: 'q5', type: 'quest', title: 'Clear the rats from the cellar', status: 'done',
      notes: 'Not rats. A swarm of salt-crabs. Mag gave the party free rooms for a month.' },
    { id: 'q6', type: 'quest', title: 'Escort the cartographer to Gullhaven', status: 'failed',
      notes: 'Ambushed on the cliff road. The cartographer was taken; the party kept half of her maps.' },

    // Party
    { id: 'c1', type: 'character', kind: 'party', title: 'Brannoc Ashdelve', role: 'Dwarf cleric', player: 'Sam',
      notes: 'Sworn to a sea god he privately doubts. Keeps a ledger of every favor owed to him.' },
    { id: 'c2', type: 'character', kind: 'party', title: 'Ivy Thorne', role: 'Halfling rogue', player: 'Priya',
      notes: 'Grew up in Saltmarrow. Owes Captain Vale money and has not told the others.' },
    { id: 'c3', type: 'character', kind: 'party', title: 'Sefa', role: 'Tiefling warlock', player: 'Marcus',
      notes: 'Her patron speaks only through reflections in water.' },

    // Everyone else
    { id: 'c4', type: 'character', kind: 'npc', title: 'Old Mag', role: 'Innkeeper',
      notes: 'Runs the Salt & Sorrow. Hears everything, repeats about half of it.' },
    { id: 'c5', type: 'character', kind: 'npc', title: 'Captain Orrin Vale', role: 'Harbormaster',
      notes: 'Polite, patient, and owns more of Saltmarrow than anyone realizes.' },
    { id: 'c6', type: 'character', kind: 'npc', title: 'The Grey Widow', role: 'Unknown',
      notes: 'Seen at the edge of the docks the night Hob disappeared. Leaves wet footprints indoors.' },

    // Locations
    { id: 'l1', type: 'location', title: 'Saltmarrow', region: 'The Shiverine Coast',
      notes: 'A fishing town built on stilts above the tide flats. Fog most mornings.' },
    { id: 'l2', type: 'location', title: 'The Salt & Sorrow', region: 'Saltmarrow',
      notes: 'Tavern and inn. Low ceilings, good chowder, a cellar that floods at spring tide.' },
    { id: 'l3', type: 'location', title: 'Blackwick Light', region: 'Gullhaven Point',
      notes: 'Abandoned lighthouse on a tidal island. Reachable on foot for two hours a day.' },

    // Sessions
    { id: 's1', type: 'session', number: 1, date: '2026-09-12', title: 'Fog over Saltmarrow',
      notes: 'The party met at the Salt & Sorrow. Cleared the cellar (salt-crabs, not rats). Ivy recognized Captain Vale and left the room.' },
    { id: 's2', type: 'session', number: 2, date: '2026-09-26', title: 'The cliff road',
      notes: 'Took the cartographer job. Ambushed by masked riders; the cartographer was carried off. Brannoc nearly died.' },
    { id: 's3', type: 'session', number: 3, date: '2026-10-10', title: 'A lantern burning black',
      notes: "Hob's boat came back empty. Sefa's patron whispered a name: the Grey Widow. Vale offered the compass job." },
  ];

  const links = [
    ['q1', 'c6'], ['q1', 'l1'], ['q1', 's3'],
    ['q2', 'c5'], ['q2', 's3'],
    ['q3', 'l3'],
    ['q4', 'c4'],
    ['q5', 'l2'], ['q5', 'c4'], ['q5', 's1'],
    ['q6', 's2'],
    ['c2', 'c5'], ['c3', 'c6'],
    ['l2', 'l1'], ['c4', 'l2'], ['c5', 'l1'],
    ['s1', 'l2'], ['s3', 'c6'],
  ];

  items.forEach((it) => { it.links = []; it.created = now; it.updated = now; });
  const byId = Object.fromEntries(items.map((it) => [it.id, it]));
  links.forEach(([a, b]) => { byId[a].links.push(b); byId[b].links.push(a); });

  return { version: 1, campaign: { name: 'The Drowned Lantern' }, items };
};
