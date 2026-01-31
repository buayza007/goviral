"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Bell, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="w-64 justify-start gap-2 text-muted-foreground"
        >
          <Command className="h-4 w-4" />
          <span>ค้นหา...</span>
          <kbd className="ml-auto rounded bg-muted px-2 py-0.5 text-xs">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-viral-500 text-[10px] font-bold text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-4">
              <h4 className="mb-3 font-semibold">การแจ้งเตือน</h4>
              <div className="space-y-3">
                <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">การค้นหาเสร็จสิ้น</p>
                    <p className="text-xs text-muted-foreground">
                      พบ 15 โพสต์ Viral จากหน้า "Marketing Tips"
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-viral-500/20">
                    <div className="h-2 w-2 rounded-full bg-viral-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">โควต้าใกล้หมด</p>
                    <p className="text-xs text-muted-foreground">
                      เหลือการค้นหาอีก 2 ครั้งในเดือนนี้
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.fullName || "User"}</p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-10 w-10",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
