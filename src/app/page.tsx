"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  BarChart3,
  Search,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Facebook,
  Instagram,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

const features = [
  {
    icon: Search,
    title: "ค้นหาอัจฉริยะ",
    description:
      "ค้นหาโพสต์ Viral จาก Facebook, Instagram และ TikTok ได้ในคลิกเดียว",
  },
  {
    icon: TrendingUp,
    title: "วิเคราะห์ Engagement",
    description:
      "ดู Likes, Comments, Shares และคำนวณ Engagement Score อัตโนมัติ",
  },
  {
    icon: BarChart3,
    title: "Dashboard สวยงาม",
    description:
      "แสดงผลข้อมูลแบบ Visual ดูง่าย เข้าใจทันที เหมาะสำหรับนักการตลาด",
  },
];

const benefits = [
  "ค้นหาโพสต์ Viral ได้รวดเร็ว",
  "เปรียบเทียบ Engagement ได้ง่าย",
  "ไม่ต้องเสียเวลาสแกนทีละ Page",
  "รองรับหลายแพลตฟอร์ม",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-viral-500/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[400px] w-[400px] rounded-full bg-ocean-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-viral-500 to-viral-600 shadow-lg shadow-viral-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="gradient-text">Go</span>Viral
            </span>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost">เข้าสู่ระบบ</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="viral">เริ่มต้นใช้งาน</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button variant="viral" asChild>
                <Link href="/dashboard">ไปที่ Dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-20">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-viral-500/30 bg-viral-500/10 px-4 py-2 text-sm text-viral-400">
              <Sparkles className="h-4 w-4" />
              <span>แพลตฟอร์ม Social Listening อันดับ 1</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-5xl font-bold leading-tight md:text-7xl"
          >
            ค้นหา{" "}
            <span className="gradient-text">Viral Content</span>
            <br />
            จาก Social Media
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground"
          >
            ค้นหาโพสต์ที่มี Engagement สูงจาก Facebook และ Instagram
            วิเคราะห์ข้อมูลแบบ Real-time เพื่อหาไอเดียคอนเทนต์ที่กำลัง Trend
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <SignedOut>
              <SignUpButton mode="modal">
                <Button variant="viral" size="xl" className="group gap-2">
                  เริ่มใช้งานฟรี
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button variant="viral" size="xl" className="group gap-2" asChild>
                <Link href="/dashboard">
                  ไปที่ Dashboard
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </SignedIn>
            <Button variant="outline" size="xl" className="gap-2">
              <Play className="h-5 w-5" />
              ดูวิธีใช้งาน
            </Button>
          </motion.div>

          {/* Platform Icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-8"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Facebook className="h-6 w-6 text-blue-500" />
              <span>Facebook</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Instagram className="h-6 w-6 text-pink-500" />
              <span>Instagram</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xl">🎵</span>
              <span>TikTok (เร็วๆ นี้)</span>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="relative rounded-2xl border border-border/50 bg-card/50 p-2 shadow-2xl shadow-viral-500/10 backdrop-blur">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-viral-500/20 to-transparent opacity-50" />
            <div className="relative overflow-hidden rounded-xl bg-background">
              <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/50 px-4">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-muted-foreground">
                  GoViral Dashboard
                </span>
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-background via-muted/50 to-background p-8">
                <div className="grid h-full grid-cols-4 gap-4">
                  {/* Stats Cards Preview */}
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/50 bg-card/50 p-4"
                    >
                      <div className="mb-2 h-8 w-8 rounded-lg bg-viral-500/20" />
                      <div className="mb-1 h-6 w-16 rounded bg-muted" />
                      <div className="h-3 w-12 rounded bg-muted/50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 border-t border-border/50 bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              ฟีเจอร์ที่จะทำให้คุณหาคอนเทนต์ได้เร็วขึ้น
            </h2>
            <p className="text-lg text-muted-foreground">
              เครื่องมือครบครันสำหรับนักการตลาดมืออาชีพ
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group rounded-2xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-viral-500/50 hover:shadow-lg hover:shadow-viral-500/10"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-viral-500/20 to-ocean-500/20 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-7 w-7 text-viral-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                ทำไมต้องใช้ <span className="gradient-text">GoViral</span>?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                ประหยัดเวลาในการหาไอเดียคอนเทนต์
                ค้นหาโพสต์ที่ประสบความสำเร็จจากเพจต่างๆ ได้ง่ายๆ
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{benefit}</span>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-10">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button variant="viral" size="lg" className="gap-2">
                      เริ่มใช้งานเลย
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button variant="viral" size="lg" className="gap-2" asChild>
                    <Link href="/dashboard">
                      ไปที่ Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </SignedIn>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-viral-500/20 to-ocean-500/20 blur-2xl" />
              <div className="relative rounded-2xl border border-border bg-card p-8">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-viral-500/20">
                    <TrendingUp className="h-8 w-8 text-viral-500" />
                  </div>
                  <h3 className="text-2xl font-bold">+250%</h3>
                  <p className="text-muted-foreground">
                    Engagement เพิ่มขึ้นหลังใช้งาน
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <span className="text-sm">โพสต์ที่วิเคราะห์แล้ว</span>
                    <span className="font-bold text-viral-500">10,000+</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <span className="text-sm">ผู้ใช้งาน</span>
                    <span className="font-bold text-ocean-500">500+</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <span className="text-sm">ความพึงพอใจ</span>
                    <span className="font-bold text-green-500">98%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              พร้อมค้นหา Viral Content แล้วหรือยัง?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              เริ่มต้นใช้งานฟรีวันนี้ ไม่ต้องใส่บัตรเครดิต
            </p>
            <SignedOut>
              <SignUpButton mode="modal">
                <Button variant="viral" size="xl" className="group gap-2">
                  สมัครใช้งานฟรี
                  <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button variant="viral" size="xl" className="group gap-2" asChild>
                <Link href="/dashboard">
                  เข้าสู่ Dashboard
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </SignedIn>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-viral-500">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">GoViral</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 GoViral. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
