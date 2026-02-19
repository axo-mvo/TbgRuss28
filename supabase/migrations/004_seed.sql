-- 004_seed.sql
-- Seed data: 6 discussion stations, 2 invite codes, 1 meeting status row

-- 6 Stations with Norwegian titles, descriptions, questions, and tips
INSERT INTO stations (number, title, description, questions, tip) VALUES
(1, 'Fellesskap og Samhold',
 'Diskuter hvordan vi kan styrke fellesskapet og samholdet i russegruppen.',
 '["Hva betyr fellesskap for deg i russetiden?", "Hvordan kan vi sikre at alle foler seg inkludert?", "Hvilke aktiviteter kan styrke samholdet i gruppen?", "Hvordan handterer vi konflikter pa en god mate?"]',
 'Tenk pa konkrete eksempler fra egne erfaringer med gruppesamarbeid.'
),
(2, 'Inkludering',
 'Snakk om hvordan vi kan skape en inkluderende russetid for alle.',
 '["Hva kan vi gjore for at ingen faller utenfor?", "Hvordan kan vi vare oppmerksomme pa de som er stille eller trekker seg tilbake?", "Hvilke regler bor vi ha for a sikre inkludering?", "Hvordan kan foreldre bidra til en mer inkluderende russetid?"]',
 'Husk at inkludering handler om mer enn bare a invitere -- det handler om a fa alle til a fole seg velkomne.'
),
(3, 'Rus og Forebygging',
 'Diskuter holdninger til rus og hvordan vi kan forebygge negative opplevelser.',
 '["Hvilke forventninger har dere til rusbruk i russetiden?", "Hvordan kan vi passe pa hverandre nar det gjelder alkohol og rus?", "Hva bor vi gjore hvis noen havner i en vanskelig situasjon?", "Hvordan kan foreldre og ungdom samarbeide om trygge rammer?"]',
 'Var arlige og respektfulle. Det finnes ingen dumme svar her.'
),
(4, 'Budsjett og Okonomi',
 'Ga gjennom budsjettet og diskuter okonomiske prioriteringer.',
 '["Hva er de storste kostnadene ved russetiden?", "Hvordan kan vi holde kostnadene nede uten a ga pa kompromiss med opplevelsen?", "Bor alle bidra likt okonomisk, eller bor det vare fleksibelt?", "Hvilke utgifter er viktigst a prioritere?"]',
 'Ha gjerne konkrete tall klare. Et realistisk budsjett gir bedre planlegging.'
),
(5, 'Finansiering',
 'Diskuter muligheter for a finansiere russetiden og skaffe inntekter.',
 '["Hvilke dugnader eller inntektskilder kan vi bruke?", "Har noen erfaring med sponsorer eller samarbeidspartnere?", "Hvordan fordeler vi inntektene rettferdig?", "Hva er realistiske mal for innsamling?"]',
 'Tenk kreativt, men vurder ogsa hvor mye tid og innsats hver aktivitet krever.'
),
(6, 'Nye Regler for Russebuss',
 'Diskuter de nye reglene for russebuss og hvordan de pavirker planleggingen.',
 '["Hvilke nye regler er dere kjent med?", "Hvordan pavirker reglene planene vare?", "Hva er de storste utfordringene med de nye reglene?", "Hvordan kan vi tilpasse oss og fortsatt ha en bra russetid?"]',
 'Sjekk oppdatert informasjon fra kommunen og relevante myndigheter for a vare sikre pa gjeldende regler.'
)
ON CONFLICT (number) DO NOTHING;

-- 2 Invite codes: one for youth, one for parents
INSERT INTO invite_codes (code, role, max_uses) VALUES
('UNGDOM2028', 'youth', 50),
('FORELDER2028', 'parent', 60)
ON CONFLICT (code) DO NOTHING;

-- 1 Meeting status row (pending by default)
INSERT INTO meeting_status (status) VALUES ('pending');
