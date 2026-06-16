# IMPLEMENTATION RUNBOOK

## NEKTAB Candidate Intelligence
### Konkret genomförande för Azure + SharePoint

Detta dokument är den operativa versionen av implementationsspecen. Det är tänkt att användas som arbetsunderlag när lösningen faktiskt ska sättas upp i Azure och Microsoft 365.

Det innehåller:

- föreslagna resursnamn
- miljövariabler
- Entra-appregistreringar
- scopes och åtkomstmodell
- SPFx-upplägg
- deployordning för test och produktion
- checklista för IT/M365/admin

---

## 1. Målbild

### Slutlig lösning

- **Frontend:** SharePoint Online via SPFx-webpart
- **Backend:** Azure Functions
- **Auth:** Microsoft Entra ID
- **Secrets:** Azure Key Vault
- **Loggning:** Application Insights
- **Intern åtkomst:** Entra-grupp + access restrictions, alternativt private endpoint

### Affärsmål

Chefer ska kunna:

- öppna lösningen från intranät/SharePoint
- analysera annons eller rolltext
- justera extraherade krav
- söka kandidater
- bedöma kandidater utifrån tydlig poängfördelning
- skicka kandidater till Cinode

---

## 2. Rekommenderad resursstruktur

### 2.1 Azure subscription

Lösningen bör ligga i en dedikerad Azure-subscription eller i en tydligt avgränsad del av befintlig subscription.

### 2.2 Resursgrupper

#### Test
- `rg-nektab-candidate-test`

#### Produktion
- `rg-nektab-candidate-prod`

### 2.3 Azure-resurser per miljö

#### Backend compute
- `func-nektab-candidate-test`
- `func-nektab-candidate-prod`

#### Storage för Functions
- `stnektabcandidatetest`
- `stnektabcandidateprod`

#### Application Insights
- `appi-nektab-candidate-test`
- `appi-nektab-candidate-prod`

#### Key Vault
- `kv-nektab-candidate-test`
- `kv-nektab-candidate-prod`

#### App Service Plan om ni väljer dedikerad plan
- `asp-nektab-candidate-test`
- `asp-nektab-candidate-prod`

#### Eventuell nätverksstruktur
- `vnet-nektab-candidate-prod`
- `pep-func-nektab-candidate-prod`
- `pdns-privatelink-azurewebsites-net`

---

## 3. Föreslagen kodstruktur

```text
/
  frontend-spfx/
  backend-functions/
  shared/
  docs/
```

### 3.1 frontend-spfx

Innehåller:

- SPFx-projekt
- webpart
- React-root
- API-klient med `AadHttpClient`
- UI-komponenter eller wrappers

### 3.2 backend-functions

Innehåller:

- Azure Functions-projekt
- `analyze-job`
- `search-candidates`
- `send-to-cinode`
- auth-middleware/helpers
- request validation
- integrationer

### 3.3 shared

Innehåller gemensamma typer:

- `JobRequirements`
- `Candidate`
- `ScoredCandidate`
- `PipelineStatus`
- `FeedbackTag`
- request/response DTOs

---

## 4. Entra ID - appregistreringar

### 4.1 App 1: backend API

**Namn:**
- `nektab-candidate-api-test`
- `nektab-candidate-api-prod`

**Användning:**
- skyddar Azure Functions
- exponerar API-scope

### 4.2 Scope

Exempel på scope:

- `api://<api-app-id>/Candidate.ReadWrite`

Alternativt:

- `api://<api-app-id>/Candidate.Manage`

### 4.3 App 2: SPFx/API-consent-flöde

SPFx använder SharePoints etablerade Entra-integrering. Det viktiga här är att SharePoint-admin kan godkänna webpartens API-anrop mot backend-appen.

### 4.4 Grupp för åtkomst

Skapa Entra-säkerhetsgrupp:

- `NEKTAB-Rekrytering-Chefer`

Rekommendation:

- ge endast denna grupp åtkomst till SharePoint-sidan
- kontrollera denna grupp i backend
- använd gruppen som pilotgrupp vid införande

---

## 5. SharePoint-upplägg

### 5.1 App Catalog

Ni behöver:

- en SharePoint App Catalog

### 5.2 Webpart

SPFx-lösningen byggs som en webpart, exempel:

- `NektabCandidateIntelligenceWebPart`

### 5.3 Placering

Föreslagen sida:

- `https://<tenant>.sharepoint.com/sites/intranat/SitePages/Kandidatmatchning.aspx`

### 5.4 Behörighet på sidan

Sidan ska:

- bara vara åtkomlig för rätt intern målgrupp
- inte ligga öppet för hela organisationen om ni inte vill det

---

## 6. Backend-endpoints

### 6.1 `POST /api/analyze-job`

Ansvar:

- analysera jobbannons
- extrahera krav
- normalisera kravlistor

### 6.2 `POST /api/search-candidates`

Ansvar:

- ta emot kravprofil
- generera sökfrågor
- hämta kandidatdata
- slå ihop dubbletter
- ranka kandidater

### 6.3 `POST /api/send-to-cinode`

Ansvar:

- skicka valda kandidater till Cinode
- logga exportresultat
- returnera utfall till frontend

### 6.4 `GET /api/health`

Ansvar:

- livstecken
- deploy/smoke-test
- monitorering

---

## 7. Miljövariabler och secrets

### 7.1 Backend app settings

Minsta rekommenderade uppsättning:

```text
AZURE_ENVIRONMENT=test|prod
ALLOWED_TENANT_ID=<tenant-guid>
ALLOWED_GROUP_ID=<entra-group-guid>
API_AUDIENCE=api://<api-app-id>
SHAREPOINT_ALLOWED_ORIGIN=https://<tenant>.sharepoint.com

CINODE_BASE_URL=https://api.cinode.com
CINODE_CLIENT_ID=<secret-or-setting>
CINODE_CLIENT_SECRET=<secret-or-keyvault>

OPENAI_API_KEY=<secret>
SEARCH_PROVIDER_KEY=<secret>
APPINSIGHTS_CONNECTION_STRING=<from-app-insights>
```

### 7.2 Key Vault secrets

Följande bör ligga i Key Vault:

- `cinode-client-id`
- `cinode-client-secret`
- `openai-api-key`
- `search-provider-key`

### 7.3 Rekommenderad modell

Azure Function App ska ha:

- system assigned managed identity

Den identiteten ska få:

- `Key Vault Secrets User` eller motsvarande läsroll

---

## 8. Säkerhetsmodell

### 8.1 Baslinje

Obligatoriskt:

- Entra-token krävs för backend
- token måste komma från rätt tenant
- användaren måste vara i godkänd grupp

### 8.2 Access restrictions

För första produktionsversion rekommenderas:

- IP-restriktioner eller access restrictions på backend
- tillåt endast företagsnät eller VPN-egress där möjligt

### 8.3 Private endpoint

Om IT kräver full intern exponering:

- private endpoint för Function App
- public access avstängd
- privat DNS-konfiguration

### 8.4 Rekommenderat stegval

#### Första produktion:
- Entra + gruppstyrning + access restrictions

#### Nästa steg vid högre krav:
- private endpoint

---

## 9. SPFx-implementation

### 9.1 Skapa projekt

Skapa nytt SPFx-projekt i `frontend-spfx/`.

Exempel på innehåll:

- webpart shell
- React-komponent som mountar Candidate Intelligence UI
- service för `AadHttpClient`

### 9.2 Webpartens ansvar

Webparten ska:

- ladda UI
- hämta access token
- skicka request till Azure Functions
- hantera fel och session/logik

### 9.3 API-access i SharePoint Admin Center

När SPFx-lösningen begär API-access måste SharePoint-admin:

- godkänna API-anropet mot er backend-app

---

## 10. Backend-implementation

### 10.1 Teknisk struktur

Exempel:

```text
backend-functions/
  src/
    functions/
      analyze-job.ts
      search-candidates.ts
      send-to-cinode.ts
      health.ts
    auth/
      validateToken.ts
      groupCheck.ts
    services/
      cinode.ts
      candidateSearch.ts
      scoring.ts
    models/
      dto.ts
```

### 10.2 Validering

Varje endpoint ska ha:

- inputvalidering
- felhantering
- request-id/log correlation

### 10.3 Loggning

Logga minst:

- user oid/upn
- endpoint
- kandidatantal
- svarstid
- fel från externa integrationer

---

## 11. Deployordning - testmiljö

### Steg 1
Skapa Azure-resurser:

- resursgrupp
- storage
- function app
- app insights
- key vault

### Steg 2
Skapa Entra app registration för API

- exponera scope
- dokumentera app-id och tenant-id

### Steg 3
Deploy backend till test

Verifiera:

- `/api/health`
- auth
- app settings
- key vault access

### Steg 4
Skapa SPFx-projekt

- koppla `AadHttpClient`
- konfigurera test-API-url

### Steg 5
Paketera `.sppkg`

- ladda upp till App Catalog
- godkänn API permissions

### Steg 6
Lägg webpart på testsida

Verifiera:

- sida laddar
- auth fungerar
- analysera annons fungerar
- kandidatlista visas
- Cinode-export fungerar

---

## 12. Deployordning - produktion

### Steg 1
Skapa prod-resurser

### Steg 2
Skapa prod-appregistrering/API-scope

### Steg 3
Skapa prod-Key Vault och lägg in secrets

### Steg 4
Deploy backend prod

### Steg 5
Aktivera access restrictions

### Steg 6
Deploy SPFx till prod-App Catalog

### Steg 7
Lägg webpart på skarp SharePoint-sida

### Steg 8
Begränsa SharePoint-sidans åtkomst till rätt grupp

### Steg 9
Genomför smoke test

Checklista:

- sida öppnas
- inloggning fungerar
- analysera annons fungerar
- sök kandidater fungerar
- skicka till Cinode fungerar
- loggning syns i Application Insights

---

## 13. CI/CD - rekommendation

### 13.1 Backend

Pipeline:

1. `npm ci`
2. lint
3. test
4. build
5. deploy till Azure Functions
6. smoke test mot `/api/health`

### 13.2 SPFx

Pipeline:

1. `npm ci`
2. build
3. `gulp bundle --ship`
4. `gulp package-solution --ship`
5. publicera `.sppkg`

---

## 14. Konkreta beslut som behöver tas

### Teknik

1. Ska backend vara Azure Functions eller App Service?
2. Ska access restrictions räcka först, eller krävs private endpoint direkt?
3. Ska lokal lagring av shortlist/anteckningar vara kvar i version 1?

### Organisation

4. Vilken Entra-grupp ska äga åtkomsten?
5. Vem är systemägare?
6. Vem förvaltar appregistreringar och secrets?

---

## 15. Operativ checklista för första produktionssättning

### Före go-live

- Azure backend testad
- SharePoint-webpart testad
- Cinode-export testad
- gruppåtkomst verifierad
- loggning verifierad
- supportväg definierad

### Vid go-live

- publicera prod-webpart
- öppna SharePoint-sidan för pilotgrupp
- övervaka App Insights
- verifiera första riktiga sökning

### Efter go-live

- samla användarfeedback
- justera kravmodell
- planera central persistence om needed

---

## 16. Rekommenderad nästa tekniska leverans

Efter att denna modell är godkänd bör nästa artefakt vara:

1. Azure resource matrix
2. Entra registration checklist
3. SPFx scaffold plan
4. backend extraction task list
5. release checklist för test/prod

Det är den nivå där projektet går från idé och dokument till faktisk implementation.

