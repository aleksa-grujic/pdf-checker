# PDF Checker - Pretraga PDF dokumenata

Aplikacija za pretragu PDF dokumenata prema ključnim rečima sa mogućnošću preview-a rezultata.

## Funkcionalnosti

### 🔍 Pretraga po ključnim rečima
- **Obavezne reči** - moraju biti prisutne na stranici
- **Opcione reči** - dovoljno je da je prisutna jedna od njih
- Podrška za srpski jezik (normalizacija teksta)

### 📋 Upravljanje rečima
- Dodavanje pojedinačnih reči
- Bulk dodavanje više reči odjednom
- Učitavanje reči iz .txt fajla
- Pregledan prikaz obaveznih i opcionih reči

### 👁️ Preview funkcionalnost
- **Prikaz rezultata pretrage** pre preuzimanja
- **Dva tab-a za preview:**
  - 📝 **Tekstualni preview** - tekstualni snippet-ovi sa pronađenih stranica
  - 📄 **PDF Reader** - stvarni PDF reader sa filtriranim stranicama
- Informacije o broju stranica i ukupnom broju stranica
- Mogućnost pregleda sadržaja pre finalnog preuzimanja
- **PDF Reader sa više opcija:**
  - Direktan prikaz u browser-u
  - Otvaranje u novom tab-u
  - Preuzimanje preview PDF-a
  - Fallback opcije za različite browser-e

### 📥 Preuzimanje
- Generisanje novog PDF-a sa samo pronađenim stranicama
- Automatsko preimenovanje u "filtrirano.pdf"

## Kako koristiti

### 1. Izaberite PDF dokument
- Podržani su svi standardni PDF fajlovi

### 2. Dodajte reči za pretragu
- **Obavezne reči** (🟢) - moraju biti na stranici
- **Opcione reči** (🟡) - dovoljno je da je prisutna jedna

### 3. Pretražite dokument
- Kliknite "Pretražuj PDF" da vidite koliko stranica sadrži vaše reči

### 4. Pregledajte rezultate (Preview)
- Kliknite "Pogledaj preview" da vidite sadržaj pronađenih stranica
- **Tekstualni preview tab** - prikazuje tekstualne snippet-ove sa svake stranice
- **PDF Reader tab** - prikazuje stvarni PDF sa filtriranim stranicama
- Možete proveriti da li su to stvarno stranice koje tražite
- Koristite zoom i navigaciju u PDF reader-u za bolji pregled

### 5. Preuzmite filtrirani PDF
- Kliknite "Preuzmi filtrirani PDF" da preuzmete finalni dokument

## Tehnologije

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **PDF obrada**: pdf-lib, pdfjs-dist
- **Deployment**: Vercel

## Instalacija i pokretanje

```bash
# Instalacija dependencija
npm install

# Development server
npm run dev

# Build za produkciju
npm run build

# Start produkcije
npm start
```

## API Endpoints

### POST /api/filter
Pretražuje PDF dokument i vraća rezultate.

**Parametri:**
- `file`: PDF fajl
- `requiredTerms`: JSON string sa obaveznim rečima
- `optionalTerms`: JSON string sa opcionim rečima
- `preview`: "1" za preview, undefined za download

**Response (preview):**
```json
{
  "count": 5,
  "pages": [
    {
      "pageNumber": 3,
      "textSnippet": "Tekst sa stranice..."
    }
  ],
  "totalPages": 20
}
```

**Response (download):**
- PDF fajl sa filtriranim stranicama

## Prednosti preview funkcionalnosti

1. **Provera rezultata** - vidite da li su pronađene stranice ono što tražite
2. **Ušteda vremena** - ne preuzimate PDF dok ne proverite rezultate
3. **Bolje korisničko iskustvo** - transparentnost u procesu filtriranja
4. **Kontrola kvaliteta** - možete prilagoditi pretragu ako rezultati nisu zadovoljavajući
5. **Dva načina preview-a:**
   - **Tekstualni preview** - brz pregled sadržaja stranica
   - **PDF Reader** - stvarni vizuelni pregled kako će izgledati finalni PDF
6. **PDF Reader funkcionalnosti:**
   - Zoom in/out za detaljan pregled
   - Navigacija kroz stranice
   - Pregled formata, slika i layout-a
   - Provera da li su stranice pravilno filtrirane

## Rešavanje problema sa PDF prikazom

### Problem: PDF Reader prikazuje belo polje
Ako PDF Reader tab prikazuje belo polje umesto PDF-a, aplikacija automatski nudi alternativne načine pregleda:

1. **🔗 Otvori u novom tab-u** - otvara PDF u novom browser tab-u
2. **📥 Preuzmi preview** - preuzima PDF za lokalni pregled
3. **🌐 Direktno u browser-u** - pokušava direktan prikaz u trenutnom browser-u

### Uzroci belog polja:
- **Browser ograničenja** - neki browser-i ne podržavaju direktno prikazivanje PDF-a
- **PDF veličina** - veoma veliki PDF fajlovi mogu biti spori za učitavanje
- **Browser podešavanja** - PDF viewer može biti onemogućen u browser-u

### Rešenja:
- Koristite alternativne dugmad za pregled PDF-a
- Proverite browser podešavanja za PDF prikaz
- Preuzmite preview PDF za lokalni pregled
- Koristite tekstualni preview tab za brz pregled sadržaja

## Licenca

MIT License
