# Plata cu Ora - Timetech

## Cerințe Sistem

Înainte de a începe instalarea, asigurați-vă că aveți instalate următoarele:

- **Node.js** (v14+) și npm (v6+)
- **Git** pentru gestionarea codului sursă
- **MongoDB** (optional local, se poate folosi MongoDB Atlas)
- **Angular CLI** (v12+) instalat global (`npm install -g @angular/cli`)

## Ghid de Instalare

### 1. Clonarea Proiectului

```bash
# Clonați repository-ul
git clone https://github.com/ULBS/platacuora-timetech.git

# Navigați în directorul proiectului
cd platacuora-timetech
```

### 2. Configurarea Backend

```bash
# Navigați în directorul backend
cd backend

# Instalați dependențele
npm install

# Creați fișierul .env pentru configurare
```

Creați un fișier `.env` în directorul backend cu următorul conținut:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/timetech
PORT=5000
JWT_SECRET=your_secret_key_here
```

Înlocuiți valorile cu credențialele și configurațiile dvs. specifice.

### 3. Configurarea Frontend

```bash
# Navigați în directorul frontend
cd ../frontend

# Instalați dependențele
npm install
```

### 4. Configurarea MongoDB

Dacă folosiți MongoDB Atlas:

1. Creați un cont la [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Creați un cluster nou (opțiunea gratuită este suficientă)
3. Configurați accesul la baza de date:
   - Creați un utilizator cu drepturi de citire/scriere
   - Adăugați adresa IP curentă la whitelist sau folosiți `0.0.0.0/0` pentru acces din orice locație
4. Obțineți string-ul de conexiune și actualizați-l în fișierul `.env` din backend

### 5. Rularea Aplicației

Rulați backend-ul:

```bash
# Din directorul backend
npm run dev
```

Rulați frontend-ul:

```bash
# Din directorul frontend
ng serve
```

După ce ambele servere sunt pornite:
- Backend-ul va rula la adresa: http://localhost:5000
- Frontend-ul va rula la adresa: http://localhost:4200

## Testarea Conexiunii

Pentru a verifica dacă conexiunea dintre frontend și backend funcționează corect:

1. Deschideți browser-ul și navigați la http://localhost:4200
2. Veți vedea pagina de test care verifică conexiunea cu backend-ul
3. Dacă totul este configurat corect, veți vedea un mesaj de confirmare că backend-ul API funcționează

## Rezolvarea Problemelor

### Probleme la conectarea cu MongoDB

Dacă întâmpinați eroarea "MongoDB connection failed":

1. Verificați dacă string-ul de conexiune din `.env` este corect
2. Asigurați-vă că adresa IP este adăugată în whitelist-ul MongoDB Atlas
3. Verificați dacă utilizatorul MongoDB are permisiunile corecte

### Backend nu se conectează

1. Verificați dacă portul 5000 nu este folosit de alt proces
2. Verificați fișierul `.env` dacă toate variabilele de mediu sunt definite corect

### Frontend nu se conectează la backend

1. Verificați dacă backend-ul rulează la adresa corectă (http://localhost:5000)
2. Verificați configurarea CORS în backend
3. Verificați dacă apiUrl din `environment.ts` corespunde cu URL-ul backend-ului

Pentru întrebări sau probleme suplimentare, contactați echipa de dezvoltare.
