# IMPLEMENTATIONSSPEC

## NEKTAB Candidate Intelligence
### Azure-backend + SharePoint-frontend

Detta dokument beskriver rekommenderad implementationsmodell för att köra NEKTAB Candidate Intelligence som en intern lösning med:

- frontend tillgänglig i SharePoint Online
- backend hostad i Azure
- autentisering och åtkomststyrning via Microsoft Entra ID
- Cinode-integration och andra hemligheter i Azure
- driftbar struktur för test och produktion

Målgruppen är utvecklare, Azure-/M365-administratörer, IT-arkitekter och systemägare.

---

## 1. Syfte

Lösningen ska ge NEKTAB:s chefer ett internt verktyg för att:

- analysera jobbannonser och uppdragsbeskrivningar
- extrahera och justera kravprofiler
- hitta kandidater från öppna källor
- ranka kandidater transparent
- spara shortlist, mallar och sökhistorik
- skicka utvalda kandidater till Cinode

Lösningen ska:

- endast vara åtkomlig för interna, godkända användare
- kunna driftsättas och förvaltas i Azure/M365
- vara enkel att vidareutveckla med enrichment, logging och fler datakällor

---

## 2. Målsatt arkitektur

### 2.1 Översikt

```text
SharePoint Online sida
  -> SPFx-webpart
    -> React UI
      -> Azure Functions API
        -> Cinode API
        -> sök-/analysmotorer
        -> loggning / monitorering
```

### 2.2 Rekommenderade huvudkomponenter

#### Frontend
- SharePoint Framework (SPFx)
- React-baserad webpart
- AadHttpClient mot Entra-säkrat API

#### Backend
- Azure Functions
- HTTP-triggerade endpoints
- Microsoft Entra ID för tokenvalidering

#### Konfiguration och säkerhet
- Azure Key Vault
- Application Insights
- Access restrictions eller private endpoint
- Entra-säkerhetsgrupp för användarbehörighet

---

## 3. Rekommenderad lösningsdesign

### 3.1 Frontendstrategi

Frontend ska inte primärt drivas som fristående publik webbapp. Rekommenderad modell är:

- lägga UI:t i en SPFx-webpart
- publicera den i SharePoint App Catalog
- placera webparten på en intern SharePoint-sida

Det ger:

- naturlig intern åtkomst via Microsoft 365
- enklare åtkomststyrning
- bättre användarupplevelse för chefer
- enklare framtida förvaltning

### 3.2 Backendstrategi

Nuvarande API-logik ska brytas ut till Azure Functions.

Rekommenderade endpoints:

- `POST /api/analyze-job`
- `POST /api/search-candidates`
- `POST /api/send-to-cinode`
- `GET /api/health`

### 3.3 Auth-strategi

API:t ska skyddas med Microsoft Entra ID.

SPFx-webparten använder:

- `AadHttpClient`

Backend accepterar endast tokens:

- från rätt tenant
- för rätt audience / app registration
- från användare som ingår i godkänd grupp eller tilldelad app

---

## 4. Målmiljöer

Tre miljöer rekommenderas.

### 4.1 Dev

Syfte:
- utveckling
- snabb verifiering

Resurser:
- separat Function App
- separat app registration eller test-scope
- enklare accessmodell vid behov

### 4.2 Test

Syfte:
- intern acceptanstest
- validering mot M365/Azure

Resurser:
- egen Function App
- egen Key Vault
- SharePoint-testsida

### 4.3 Prod

Syfte:
- skarp användning för chefer

Krav:
- Entra-behörighetsstyrning
- Key Vault
- Application Insights
- access restrictions eller private endpoint
- formaliserad deployprocess

---

## 5. Föreslagen repo-struktur

Nuvarande repo bör på sikt delas upp logiskt:

```text
/
  frontend-spfx/
  backend-functions/
  shared/
  docs/
  README.md
```

### 5.1 `frontend-spfx/`

Innehåller:

- SPFx-projekt
- webpart
- React-komponenter eller wrappers
- API-klient
- UI-lager

### 5.2 `backend-functions/`

Innehåller:

- Azure Functions-projekt
- HTTP-endpoints
- tjänstelager
- Cinode-integration
- auth/helpers
- request validation

### 5.3 `shared/`

Gemensamma typer och modeller:

- `JobRequirements`
- `Candidate`
- `ScoredCandidate`
- request/response-kontrakt
- enums för status, feedback, integration

### 5.4 `docs/`

Dokumentation för:

- deployment
- drift
- incidenthantering
- säkerhetsmodell
- framtida integrationsplan

---

## 6. Azure-resurser

### 6.1 Resursgrupp

För produktion:

- `rg-nektab-candidate-prod`

För test:

- `rg-nektab-candidate-test`

### 6.2 Resurser i respektive miljö

#### Compute
- `func-nektab-candidate-<env>`

#### Storage
- `stnektabcandidate<env>`

#### Observability
- `appi-nektab-candidate-<env>`

#### Secrets
- `kv-nektab-candidate-<env>`

#### Optionalt nätverk
- VNet
- private endpoint
- private DNS zone

---

## 7. Microsoft Entra ID

### 7.1 Appregistreringar

Minst två logiska delar behövs:

#### A. API-app
Exempel:
- `nektab-candidate-api`

Används för:
- skydd av Azure API
- scopes

#### B. SPFx-klientåtkomst
SPFx integrerar via SharePoint/M365 mot Entra-säkrat API.

### 7.2 Scope

Exempel:

- `api://<api-app-id>/Candidate.ReadWrite`

### 7.3 Behörighetsstyrning

Rekommenderad Entra-grupp:

- `NEKTAB-Rekrytering-Chefer`

Endast denna grupp ska få:

- åtkomst till SharePoint-sidan
- åtkomst till API:t

### 7.4 Rekommenderad säkerhetsnivå

Aktivera:

- assignment requirement om möjligt
- app role eller gruppkontroll i backend

---

## 8. SharePoint-implementation

### 8.1 Lösningstyp

Frontend ska implementeras som:

- SharePoint Framework webpart

### 8.2 Placering

Exempel på intern sida:

- `Intranät / Rekrytering / Kandidatmatchning`

### 8.3 SPFx-webpartens ansvar

Webparten ska:

- rendera nuvarande React-UI
- hämta access token med `AadHttpClient`
- anropa backend-API
- visa resultat, shortlist, logik och scoring

### 8.4 SharePoint App Catalog

SPFx-lösningen paketeras som:

- `.sppkg`

Deployflöde:

1. bygg webpart
2. paketera
3. ladda upp till App Catalog
4. godkänn API-rättigheter
5. lägg webpart på sida

---

## 9. Backend-implementation

### 9.1 `POST /api/analyze-job`

Ansvar:

- analysera jobbannons / text
- extrahera krav
- returnera kravstruktur

Input:

```json
{
  "jobDescription": "...",
  "managerProfile": {
    "mustHave": "",
    "niceToHave": "",
    "disqualifiers": "",
    "geography": "",
    "seniority": "",
    "engagement": ""
  }
}
```

Output:

```json
{
  "seniorityLevel": "senior",
  "yearsOfExperience": 5,
  "keySkills": [],
  "jobTitles": [],
  "targetCompanies": [],
  "industries": [],
  "location": "Sverige"
}
```

### 9.2 `POST /api/search-candidates`

Ansvar:

- skapa query-varianter
- anropa söklogik / externa källor
- slå ihop dubbletter
- ranka kandidater

Input:

```json
{
  "requirements": { },
  "jobDescription": "..."
}
```

Output:

- kandidater
- score breakdown
- evidence
- kontaktbarhet
- nätverkssignaler
- datakvalitet

### 9.3 `POST /api/send-to-cinode`

Ansvar:

- skicka utvalda kandidater till Cinode
- skicka med kommentarer, status och metadata
- returnera resultat per kandidat

### 9.4 `GET /api/health`

Ansvar:

- health check
- används för monitorering och smoke test

---

## 10. Konfiguration och secrets

### 10.1 Secrets som inte får ligga i frontend

- Cinode client secret
- Cinode tokens
- AI-nycklar
- externa enrichment-nycklar
- tenant-specifik backendconfig

### 10.2 Rekommenderad lagring

- Azure Key Vault

### 10.3 Exempel på app settings

- `CINODE_BASE_URL`
- `CINODE_CLIENT_ID`
- `CINODE_CLIENT_SECRET`
- `ALLOWED_TENANT_ID`
- `ALLOWED_GROUP_ID`
- `OPENAI_API_KEY`
- `SEARCH_PROVIDER_KEY`

### 10.4 Rekommendation

Backend ska använda:

- system assigned managed identity

Den identiteten får läsa secrets från Key Vault.

---

## 11. Säkerhet

### 11.1 Basnivå

Minsta rekommenderade nivå i produktion:

- SharePoint-sida endast för intern målgrupp
- Entra-säkrat API
- gruppstyrd åtkomst
- loggning i Application Insights

### 11.2 Hårdare nätverksskydd

Välj en av dessa nivåer:

#### Nivå 1
- publik Function endpoint
- men skyddad med Entra-token

#### Nivå 2
- Entra-token + access restrictions
- begränsad åtkomst från företagets nät/VPN

#### Nivå 3
- private endpoint
- public access avstängd
- private DNS

### 11.3 Rekommendation för första produktionsversion

Starta med:

- Entra + säkerhetsgrupp + access restrictions

Utvärdera private endpoint om säkerhetskrav eller nätarkitektur kräver det.

---

## 12. Logging och monitorering

### 12.1 Frontend

Lokal lagring kan fortsatt användas för:

- shortlist
- rollmallar
- sökhistorik
- lokala anteckningar

### 12.2 Backend

Ska logga till Application Insights:

- användar-id / oid / upn där tillåtet
- endpoint
- tidsåtgång
- antal kandidater
- Cinode-exporter
- fel vid externa anrop
- valideringsfel

### 12.3 Minsta dashboard

Skapa vyer för:

- antal sökningar per dag
- misslyckade API-anrop
- Cinode-export per vecka
- latency per endpoint

---

## 13. Driftflöde

### 13.1 CI/CD backend

Pipeline ska:

1. installera dependencies
2. köra lint/test
3. bygga
4. deploya till test
5. köra smoke test
6. deploya till prod efter godkännande

### 13.2 CI/CD SPFx

Pipeline ska:

1. installera dependencies
2. köra build
3. paketera `.sppkg`
4. publicera till App Catalog
5. uppdatera sida/webpart

---

## 14. Migrationsplan från nuvarande repo

### Fas 1: Stabilisering

Mål:
- låsa funktionalitet
- tydliggöra API-gränser

Aktiviteter:
- identifiera frontend-only kod
- identifiera backendlogik
- samla gemensamma typer

### Fas 2: Backend-extraktion

Mål:
- skapa `backend-functions/`

Aktiviteter:
- flytta nuvarande API/funktionslogik
- införa request/response-kontrakt
- införa auth-kontroller

### Fas 3: SPFx-wrapper

Mål:
- skapa `frontend-spfx/`

Aktiviteter:
- skapa SPFx-lösning
- montera React-app
- integrera `AadHttpClient`

### Fas 4: Testmiljö

Mål:
- fungerande intern testversion

Aktiviteter:
- deploy backend till Azure test
- deploy webpart till SharePoint test
- verifiera auth, CORS, Cinode-export

### Fas 5: Produktion

Mål:
- intern skarp drift

Aktiviteter:
- driftsätt prod
- aktivera loggning
- sätt gruppstyrning
- dokumentera driftansvar

---

## 15. Leverabler

Följande ska finnas innan produktion:

### Kod
- SPFx-frontend
- Azure Functions-backend
- shared typer

### Infrastruktur
- Azure-resurser per miljö
- Entra app registration
- Key Vault
- Application Insights

### Dokumentation
- denna implementationsspec
- driftspec
- hemlighetshantering
- rollback-rutin
- support-/ägarlista

---

## 16. Ansvarsfördelning

### Utveckling
- bryta ut backend
- bygga SPFx-webpart
- anpassa UI till SPFx/API

### Azure/IT
- skapa resurser
- sätta access restrictions/private endpoint
- ge Key Vault-access

### M365/SharePoint-admin
- App Catalog
- API approval i SharePoint Admin Center
- sida och webpart-publicering

### Verksamhet
- definiera pilotgrupp
- verifiera arbetsflöde
- besluta om produktionssättning

---

## 17. Risker och beroenden

### Risker
- auth mellan SPFx och API inte korrekt godkänd
- access restrictions blockerar legitima användare
- extern kandidat-/sökkälla kräver ytterligare robusthet
- lokal frontendlagring behöver senare flyttas till central persistence

### Beroenden
- Entra-admin
- SharePoint-admin
- Azure-prenumeration
- Cinode API-behörigheter

---

## 18. Rekommenderad första sprintplan

### Sprint 1
- definiera målarkitektur
- skapa Azure testresurser
- skapa API-app i Entra
- skapa backend skeleton i Azure Functions

### Sprint 2
- flytta `analyze-job`
- flytta `search-candidates`
- flytta `send-to-cinode`
- införa auth

### Sprint 3
- skapa SPFx-projekt
- visa nuvarande UI i webpart
- koppla `AadHttpClient`

### Sprint 4
- testdeploy till SharePoint
- API approval
- end-to-end-test

### Sprint 5
- loggning
- access restrictions
- produktionshärdning

---

## 19. Beslut som bör tas innan implementation startar

1. Ska backend köras i Azure Functions eller App Service?
2. Ska prod använda access restrictions eller private endpoint direkt?
3. Ska shortlist/anteckningar fortsätta vara lokala i första versionen?
4. Ska SPFx bara wrappa nuvarande app först, eller ska UI flyttas om helt direkt?
5. Vilken grupp ska äga lösningen efter lansering?

---

## 20. Rekommendation

För NEKTAB rekommenderas:

- **Frontend:** SPFx-webpart i SharePoint Online
- **Backend:** Azure Functions
- **Auth:** Microsoft Entra ID
- **Secrets:** Azure Key Vault
- **Observability:** Application Insights
- **Åtkomst:** Entra-grupp + access restrictions i första prodversion

Detta ger bäst balans mellan:

- intern åtkomst
- säkerhet
- låg driftfriktion
- framtida vidareutveckling

