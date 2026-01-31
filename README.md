# 🚀 GoViral - Viral Content Discovery SaaS Platform

GoViral เป็นแพลตฟอร์ม SaaS สำหรับค้นหาและวิเคราะห์ Viral Content จาก Social Media ออกแบบมาสำหรับนักการตลาดที่ต้องการค้นหาโพสต์ที่มี Engagement สูงจาก Facebook, Instagram และ TikTok

![GoViral Dashboard](https://via.placeholder.com/800x400?text=GoViral+Dashboard)

## ✨ Features

- 🔍 **ค้นหาอัจฉริยะ** - ค้นหาโพสต์ Viral จาก Facebook Page ด้วยการใส่ชื่อหรือ URL
- 📊 **Dashboard สวยงาม** - แสดงผลข้อมูลแบบ Visual ดูง่าย เข้าใจทันที
- 📈 **วิเคราะห์ Engagement** - ดู Likes, Comments, Shares และ Engagement Score
- 🏆 **จัดอันดับ Viral** - เรียงลำดับโพสต์ตาม Engagement Score
- 📱 **รองรับหลายแพลตฟอร์ม** - Facebook, Instagram (TikTok เร็วๆ นี้)
- 👥 **Multi-tenancy** - แยกข้อมูลแต่ละ User อย่างปลอดภัย
- 🔐 **Authentication** - ระบบ Login ปลอดภัยด้วย Clerk

## 🛠 Tech Stack

### Frontend (Deploy on Vercel)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Component Library:** Shadcn/UI + Custom Components
- **Icons:** Lucide React
- **Charts:** Recharts
- **State Management:** TanStack Query (React Query)
- **Animations:** Framer Motion
- **Auth:** Clerk

### Backend (Deploy on Railway)
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Data Source:** Apify API

## 📁 Project Structure

```
goviral/
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router Pages
│   │   │   ├── dashboard/   # Protected Dashboard Pages
│   │   │   ├── sign-in/     # Clerk Sign In
│   │   │   └── sign-up/     # Clerk Sign Up
│   │   ├── components/      # React Components
│   │   │   ├── dashboard/   # Dashboard Components
│   │   │   ├── providers/   # Context Providers
│   │   │   └── ui/          # Shadcn/UI Components
│   │   └── lib/             # Utilities & API Client
│   └── package.json
│
├── backend/                  # Express Backend
│   ├── src/
│   │   ├── routes/          # API Routes
│   │   ├── services/        # Business Logic
│   │   ├── lib/             # Utilities
│   │   └── middleware/      # Express Middleware
│   ├── prisma/
│   │   └── schema.prisma    # Database Schema
│   └── package.json
│
└── package.json              # Root Package (Monorepo)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL Database
- Apify Account & API Token
- Clerk Account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/goviral.git
cd goviral
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **Set up environment variables**

**Backend (.env):**
```env
DATABASE_URL="postgresql://..."
APIFY_API_TOKEN="apify_api_..."
APIFY_ACTOR_ID="apify~facebook-pages-scraper"
CLERK_SECRET_KEY="sk_test_..."
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. **Initialize Database**
```bash
cd backend
npx prisma db push
npx prisma generate
```

5. **Run Development Servers**
```bash
# From root directory
npm run dev

# Or separately:
cd backend && npm run dev
cd frontend && npm run dev
```

6. **Open in Browser**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📚 API Endpoints

### Search
- `POST /api/search` - Start a new search
- `POST /api/search/sync` - Synchronous search (waits for results)
- `GET /api/search/quota` - Get user's search quota

### Results
- `GET /api/results/:queryId` - Get search results
- `GET /api/results` - Get search history
- `GET /api/results/dashboard/stats` - Get dashboard statistics
- `GET /api/results/:queryId/chart-data` - Get chart data

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/subscription` - Get subscription details

## 🎨 Design System

GoViral ใช้ Design System ที่ออกแบบมาเฉพาะ:

### Colors
- **Viral (Primary):** Coral/Red gradient สื่อถึงความร้อนแรงของ Viral Content
- **Ocean (Secondary):** Teal/Cyan สื่อถึงความลึกของข้อมูล
- **Dark Theme:** พื้นหลังมืดเน้นการใช้งานนาน

### Typography
- **Font:** Outfit - Modern, Geometric Sans-serif
- **Mono:** JetBrains Mono - สำหรับตัวเลข

### Components
- Custom Cards with Glass effect
- Animated Stats Cards
- Engagement Charts with Recharts
- Content Cards with hover effects

## 📦 Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Backend (Railway)
1. Push to GitHub
2. Connect to Railway
3. Add PostgreSQL addon
4. Set environment variables
5. Deploy

## 🔮 Future Roadmap

- [ ] TikTok Integration
- [ ] AI-Powered Content Analysis
- [ ] Sentiment Analysis with Reactions
- [ ] Scheduled Monitoring
- [ ] Webhook Notifications
- [ ] Team Collaboration
- [ ] Advanced Export (PDF, Excel)
- [ ] API Access for Enterprise

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

---

Made with ❤️ by GoViral Team
