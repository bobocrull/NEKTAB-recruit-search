# NEKTAB Candidate Intelligence

Internt verktyg för att hjälpa NEKTAB:s chefer att hitta, bedöma och prioritera relevanta kandidater utifrån verkliga krav i uppdrag och jobbannonser.

Verktyget är byggt kring **NEKTAB-metoden**: en strukturerad rekryteringsmodell där kandidatmatchning inte bara bygger på titlar eller nyckelord, utan på kravtolkning, kompetensbevis, branschkontext, senioritet, plats, kontaktbarhet och chefers återkoppling.

> Detta dokument beskriver bakomliggande know-how och bör behandlas som intern metod- och produktdokumentation.

## Grundtanke

NEKTAB har ofta mycket specifika kompetensbehov inom elnät, elkraft, kraftledning, stationer, GIS, markåtkomst, tillstånd och projektadministration. Generiska rekryteringssökningar och externa rekryteringsfirmor riskerar att hitta kandidater som ser rätt ut på ytan men saknar rätt praktisk erfarenhet.

Målet med verktyget är att ge chefer ett bättre första urval genom att:

- översätta en jobbannons eller enkel rollbeskrivning till tydliga krav
- söka efter kandidater från öppna webbkällor
- poängsätta kandidater på ett transparent sätt
- visa varför en kandidat får sin score
- markera osäkerhet, luckor och risker
- låta chefer spara, jämföra, exportera och ge återkoppling på kandidater
- bygga upp intern kunskap om vad som faktiskt är en bra kandidat för NEKTAB

## NEKTAB-metoden

NEKTAB-metoden består av sex steg.

### 1. Kravtolkning

Verktyget börjar med en jobbannons eller en kort roll/titel, till exempel `Senior kraftledningsprojektör`.

Systemet extraherar:

- tänkbara rolltitlar
- måste-kompetenser
- meriterande kompetenser
- senioritetsnivå
- minsta erfarenhet
- geografiskt önskemål
- relevanta branscher
- relevanta bolagsmiljöer
- tekniska nyckelord

Det viktiga är att annonsen inte bara ses som text. Den omvandlas till en kravprofil som går att jämföra mot kandidater.

### 2. Chefens kravprofil

Chefen kan komplettera den automatiska kravtolkningen med praktisk kontext:

- måste ha
- meriterande
- diskvalificerande faktorer
- geografi
- senioritet
- konsult eller anställd

Detta gör att verktyget inte fastnar i en generell annonslogik. En chef kan till exempel ange att `fältvana`, `luftledning över 40 kV` eller `stolpplacering` väger tyngre än en bred elkraftstitel.

### 3. Kandidatsökning

Sökningen bygger på flera query-varianter i stället för en enda sökning.

Exempel på query-typer:

- titel + plats
- titel + viktigaste kompetenser
- kompetenser + bransch
- svenska och engelska rollvarianter
- elkraftspecifika söktermer
- närliggande roller som kan vara relevanta

Syftet är att hitta kandidater som inte alltid använder exakt samma titel som annonsen. En relevant person kan till exempel kalla sig:

- Kraftledningsprojektör
- Projektör luftledning
- Transmission Line Engineer
- Power Systems Engineer
- Elkraftingenjör
- Projektledare elnät

### 4. Bredare sourcing

NEKTAB-metoden ska inte begränsas till kandidater som är enkla att hitta i ett vanligt LinkedIn-flöde.

Ambitionen är att söka bredare över öppna och tillåtna källor, till exempel:

- LinkedIn-profiler och publika profilsidor
- Github och tekniska portföljer när det är relevant
- patentdatabaser och tekniska publikationer
- forskningsartiklar och konferensmaterial
- konsult- och bolagssidor
- CV-liknande profilsidor och öppna webbkällor

Syftet är inte att samla så mycket data som möjligt, utan att hitta bättre kompetensbevis. För NEKTAB är det ofta mer värdefullt att hitta någon som faktiskt arbetat med rätt teknisk miljö än någon som bara har optimerat sin profil för rekryteringssökningar.

### 5. Nätverksmatchning

Utöver kandidatens egen profil kan verktyget på sikt använda nätverkssignaler som stöd.

Exempel:

- kandidaten har koppling till relevant elnätsbolag
- kandidaten verkar ingå i samma branschmiljö som tidigare bra kandidater
- kandidaten har arbetat i projekt, bolag eller sammanhang som NEKTAB känner igen
- kandidaten har indirekta relationer till personer eller organisationer i energisektorn

Nätverksmatchning ska inte automatiskt höja en kandidat till toppnivå. Den ska visas som en separat signal och hjälpa chefen att avgöra om kandidaten är värd manuell kontroll eller kontakt.

### 6. AI-ranking och matchningstransparens

AI används för att strukturera och förklara matchningen, inte för att fatta ett slutligt beslut.

Varje kandidat ska matchas mot annonsen och chefens kriterier med tydlig förklaring:

- vilka krav kandidaten matchar
- vilka krav som saknas
- vilken källa som stödjer matchningen
- om matchningen bygger på titel, kompetens, bolag, beskrivning eller indirekt signal
- varför kandidaten hamnar högt eller lågt i listan
- vad chefen behöver kontrollera manuellt

Exempel på önskat beteende:

`Jonas matchade 4 av 4 obligatoriska krav och har direkt kompetensbevis från rollbeskrivning och projekttext. Därför föreslås han till shortlist.`

Eller:

`Micaela har relevant titel och bolagsmiljö, men inga hittade kompetensbevis för 8 av 8 krav. Därför blir kompetenspoängen låg trots att profilen kan vara relevant.`

Detta är centralt för att chefer ska kunna göra en snabb shortlist utan att lägga timmar på manuell profilgranskning.

## Scoringmodell

Varje kandidat får en score mellan 0 och 100. Score ska inte ses som en absolut sanning, utan som ett beslutsstöd.

Poängen baseras på flera delområden:

| Område | Syfte |
| --- | --- |
| Kompetensmatch | Matchar kandidatens kompetenser mot kraven |
| Senioritet | Jämför erfarenhet mot önskad nivå |
| Rolltitel | Bedömer hur nära kandidatens titel ligger rollen |
| Plats | Bedömer geografisk match |
| Bolag/bransch | Ger positiv signal för relevant miljö |
| Datakvalitet | Visar hur mycket information som faktiskt finns |
| Nätverkssignal | Visar om kandidaten finns i relevant bransch- eller bolagsnätverk |

Viktningen kan justeras beroende på rolltyp. För kraftledningsnära roller väger exempelvis konkret projektering, luftledning, bygg- och ritningsunderlag, CAD, stolpplacering och fältinslag tyngre än allmän elkrafterfarenhet.

## Varför en kandidat får sin poäng

En central del av metoden är att score alltid ska kunna förklaras.

Kandidatkortet visar därför:

- totalpoäng
- poäng per kategori
- hur varje delpoäng bidrar till totalen
- vilka kompetenser som matchar
- vilka krav som saknas
- var matchningen hittades
- om matchningen kommer från titel, kompetensfält, beskrivning, bolag eller annan källa
- eventuell risk eller osäkerhet

Exempel:

En kandidat kan få 53 poäng trots relevant titel om systemet hittar få konkreta kompetensbevis. Det ska framgå tydligt, till exempel:

- titel matchar bra
- senioritet matchar
- relevant bolagsmiljö
- men 0 av 8 kravkompetenser hittades
- därför blir totalpoängen lägre

Detta gör att chefen kan se skillnaden mellan:

- kandidat som faktiskt har rätt kompetens
- kandidat som bara har rätt titel
- kandidat som kanske är relevant men kräver manuell kontroll

## Kompetensbevis

NEKTAB-metoden skiljer på att en kandidat **kan ha** kompetens och att verktyget faktiskt **har hittat bevis** för kompetensen.

Om en kandidat arbetar på ett relevant bolag eller har en relevant titel betyder det inte automatiskt att kravet är uppfyllt.

Systemet försöker därför visa:

- hittad kompetens
- saknad kompetens
- källa till matchningen
- hur stark matchningen är
- om matchningen är direkt eller indirekt

Exempel:

`Kraftledningsprojektör` kan vara en stark titelmatch, men om profilen inte nämner `stolpplacering`, `luftledning över 40 kV`, `CAD` eller `bygghandlingar` ska dessa krav fortfarande kunna visas som saknade.

## Bolags- och branschsignaler

Listan över bolag är inte tänkt som en hård begränsning.

Den används som en positiv signal om kandidaten verkar komma från relevant miljö, till exempel:

- Svenska kraftnät
- Vattenfall Services
- E.ON
- Ellevio
- Sweco
- WSP
- Rejlers
- AFRY

En kandidat ska kunna få bra poäng även utan dessa bolag om kompetensbevisen är starka. På samma sätt ska en kandidat inte få full träff enbart för att ha arbetat på ett relevant bolag.

## Kontaktbarhet

Verktyget kan visa kontaktuppgifter när de finns i källmaterialet:

- LinkedIn
- e-post
- telefon
- annan publik profil

Kontaktuppgifter ska behandlas varsamt och endast användas för berättigat rekryteringssyfte. Om kontaktuppgifter saknas kan chefen ändå spara kandidaten och göra manuell uppföljning.

## Kandidatflöde

Chefen kan arbeta med kandidater genom att:

- markera kandidater
- spara kandidater till kortlista
- exportera valda kandidater
- exportera kortlista
- jämföra kandidater
- ändra pipeline-status
- lägga feedback
- skriva anteckningar
- kopiera kontaktmeddelande
- skapa veckovis eller månadsvis export
- förbereda kandidatunderlag för Cinode eller annat rekryteringssystem

Pipeline-statusar:

- Ny
- Intressant
- Kontaktad
- Svarat
- Intervju
- Ej aktuell

Feedback används för att förbättra urvalet över tid.

## Feedbackloop

Chefens återkoppling är en viktig del av know-how:n.

Exempel på feedback:

- Relevant
- Inte relevant
- Fel bransch
- För junior
- Fel geografi
- Saknar nyckelkompetens

På sikt kan feedback användas för att:

- justera viktningen mellan kompetens, titel och erfarenhet
- förbättra rollspecifika söktermer
- minska falska positiva träffar
- skapa bättre standardprofiler per affärsområde
- visa vilka krav som chefer faktiskt bryr sig mest om

## Datamodell

Den riktiga kandidatmodellen separerar flera saker som annars lätt blandas ihop:

- kandidatens grundprofil
- källor där kandidaten hittats
- sökningen kandidaten hör till
- kandidatens score i just den sökningen
- chefens status, feedback och anteckningar
- exporthistorik
- händelselogg
- nätverkssignaler
- integrationsstatus mot externa system

Det betyder att samma kandidat kan förekomma i flera sökningar men bedömas olika beroende på roll, krav och chefens behov.

## Governance och intern användning

Verktyget bör användas som ett internt beslutsstöd, inte som ett automatiskt urvalsbeslut.

Rekommenderade principer:

- score är beslutsstöd, inte facit
- chefen ska kunna förstå varför en kandidat visas
- kandidater med låg datakvalitet ska granskas manuellt
- export ska endast göras vid aktivt rekryteringsbehov
- sparade kandidater ska rensas när de inte längre är relevanta
- åtkomst ska begränsas till interna användare
- känsliga nycklar och scoringlogik ska inte publiceras öppet

## Intern deployment

Rekommenderad modell:

- frontend bakom intern åtkomstkontroll
- inloggning via Microsoft Entra ID eller motsvarande
- Supabase Auth och Row Level Security för datalager
- separata roller för admin, rekryterare, chef och läsbehörig
- server-side eller edge functions för sökning och extern datainhämtning
- inga hemliga API-nycklar i klienten

Målet är att verktyget bara ska nås internt och att kandidatdata skyddas med tydliga behörighetsregler.

## Export och integration

Verktyget ska fungera även om NEKTAB fortsätter hantera den formella rekryteringsprocessen i Cinode eller annat system.

Det innebär två nivåer:

### Enkel export

Chefen kan exportera valda kandidater eller en hel kortlista till CSV/PDF.

Exporten bör innehålla:

- namn
- roll
- bolag
- plats
- LinkedIn eller annan källa
- e-post och telefon om det finns
- totalpoäng
- delpoäng
- matchade krav
- saknade krav
- förklaring till rekommendation
- status och feedback
- anteckningar

### Integrationsspår

Om verktyget blir en återkommande del av rekryteringsarbetet kan nästa steg vara en integration.

Möjliga integrationsvägar:

- veckovis export till rekryteringsansvarig
- månadsvis export av sparade kandidater
- manuell importfil till Cinode
- API-integration om Cinode-flödet tillåter det
- webhook eller automationsflöde för kandidater som markeras som `Intressant`

Principen är att NEKTAB kan använda verktyget för research och urval utan att behöva byta hela rekryteringsprocessen direkt.

### Direktkoppling till Cinode API

Direktkopplingen görs via Supabase Edge Function `export-to-cinode` så att Cinode-nycklar aldrig exponeras i webbläsaren.

Funktionen skapar kandidaten i Cinode och försöker därefter lägga till:

- kandidatens kompetenser
- LinkedIn/käll-länkar som URI attachments
- en note med NEKTAB-score, matchade krav, saknade krav, nätverkssignaler, källutdrag och chefens anteckning

Nödvändiga secrets/inställningar:

- `CINODE_COMPANY_ID`
- `CINODE_STATIC_TOKEN` eller `CINODE_ACCESS_ID` + `CINODE_ACCESS_SECRET`
- `CINODE_PIPELINE_ID`
- `CINODE_PIPELINE_STAGE_ID`
- `CINODE_RECRUITMENT_MANAGER_ID`

Valfria secrets:

- `CINODE_RECRUITMENT_SOURCE_ID`
- `CINODE_CURRENCY_ID`
- `CINODE_BASE_URL`

Cinode-tokenanvändaren behöver ha Recruitment-modulen och behörighet motsvarande `CompanyRecruiter`.

## Kodstruktur & Arkitektur

Projektet är uppbyggt som en modern React-applikation (TypeScript) med Vite som byggverktyg och Supabase som backend- och databasplattform.

### Katalogstruktur:
- `src/`: Innehåller frontend-källkoden.
  - `src/components/`: Återanvändbara UI-komponenter byggda med Tailwind CSS och Shadcn UI (t.ex. `CandidateCard.tsx`, `JobRequirementsPanel.tsx`).
  - `src/pages/`: Huvudsidor som `Index.tsx` (sökgränssnitt, sparade kandidater i databas, analyspaneler).
  - `src/index.css`: Huvudstilmall som etablerar NEKTAB:s färgprofil och CSS-variabler.
- `supabase/`: Innehåller databasmigrationsfiler (`supabase/migrations/`) som definierar schema, indexering och Row-Level Security (RLS) policies.
- `scripts/`: DevSecOps och automatiseringsverktyg:
  - `run_sast.js`: Statisk analys (SAST) som letar efter mönster för sårbarheter eller läckta nycklar.
  - `run_dast.js`: Dynamisk analys (DAST) som validerar HTTP-svarshuvuden och nätverkssäkerhet.
  - `install_hooks.js`: Automatisk installation av Git-hooks för pre-commit-kontroller.
- `docs/`: Djupgående dokumentation:
  - `docs/PENETRATION_TESTING.md`: Ramverk och checklistor för penetrationstestare.
  - `SECURITY.md`: Säkerhetspolicys och riktlinjer för säker utvecklingsmiljö.

---

## Säkerhetsarkitektur & DevSecOps-ramverk

NEKTAB Candidate Search är byggd med fokus på att upprätthålla en **säker utvecklingsmiljö** och skydda känslig data. Utvecklingsprocessen och källkoden följer strikt kraven i följande globala säkerhetsramverk:

### 1. CIS Controls Kapitel 16 (Application Software Security)
- **Säker utvecklingsprocess (16.1)**: Integrerat statisk kodanalys (SAST) och licens/sårbarhetsrevisioner direkt i byggsteget.
- **Undvik hårdkodade hemligheter (16.2)**: Inga API-nycklar eller databashandtag är hårdkodade i källkoden. Alla konfigurationsparametrar hanteras via environment-variabler och skyddas lokalt via `.gitignore`.
- **Indata- och utdatavalidering (16.3)**: Reacts automatiska HTML-escaping förhindrar insprutning av fientliga skript (XSS).
- **Databassäkerhet (16.4)**: Strikt Row-Level Security (RLS) är aktiverat på alla publika tabeller.

### 2. NIST Secure Software Development Framework (SSDF)
- **PW.4: Mitigate Vulnerabilities**: Utvecklare tvingas köra sårbarhetskontroller via en pre-commit hook innan kod kan sparas i Git.
- **PO.1.3: Secure Development Environment**: Separering av produktionsnycklar och lokala utvecklingstemplat (`.env.example`).

### 3. SAFECode Application Security Addendum
- Tillämpning av defensiv programmering (t.ex. strikt typning med TypeScript, schema-validering med Zod och minimerat användande av dynamisk exekvering som `eval()`).

### 4. BSA / The Software Alliance Framework
- Spårbarhet via full audit logging av händelser (`candidate_events`) och versionshanterad databasmigrering.

### 5. OWASP Secure Coding Practices & Top 10
- **BOLA (Broken Object Level Authorization)**: Förhindras genom att RLS-regler i Supabase verifierar resursägarskap (`auth.uid() = created_by`) och gör join-verifieringar vid access till underresurser (IDOR-skydd).
- **Brister i kryptografi/lagring**: Inga JWT-tokens eller credentials lagras i osäkra lokala cookies; Supabase-tokens hanteras med standardiserade säkra flöden.

### 6. Microsoft Security Development Lifecycle (SDL)
- Genomförande av statisk analys (SAST) och dynamisk analys (DAST) vid build och deployment för att snabbt upptäcka och mitigera hot.

---

## Statiska (SAST) & Dynamiska (DAST) Tester

### Statisk analys (SAST)
En anpassad sårbarhetsskanner (`scripts/run_sast.js`) kontrollerar all källkod, inklusive `index.html`:
```bash
npm run sast
```
Skannern blockerar byggen om den upptäcker:
- Hårdkodade API-nycklar eller credentials.
- Användning av osäkra exekveringsfunktioner som `eval()`.
- Direkt rendering av rå HTML utan sanering (`dangerouslySetInnerHTML`).
- Saknade säkerhets-meta-taggar i `index.html` (såsom CSP eller Referrer-Policy).

### Dynamisk analys (DAST)
Verktyget (`scripts/run_dast.js`) kör dynamiska tester mot en körande applikation för att verifiera dess nätverkskonfiguration:
```bash
# Körs mot lokal server eller extern miljö
npm run dast http://localhost:5173
npm run dast https://kandidater.nektab.se
```
Den dynamiska skannern kontrollerar:
- `Content-Security-Policy` (CSP)
- `X-Frame-Options` (Skyddar mot clickjacking)
- `X-Content-Type-Options` (Skyddar mot MIME-sniffing)
- `Strict-Transport-Security` (HSTS för HTTPS-anslutningar)
- Felaktiga eller för tillåtande CORS-inställningar (`Access-Control-Allow-Origin: *`)

---

## Penetrationstest-resiliens

Applikationen är förberedd för penetrationstester. För detaljerade instruktioner om hur man utför manuella och automatiserade säkerhetsverifieringar (inklusive IDOR-, XSS- och JWT-tester), se den fullständiga penetrationsguiden:
👉 **[Penetration Testing Guide](file:///C:/Users/asg02/Documents/Webscraper%20kandidater/skill-match-buddy-26-main/docs/PENETRATION_TESTING.md)**

---

## Vad som är NEKTAB:s know-how

Den skyddsvärda kunskapen ligger framför allt i:

- rollspecifika kravprofiler
- viktningen mellan olika score-komponenter
- vilka kompetenser som är starka signaler inom NEKTAB:s uppdrag
- vilka kompetenser som ofta ger falska träffar
- hur chefers feedback påverkar modellen
- sökstrategier för svårfunna elkraftroller
- kvalitetssäkring av kandidatdata
- förklaringsmodellen bakom score
- interna standarder för när en kandidat är värd kontakt
- nätverks- och branschsignaler som visat sig indikera relevant kompetens
- export- och urvalsprocessen från research till faktisk rekryteringspipeline

Detta är praktisk rekryterings- och branschkunskap som bör dokumenteras, versionshanteras och hållas internt.

## Begränsningar

Verktyget kan inte garantera att en kandidat faktiskt har en kompetens om den inte syns i källorna.

Det kan heller inte ersätta:

- manuell bedömning
- intervju
- referenstagning
- teknisk validering
- kandidatens egna uppgifter

Det bästa användningsområdet är att minska brus, hitta fler relevanta kandidater snabbare och ge chefer ett bättre underlag för nästa steg.

## Produktprinciper

1. Visa hellre varför en kandidat är osäker än att överdriva träffen.
2. Belöna konkreta kompetensbevis mer än generiska titlar.
3. Låt relevanta bolag/branscher vara signaler, inte hårda filter.
4. Gör det enkelt för chefer att justera vad som är viktigt.
5. Spara feedback så att metoden blir bättre över tid.
6. Bygg för intern kontroll, spårbarhet och ansvarsfull datahantering.
7. Sök bredare än LinkedIn när det ger bättre kompetensbevis.
8. Visa nätverkssignaler separat från faktiska kompetensmatchningar.
9. Gör export och integration flexibelt så verktyget kan samexistera med Cinode.

## Lokal utveckling

```bash
npm install
npm run dev
```

Vanliga kontroller:

```bash
npm run lint
npm run build
```

## Status

Verktyget är under aktiv utveckling. Nuvarande fokus är att gå från fungerande prototyp till intern, säker och chefsvänlig produkt med riktig kandidatmodell, behörigheter, historik och tydligare uppföljning.
