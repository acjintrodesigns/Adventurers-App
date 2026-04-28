# Adventurers Management System

A production-ready web application for managing Adventurer Club activities.
Private license belonging to **ACJ Intro Designs**.

Part 1 of a 2-part ecosystem (Adventurers + Pathfinders).

---

## 🏗️ Architecture

| Service | Tech | Port |
|---|---|---|
| Frontend | Next.js 14 + TailwindCSS + TypeScript | 3000 |
| Backend API | C# .NET 8 Web API + EF Core | 5000 |
| AI Service | Python FastAPI | 8000 |
| Database | SQL Server | 1433 |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- Python 3.11+
- SQL Server 2019+

### 1. Database Setup
```bash
cd database
# Connect to SQL Server and run:
sqlcmd -S localhost -i schema.sql
```

### 2. Backend Setup
```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```
API runs at: http://localhost:5000
Swagger UI: http://localhost:5000/swagger

### 3. AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Opens at: http://localhost:3000

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Director** | Full admin: children approval, events, payments, all dashboards |
| **Teacher** | Class management, progress tracking, chat |
| **Parent** | Register children, view events, payments, chat |

---

## 🏆 Adventurer Classes

- Little Lamb (ages 4-5)
- Early Bird (grade 1)
- Busy Bee (grade 2)
- Sunbeam (grade 3)
- Builder (grade 4)
- Helping Hand (grade 5)

---

## 📄 License

Private license — ACJ Intro Designs. All rights reserved.
