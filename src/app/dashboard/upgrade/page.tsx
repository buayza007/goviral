"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Check,
  Sparkles,
  Crown,
  Rocket,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "฿0",
    period: "ตลอดไป",
    description: "เริ่มต้นใช้งานฟรี",
    features: [
      "10 การค้นหา/เดือน",
      "Facebook เท่านั้น",
      "วิเคราะห์ Engagement พื้นฐาน",
      "ประวัติการค้นหา 7 วัน",
    ],
    cta: "แพ็คเกจปัจจุบัน",
    current: true,
  },
  {
    name: "Starter",
    icon: Rocket,
    price: "฿299",
    period: "/เดือน",
    description: "สำหรับนักการตลาดเริ่มต้น",
    features: [
      "50 การค้นหา/เดือน",
      "Facebook + Instagram",
      "วิเคราะห์ Engagement ขั้นสูง",
      "ประวัติการค้นหา 30 วัน",
      "Export ข้อมูล CSV",
    ],
    cta: "เลือกแพ็คเกจนี้",
    popular: true,
  },
  {
    name: "Pro",
    icon: Crown,
    price: "฿799",
    period: "/เดือน",
    description: "สำหรับมืออาชีพ",
    features: [
      "200 การค้นหา/เดือน",
      "ทุกแพลตฟอร์ม (รวม TikTok)",
      "วิเคราะห์ Sentiment",
      "ประวัติการค้นหาไม่จำกัด",
      "Export PDF & Excel",
      "Priority Support",
    ],
    cta: "เลือกแพ็คเกจนี้",
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: "ติดต่อเรา",
    period: "",
    description: "สำหรับองค์กรขนาดใหญ่",
    features: [
      "การค้นหาไม่จำกัด",
      "ทุกแพลตฟอร์ม",
      "API Access",
      "Multiple Users",
      "Custom Integration",
      "Dedicated Support",
      "SLA 99.9%",
    ],
    cta: "ติดต่อฝ่ายขาย",
  },
];

export default function UpgradePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-viral-500/30 bg-viral-500/10 px-4 py-2 text-sm text-viral-400">
          <Sparkles className="h-4 w-4" />
          <span>ปลดล็อคความสามารถเต็มที่</span>
        </div>
        <h1 className="mb-4 text-3xl font-bold md:text-4xl">
          เลือกแพ็คเกจที่เหมาะกับคุณ
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          อัพเกรดเพื่อเพิ่มโควต้าการค้นหา ปลดล็อคแพลตฟอร์มเพิ่มเติม
          และฟีเจอร์ขั้นสูงมากมาย
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`relative h-full border-border/50 ${
                plan.popular
                  ? "border-viral-500/50 bg-gradient-to-b from-viral-500/10 to-transparent"
                  : plan.current
                  ? "border-green-500/50 bg-gradient-to-b from-green-500/10 to-transparent"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-viral-500 px-3 py-1 text-xs font-semibold text-white">
                    แนะนำ
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                    ปัจจุบัน
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                    plan.popular
                      ? "bg-viral-500/20"
                      : plan.current
                      ? "bg-green-500/20"
                      : "bg-muted"
                  }`}
                >
                  <plan.icon
                    className={`h-7 w-7 ${
                      plan.popular
                        ? "text-viral-500"
                        : plan.current
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={
                    plan.popular
                      ? "viral"
                      : plan.current
                      ? "outline"
                      : "secondary"
                  }
                  className="w-full"
                  disabled={plan.current}
                >
                  {plan.cta}
                  {!plan.current && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-auto max-w-3xl"
      >
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <CardTitle>คำถามที่พบบ่อย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium">
                สามารถยกเลิกได้ทุกเมื่อหรือไม่?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ได้เลยครับ คุณสามารถยกเลิกแพ็คเกจได้ทุกเมื่อ
                โดยจะยังใช้งานได้จนครบรอบบิล
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium">ชำระเงินด้วยวิธีใดได้บ้าง?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                รองรับ Credit Card, Debit Card และ PromptPay
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium">มี Trial Period หรือไม่?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                แพ็คเกจ Free ใช้ได้ตลอดไป และแพ็คเกจอื่นมี 7 วันทดลองใช้ฟรี
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
