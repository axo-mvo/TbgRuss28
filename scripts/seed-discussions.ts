/**
 * Seed script: Simulates discussions in all 6 stations for all 6 groups.
 * Creates fake users, assigns to groups, creates sessions, and inserts messages.
 *
 * Run: npx tsx scripts/seed-discussions.ts
 */

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vtbhffsujulzbavdjzbd.supabase.co",
  "***REMOVED***",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Fake users to create (per group, 5 people: 3 youth + 2 parents) ──

const FAKE_USERS: { name: string; role: "youth" | "parent" }[][] = [
  // Group 0: Teten (already has Marius admin)
  [
    { name: "Emma Larsen", role: "youth" },
    { name: "Noah Pedersen", role: "youth" },
    { name: "Olivia Hansen", role: "youth" },
    { name: "Kari Larsen", role: "parent" },
    { name: "Per Hansen", role: "parent" },
  ],
  // Group 1: The Underground Rebel Bingo Club (already has Lille Ungdom youth)
  [
    { name: "Sofie Andersen", role: "youth" },
    { name: "Jakob Berg", role: "youth" },
    { name: "Ingrid Johansen", role: "youth" },
    { name: "Trude Andersen", role: "parent" },
    { name: "Geir Berg", role: "parent" },
  ],
  // Group 2: Bægg1
  [
    { name: "Nora Kristiansen", role: "youth" },
    { name: "Elias Dahl", role: "youth" },
    { name: "Maja Nilsen", role: "youth" },
    { name: "Hilde Kristiansen", role: "parent" },
    { name: "Bjørn Nilsen", role: "parent" },
  ],
  // Group 3: Fangsten
  [
    { name: "Leah Haugen", role: "youth" },
    { name: "Oscar Bakke", role: "youth" },
    { name: "Ida Moen", role: "youth" },
    { name: "Sissel Haugen", role: "parent" },
    { name: "Rune Moen", role: "parent" },
  ],
  // Group 4: Sublime
  [
    { name: "Thea Strand", role: "youth" },
    { name: "Henrik Lund", role: "youth" },
    { name: "Amalie Solberg", role: "youth" },
    { name: "Grete Strand", role: "parent" },
    { name: "Erik Solberg", role: "parent" },
  ],
  // Group 5: Verket
  [
    { name: "Sara Vik", role: "youth" },
    { name: "Mathias Hagen", role: "youth" },
    { name: "Julie Brekke", role: "youth" },
    { name: "Marit Vik", role: "parent" },
    { name: "Stein Hagen", role: "parent" },
  ],
];

// ── Discussion messages per station (realistic Norwegian) ──
// Each station has a pool of messages. We'll pick subsets per group for variety.

const DISCUSSIONS: Record<number, string[]> = {
  1: [
    // Fellesskap og Samhold
    "For meg handler fellesskap om at alle føler seg trygge og inkludert, uansett bakgrunn.",
    "Jeg tenker vi bør ha faste samlinger der alle kan bli bedre kjent med hverandre.",
    "Det viktigste er at vi respekterer hverandre og står opp for de som trenger det.",
    "Vi hadde en veldig god opplevelse med teambuilding på skolen, kanskje vi kan gjøre noe lignende?",
    "Enig! Kanskje en hyttetur tidlig i planleggingen kan hjelpe oss å bli bedre sammensveiset.",
    "Jeg synes vi bør lage noen felles regler som alle er enige om fra starten.",
    "Konflikter bør tas opp med en gang, ikke la ting bygge seg opp over tid.",
    "Som forelder synes jeg det er flott at dere tenker på dette allerede nå.",
    "Vi kan ha en kontaktperson i hver gruppe som folk kan snakke med hvis noe er vanskelig.",
    "Det handler om å skape minner sammen, ikke bare feste. Turer, aktiviteter, dugnad - alt teller!",
    "Jeg er enig i at vi trenger felles regler. Kanskje vi kan stemme over dem sammen?",
    "Samhold betyr at vi tar vare på hverandre, også når ting er vanskelig.",
    "Bra poeng med kontaktperson! Da har folk en trygg person å gå til.",
    "Vi bør også feire de små tingene sammen, ikke bare de store begivenhetene.",
  ],
  2: [
    // Inkludering
    "Vi må være bevisste på hvem som kanskje ikke tør å si ifra selv.",
    "Inkludering handler ikke bare om å invitere alle - det handler om at alle føler seg velkomne.",
    "Jeg kjenner noen som ble holdt utenfor i fjor, og det var veldig vondt for dem.",
    "Vi bør ha en regel om at ingen snakker negativt om andre bak ryggen.",
    "Foreldre kan bidra ved å være oppmerksomme og støttende uten å blande seg for mye.",
    "Kanskje vi kan ha aktiviteter der man må samarbeide med folk man ikke kjenner så godt?",
    "Det er viktig å huske at alle har noe å bidra med, selv om de er stille.",
    "Sosiale medier kan gjøre inkludering vanskeligere. Lukka grupper kan føles ekskluderende.",
    "Enig med at sosiale medier er en utfordring. Vi bør tenke på det når vi lager grupper.",
    "Kanskje vi kan ha en felles chat der alle er med, ikke bare de nærmeste vennene?",
    "Vi bør aktivt oppsøke de som virker ensomme eller trekker seg tilbake.",
    "Som forelder vil jeg si at dere gjør en flott jobb med å tenke på dette!",
    "Noen ganger handler inkludering om å bare sette seg ned ved siden av noen og spørre hvordan det går.",
    "Vi kan rotere på grupper i noen aktiviteter, slik at alle blir kjent med alle.",
  ],
  3: [
    // Rus og Forebygging
    "Jeg synes det er viktig at ingen føler press til å drikke.",
    "Vi bør ha en klar avtale om at vi passer på hverandre hvis noen drikker for mye.",
    "Foreldre og ungdom bør kunne snakke åpent om dette uten at det blir kleint.",
    "Kanskje vi kan ha alkoholfrie arrangementer også, slik at det ikke alltid handler om festing?",
    "Kompiskontrakten er en god idé - at man avtaler grenser på forhånd.",
    "Det er viktig å vite hva man gjør hvis noen blir dårlige. Førstehjelp er viktig!",
    "Som forelder er jeg lettet over at dere tar dette så seriøst.",
    "Vi bør alle ha ICE-nummeret til foreldrene våre lett tilgjengelig.",
    "Russetiden kan være gøy uten at alt handler om alkohol. Det finnes så mye annet å gjøre!",
    "Enig! Vi kan ha konserter, turer, og spill som er morsomme uten alkohol.",
    "Hvis noen havner i trøbbel, er det viktigste at de tør å ringe for hjelp.",
    "Vi bør ha en buddy-ordning der man alltid har noen som passer på en.",
    "Det er helt ok å si nei. Ingen bør bli dømt for det.",
    "Foreldrene bør være tilgjengelige om natten i russetiden, det gir trygghet.",
  ],
  4: [
    // Budsjett og Økonomi
    "De største kostnadene er nok russeklær, buss-leie, og felles arrangementer.",
    "Vi bør lage et detaljert budsjett tidlig, slik at alle vet hva de går til.",
    "Ikke alle har like mye penger. Vi må finne løsninger som fungerer for alle.",
    "Kanskje vi kan ha et grunnbeløp som alle betaler, og så valgfrie tillegg?",
    "Det er viktig å holde rede på pengene og ha en kasserer som alle stoler på.",
    "Vi bør bruke et felles regnskap, kanskje en enkel app eller regneark?",
    "Russeklærne koster ofte 2-3000 kr. Bussen kan bli mye dyrere.",
    "Sponsorer kan hjelpe med å dekke noen kostnader, men det krever innsats.",
    "Som forelder synes jeg et budsjett på maks 5000 kr per person er rimelig.",
    "Vi bør prioritere opplevelser over dyre ting. Det handler om minner, ikke merker.",
    "Enig! Et realistisk budsjett der alle bidrar likt er den faireste løsningen.",
    "Vi kan spare penger på transport ved å samkjøre og planlegge litt bedre.",
    "Kanskje vi kan ha dugnad for å tjene inn litt av det vi trenger?",
    "Det er lurt å ha en buffer i budsjettet for uforutsette utgifter.",
  ],
  5: [
    // Finansiering
    "Vaffeldugnad er en klassiker, men kanskje vi kan tenke litt mer kreativt?",
    "Bilvask-dugnad har fungert bra for andre russegrupper.",
    "Noen bedrifter er villige til å sponse russeklær mot at logoen deres er med.",
    "Vi bør undersøke om det finnes noen lokale tilskudd eller stipender vi kan søke på.",
    "Loppemarkeder kan gi overraskende bra inntjening hvis vi organiserer det skikkelig.",
    "Kanskje vi kan tilby tjenester som hagearbeid eller snømåking i nabolaget?",
    "En russerevy eller konsert kan både være gøy og gi inntekter.",
    "Vi bør fordele inntektene etter hvor mye hver person faktisk har bidratt.",
    "Det er viktig å ha en realistisk plan. 50 000 kr fra dugnad krever mye innsats.",
    "Kanskje vi kan selge russekort eller lignende for å finansiere felles aktiviteter?",
    "Som forelder kan jeg hjelpe med å ta kontakt med bedrifter for sponsoravtaler.",
    "Vi kan også ha en nettbutikk med russerelaterte produkter som vi designer selv.",
    "Det viktigste er at alle bidrar med sin tid, ikke bare penger.",
    "Vi bør starte innsamlingen tidlig, kanskje allerede nå i vinter.",
  ],
  6: [
    // Nye Regler for Russebuss
    "De nye reglene sier vel at bussen må ha faste parkeringsplasser og ikke blokkere trafikken.",
    "Lydnivået er strengere regulert nå. Vi må passe på desibelgrensene.",
    "Det er viktig at vi setter oss inn i reglene tidlig, slik at vi slipper bøter.",
    "Kommunen har nye krav om søknad for russebuss. Vi bør søke i god tid.",
    "Kanskje vi egentlig ikke trenger en buss? Det finnes andre måter å ha det gøy på.",
    "Hvis vi leier buss, må vi ha en ansvarlig voksen som sjåfør. Det er nytt.",
    "De nye reglene handler mest om sikkerhet, og det er jo positivt egentlig.",
    "Vi bør kontakte kommunen direkte for å få oversikt over alle gjeldende regler.",
    "Forsikring for russebuss er blitt dyrere. Det påvirker budsjettet vårt.",
    "Kanskje vi kan dele buss med en annen gruppe for å spare kostnader?",
    "Som forelder er jeg glad for strengere sikkerhetskrav. Det gir mer trygghet.",
    "Vi bør lage en sjekkliste over alle krav og regler vi må oppfylle.",
    "Det er mulig å søke om unntak for noen av lydreglene under russefeiringen.",
    "Vi bør ha en voksen kontaktperson som har ansvar for at reglene følges.",
  ],
};

// ── Helpers ──

function pick<T>(arr: T[], n: number, offset: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[(offset + i) % arr.length]);
  }
  return result;
}

function randomMinutesAgo(base: number, range: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() - base - Math.floor(Math.random() * range));
  return d;
}

// ── Main ──

async function main() {
  console.log("=== Seed Discussions Script ===\n");

  // 1. Fetch existing data
  const { data: groups } = await sb.from("groups").select("id, name").order("name");
  const { data: stations } = await sb.from("stations").select("id, number, title").order("number");
  const { data: existingMembers } = await sb.from("group_members").select("group_id, user_id");
  const { data: existingSessions } = await sb.from("station_sessions").select("id, station_id, group_id, status");

  if (!groups || groups.length < 6) throw new Error(`Expected 6 groups, found ${groups?.length}`);
  if (!stations || stations.length < 6) throw new Error(`Expected 6 stations, found ${stations?.length}`);

  // Sort groups to match FAKE_USERS order: Teten, TURBC, Bægg1, Fangsten, Sublime, Verket
  const groupOrder = ["Teten", "The Underground Rebel Bingo Club", "Bægg1", "Fangsten", "Sublime", "Verket"];
  const sortedGroups = groupOrder.map((name) => groups.find((g) => g.name === name)!);

  console.log("Groups:", sortedGroups.map((g) => g.name).join(", "));
  console.log("Stations:", stations.map((s) => `${s.number}. ${s.title}`).join(", "));

  // 2. Create fake auth users & profiles
  console.log("\n--- Creating fake users ---");

  const groupUsers: string[][] = []; // groupIndex -> user_id[]

  for (let gi = 0; gi < 6; gi++) {
    const userIds: string[] = [];
    const group = sortedGroups[gi];

    // Keep existing members
    const existing = (existingMembers || []).filter((m) => m.group_id === group.id).map((m) => m.user_id);
    userIds.push(...existing);

    for (const user of FAKE_USERS[gi]) {
      const email = `${user.name.toLowerCase().replace(/[^a-z]/g, "")}.seed@russ28.test`;

      // Check if user already exists
      const { data: existingProfile } = await sb
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        console.log(`  [skip] ${user.name} already exists`);
        userIds.push(existingProfile.id);
        continue;
      }

      // Create auth user
      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email,
        password: "seed-password-123",
        email_confirm: true,
      });

      if (authErr) {
        console.error(`  [error] Creating auth user ${user.name}:`, authErr.message);
        continue;
      }

      // Create profile
      const { error: profErr } = await sb.from("profiles").insert({
        id: authUser.user.id,
        full_name: user.name,
        email,
        role: user.role,
      });

      if (profErr) {
        console.error(`  [error] Creating profile ${user.name}:`, profErr.message);
        continue;
      }

      console.log(`  [created] ${user.name} (${user.role})`);
      userIds.push(authUser.user.id);
    }

    groupUsers.push(userIds);
  }

  // 3. Assign users to groups (add missing memberships)
  console.log("\n--- Assigning group members ---");

  for (let gi = 0; gi < 6; gi++) {
    const group = sortedGroups[gi];
    const existing = (existingMembers || []).filter((m) => m.group_id === group.id).map((m) => m.user_id);

    for (const userId of groupUsers[gi]) {
      if (existing.includes(userId)) continue;

      const { error } = await sb.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
      });

      if (error) {
        console.error(`  [error] Assigning to ${group.name}:`, error.message);
      } else {
        console.log(`  [assigned] user to ${group.name}`);
      }
    }
  }

  // 4. Create station sessions & insert messages
  console.log("\n--- Creating sessions & messages ---");

  let totalMessages = 0;

  for (let gi = 0; gi < 6; gi++) {
    const group = sortedGroups[gi];
    const members = groupUsers[gi];

    for (const station of stations) {
      // Check if session already exists
      const existing = (existingSessions || []).find(
        (s) => s.station_id === station.id && s.group_id === group.id
      );

      let sessionId: string;
      const sessionStart = randomMinutesAgo(120, 60); // 1-3 hours ago
      const sessionEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000); // +15 min

      if (existing) {
        sessionId = existing.id;
        // Make sure it's completed
        if (existing.status !== "completed") {
          await sb.from("station_sessions").update({
            status: "completed",
            started_at: sessionStart.toISOString(),
            end_timestamp: sessionEnd.toISOString(),
            completed_at: sessionEnd.toISOString(),
          }).eq("id", sessionId);
        }
      } else {
        // Create new session
        const { data: newSession, error } = await sb.from("station_sessions").insert({
          station_id: station.id,
          group_id: group.id,
          status: "completed",
          started_at: sessionStart.toISOString(),
          end_timestamp: sessionEnd.toISOString(),
          completed_at: sessionEnd.toISOString(),
        }).select("id").single();

        if (error) {
          console.error(`  [error] Session for ${group.name} at station ${station.number}:`, error.message);
          continue;
        }
        sessionId = newSession.id;
      }

      // Check if messages already exist for this session
      const { count } = await sb.from("messages").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
      if (count && count > 0) {
        console.log(`  [skip] ${group.name} @ Station ${station.number} - already has ${count} messages`);
        continue;
      }

      // Pick 7-10 messages for this group at this station
      const msgCount = 7 + (gi % 4); // 7-10 messages
      const msgPool = DISCUSSIONS[station.number];
      const selectedMsgs = pick(msgPool, msgCount, gi * 3); // offset by group index for variety

      // Insert messages with staggered timestamps
      const msgRows = selectedMsgs.map((content, i) => {
        const memberIdx = i % members.length;
        const msgTime = new Date(sessionStart.getTime() + (i + 1) * 90_000); // 1.5 min apart
        return {
          session_id: sessionId,
          user_id: members[memberIdx],
          content,
          created_at: msgTime.toISOString(),
        };
      });

      const { error: msgErr } = await sb.from("messages").insert(msgRows);
      if (msgErr) {
        console.error(`  [error] Messages for ${group.name} @ Station ${station.number}:`, msgErr.message);
      } else {
        totalMessages += msgRows.length;
        console.log(`  [ok] ${group.name} @ Station ${station.number}: ${msgRows.length} messages`);
      }
    }
  }

  console.log(`\n=== Done! Inserted ${totalMessages} messages across 36 sessions ===`);
}

main().catch(console.error);
