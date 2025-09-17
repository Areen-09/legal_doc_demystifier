"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface CommandButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "default" | "secondary"
  className?: string
}

export function CommandButton({ children, onClick, variant = "default", className }: CommandButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group transition-all duration-300 transform hover:scale-105",
        "border border-white/20 shadow-lg hover:shadow-xl",
        "text-white font-semibold px-8 py-4 text-lg",
        {
          "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700": variant === "default",
          "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700": variant === "secondary",
        },
        className,
      )}
    >
      <span className="relative z-10 flex items-center">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </Button>
  )
}