# Test Your English - Autonex AI

An AI-powered English proficiency assessment platform with automated grading.

## Features

- 🎯 **Multi-format Questions**: Video, Image, Reading, MCQ, Jumble
- 🤖 **AI Grading**: Powered by Google Gemini for instant evaluation
- 🔒 **Anti-Cheating**: Fullscreen mode, tab switch detection, auto-submit on violations
- 📊 **Admin Dashboard**: Real-time stats, score sorting, Excel export
- 🏢 **Multi-Organization**: Support for multiple organizations/companies

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy (Async)
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini API

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the backend folder:
```env
DATABASE_URL=postgresql+asyncpg://...
GEMINI_API_KEY=your_key
SECRET_KEY=your_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Deployment

- **Backend**: Railway
- **Frontend**: Vercel/Netlify
- **Database**: Supabase PostgreSQL

## License

MIT
