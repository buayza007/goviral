"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { userApi } from "@/lib/api";

const plans = [
  {
    name: "Free",
    price: "ฟรี",
    quota: 10,
    features: ["10 searches/month", "Basic analytics", "Facebook only"],
    current: true,
  },
  {
    name: "Starter",
    price: "฿299/เดือน",
    quota: 50,
    features: [
      "50 searches/month",
      "Advanced analytics",
      "Facebook & Instagram",
    ],
    recommended: true,
  },
  {
    name: "Pro",
    price: "฿799/เดือน",
    quota: 200,
    features: [
      "200 searches/month",
      "Full analytics",
      "All platforms",
      "Priority support",
    ],
  },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => userApi.getProfile(),
  });

  const quotaUsed = profile?.searchesUsed || 0;
  const quotaTotal = profile?.searchQuota || 10;
  const quotaPercent = (quotaUsed / quotaTotal) * 100;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ตั้งค่า</h1>
            <p className="text-muted-foreground">
              จัดการบัญชีและการตั้งค่าของคุณ
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                โปรไฟล์
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
                  {user?.imageUrl && (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || ""}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-muted-foreground">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    วันที่สมัครสมาชิก
                  </p>
                  <p className="font-medium">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">แพ็คเกจปัจจุบัน</p>
                  <p className="font-medium">{profile?.subscriptionPlan || "Free"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quota Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-viral-500" />
                โควต้าการค้นหา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  ใช้ไปแล้วในเดือนนี้
                </span>
                <span className="font-semibold">
                  {quotaUsed} / {quotaTotal} ครั้ง
                </span>
              </div>
              <Progress value={quotaPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                เหลืออีก {quotaTotal - quotaUsed} ครั้ง •{" "}
                {profile?.quotaResetDate &&
                  `รีเซ็ตวันที่ ${new Date(
                    profile.quotaResetDate
                  ).toLocaleDateString("th-TH")}`}
              </p>
            </CardContent>
          </Card>

          {/* Settings List */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <SettingsItem
                  icon={<Bell className="h-5 w-5" />}
                  title="การแจ้งเตือน"
                  description="ตั้งค่าการแจ้งเตือนทางอีเมล"
                />
                <SettingsItem
                  icon={<Shield className="h-5 w-5" />}
                  title="ความปลอดภัย"
                  description="เปลี่ยนรหัสผ่านและการยืนยันตัวตน"
                />
                <SettingsItem
                  icon={<CreditCard className="h-5 w-5" />}
                  title="การชำระเงิน"
                  description="จัดการบัตรและประวัติการชำระ"
                />
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                      <LogOut className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-red-500">ออกจากระบบ</p>
                      <p className="text-sm text-muted-foreground">
                        ออกจากระบบบัญชีนี้
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">อัพเกรดแพ็คเกจ</h2>
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`border-border/50 ${
                plan.recommended
                  ? "border-viral-500/50 bg-viral-500/5"
                  : plan.current
                  ? "border-green-500/50 bg-green-500/5"
                  : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-lg font-bold">{plan.price}</p>
                  </div>
                  {plan.recommended && (
                    <span className="rounded-full bg-viral-500 px-2 py-0.5 text-xs text-white">
                      แนะนำ
                    </span>
                  )}
                  {plan.current && (
                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                      ปัจจุบัน
                    </span>
                  )}
                </div>
                <ul className="mb-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!plan.current && (
                  <Button
                    variant={plan.recommended ? "viral" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    เลือกแพ็คเกจนี้
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}
