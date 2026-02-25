/**
 * Seed script: Simulates discussions in all 5 stations for all 6 groups.
 * Creates fake users, assigns to groups, creates sessions, and inserts messages.
 *
 * Run: npx tsx scripts/seed-discussions.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    // Fellesskap og inkludering
    "Alle 25 må føle seg som én gjeng, ikke bare de som kjenner hverandre best fra før.",
    "Buss-prosjektet påvirker skolehverdagen – i lunsj, friminutt og på sosiale medier.",
    "Vi må passe på at ingen føler seg utenfor, heller ikke de som er stille.",
    "Kontrakten sier at den som trekker seg mister alle innbetalte penger og må betale 10 000 kr. Er det rettferdig?",
    "Foreldrene signerer kontrakten, men har i dag verken innsyn i økonomien eller stemmerett.",
    "Jeg synes foreldrene bør ha innsyn, men ikke nødvendigvis stemmerett i alt.",
    "Vi bør ha faste samlinger der alle kan bli bedre kjent med hverandre.",
    "Sosiale medier kan gjøre inkludering vanskeligere. Lukka grupper kan føles ekskluderende.",
    "Det handler om å skape minner sammen, ikke bare feste. Turer, aktiviteter, dugnad - alt teller!",
    "Kanskje vi kan ha aktiviteter der man må samarbeide med folk man ikke kjenner så godt?",
    "Noen ganger handler inkludering om å bare sette seg ned ved siden av noen og spørre hvordan det går.",
    "Vi bør aktivt oppsøke de som virker ensomme eller trekker seg tilbake.",
    "Som forelder synes jeg det er flott at dere tenker på dette allerede nå.",
    "Vi kan rotere på grupper i noen aktiviteter, slik at alle blir kjent med alle.",
  ],
  2: [
    // Rus og narkotika
    "Nulltoleranse for narkotika med umiddelbar eksklusjon – er regelen tydelig nok?",
    "Én av fire russ har brukt narkotika det siste året. Hva gjør vi konkret om noen bryter regelen?",
    "Vi bør passe på hverandre med alkohol uten at det blir «politi»-stemning.",
    "Foreldre trenger å vite nok til å føle seg trygge, uten at det blir kleint for ungdommene.",
    "Kompiskontrakten er en god idé - at man avtaler grenser på forhånd.",
    "Det er viktig å vite hva man gjør hvis noen blir dårlige. Førstehjelp er viktig!",
    "Som forelder er jeg lettet over at dere tar dette så seriøst.",
    "Vi bør alle ha ICE-nummeret til foreldrene våre lett tilgjengelig.",
    "Det er helt ok å si nei. Ingen bør bli dømt for det.",
    "Vi bør ha en buddy-ordning der man alltid har noen som passer på en.",
    "Hvis noen havner i trøbbel, er det viktigste at de tør å ringe for hjelp.",
    "Foreldrene bør være tilgjengelige om natten i russetiden, det gir trygghet.",
    "Russetiden kan være gøy uten at alt handler om alkohol.",
    "Vi trenger en tydelig prosess for hva som skjer om noen bryter narkotika-regelen.",
  ],
  3: [
    // Økonomi og finansiering
    "Hva er viktigst å bruke penger på – buss, lyd, lys, klær, eller felles opplevelser?",
    "Vi bør lage et detaljert budsjett tidlig, slik at alle vet hva de går til.",
    "Ikke alle har like mye penger. Vi må finne løsninger som fungerer for alle.",
    "Er det rom for uforutsette utgifter i budsjettet? Hva bør maks totalbeløp per person være?",
    "Bør hver person spare på egen konto, eller er felles innbetaling best?",
    "Alle bør ha innsyn i økonomien – vi trenger et åpent regnskap.",
    "Dagens kontrakt har gebyr fra dag én uten tak ved forsinket betaling. Er det rettferdig?",
    "Sponsorer kan hjelpe med å dekke noen kostnader, men det krever innsats.",
    "Som forelder synes jeg et realistisk budsjett med buffer er viktigst.",
    "Vi bør prioritere opplevelser over dyre ting. Det handler om minner, ikke merker.",
    "Kanskje vi kan ha dugnad for å tjene inn litt av det vi trenger?",
    "Det er lurt å ha en buffer i budsjettet for uforutsette utgifter.",
    "Vi kan spare penger på transport ved å samkjøre og planlegge litt bedre.",
    "Det viktigste er at alle bidrar med sin tid, ikke bare penger.",
  ],
  4: [
    // Spillereglene – den nye kontrakten
    "Kontrakten skal skrives på nytt og signeres i fellesskap. Hvilke regler er viktigst?",
    "Dagens kontrakt har bøter på 10 000 kr for å dele konsept eller dekknavn. Er det rimelig?",
    "Bussjefene tar mange beslutninger. Hvordan sikrer vi at de har tillit?",
    "Hva bør skje om tilliten til bussjefene svikter? Vi trenger en prosess for det.",
    "Dagens kontrakt tillater varig eksklusjon ved 70 % flertall – uten rett til å forsvare seg.",
    "Den som ekskluderes bør ha rett til å forsvare seg og krav på innbetalte penger.",
    "Vi bør ha en klagerett og en rettferdig prosess for konflikter.",
    "Det er viktig at reglene er tydelige fra starten, slik at alle vet hva som gjelder.",
    "Kanskje vi kan ha en uavhengig tredjepart som kan mekle ved konflikter?",
    "Reglene bør beskytte både gruppen og individet. Balanse er nøkkelen.",
    "Vi bør stemme over de viktigste reglene, slik at alle føler eierskap.",
    "Bøter bør stå i forhold til alvoret. 10 000 kr for å dele et navn er for mye.",
    "En god kontrakt beskytter alle – ikke bare de som har makt.",
    "Som forelder ønsker jeg at kontrakten er rettferdig og gjennomtenkt.",
  ],
  5: [
    // Russetiden i 7 dager?
    "Myndighetene ønsker å begrense russetiden til ca. 7 dager etter eksamen. Hva tenker dere?",
    "Hvis russetiden blir kortere, endrer det hva det er verdt å bruke penger på.",
    "Påvirker en kortere russetid valget mellom å kjøpe og leie buss?",
    "Vi bør ta høyde for mulige endringer allerede nå i planleggingen.",
    "Hva vil dere savne mest med en kortere feiring – og hva kan dere leve uten?",
    "Kanskje en kortere russetid gjør at vi må prioritere hardere?",
    "Hvis det bare blir 7 dager, er det enda viktigere at vi planlegger godt.",
    "En kortere feiring kan faktisk gjøre den mer intens og minneverdig.",
    "Vi bør uansett sørge for at vi får mest mulig ut av tiden vi har.",
    "Som forelder er jeg egentlig positiv til en kortere russetid.",
    "Det viktigste er fellesskapet, ikke hvor mange dager det varer.",
    "Kanskje vi kan ha noen arrangementer før selve russetiden også?",
    "Leie av buss gir mer mening om russetiden blir kort – slipper å eie noe vi bruker 7 dager.",
    "Vi bør ikke bruke for mye penger på noe som kanskje bare varer en uke.",
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
  if (!stations || stations.length < 5) throw new Error(`Expected 5 stations, found ${stations?.length}`);

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

  console.log(`\n=== Done! Inserted ${totalMessages} messages across 30 sessions ===`);
}

main().catch(console.error);
