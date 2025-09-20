"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Settings, FileText, LogOut, User, History } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { firebaseAuthApi } from "@/lib/firebase";

interface Profile {
    name: string;
    email: string;
    avatar: string;
    subscription?: string;
    model?: string;
}

interface MenuItem {
    label: string;
    value?: string;
    href?: string;
    icon: React.ReactNode;
    external?: boolean;
    onClick?: () => void;
}

const SAMPLE_PROFILE_DATA: Profile = {
    name: "Test User",
    email: "TestUser@gmail.com",
    avatar: "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/profile-mjss82WnWBRO86MHHGxvJ2TVZuyrDv.jpeg",
    subscription: "PRO",
    model: "Gemini 2.0 Flash",
};

interface ProfileDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
    data?: Profile;
    showTopbar?: boolean;
}

export default function ProfileDropdown({
    data = SAMPLE_PROFILE_DATA,
    className,
    ...props
}: ProfileDropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isAuthed, setIsAuthed] = React.useState(false);
    const [userInfo, setUserInfo] = React.useState<{ name: string; email: string; avatar: string } | null>(null);

    const getInitials = React.useCallback((nameOrEmail: string) => {
        if (!nameOrEmail) return "?";
        const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
        const parts = base.trim().split(/\s+/);
        const first = parts[0]?.[0] || "";
        const second = parts.length > 1 ? parts[1]?.[0] : "";
        return (first + second).toUpperCase() || base[0]?.toUpperCase() || "?";
    }, []);

    const showComingSoon = React.useCallback(() => {
        alert("Coming Soon");
    }, []);

    React.useEffect(() => {
        const unsub = firebaseAuthApi.onChange((user) => {
            const authed = !!user;
            setIsAuthed(authed);
            if (authed && user) {
                const name = user.displayName || user.email || "User";
                const email = user.email || "";
                const avatar = user.photoURL || "";
                setUserInfo({ name, email, avatar });
            } else {
                setUserInfo(null);
            }
        });
        return () => unsub?.();
    }, []);

    if (!isAuthed) {
        return null;
    }

    const displayData = userInfo || data;

    const menuItems: MenuItem[] = [
        {
            label: "Profile",
            icon: <User className="w-4 h-4" />,
            onClick: showComingSoon,
        },
        {
            label: "History",
            icon: <History className="w-4 h-4" />,
            onClick: showComingSoon,
        },
        {
            label: "Settings",
            icon: <Settings className="w-4 h-4" />,
            onClick: showComingSoon,
        },
        {
            label: "Terms & Policies",
            icon: <FileText className="w-4 h-4" />,
            external: true,
            onClick: showComingSoon,
        },
    ];

    return (
        <div className={cn("relative", className)} {...props}>
            <DropdownMenu onOpenChange={setIsOpen}>
                <div className="group relative">
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center justify-center size-12 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 hover:shadow-sm transition-all duration-200 focus:outline-none"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center">
                                        {displayData.avatar ? (
                                            <Image
                                                src={displayData.avatar}
                                                alt={displayData.name}
                                                width={36}
                                                height={36}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/40 via-pink-500/40 to-orange-400/40 text-zinc-900 dark:text-white text-xs font-semibold">
                                                {getInitials(displayData.name || displayData.email)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        sideOffset={4}
                        className="w-64 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl shadow-xl shadow-zinc-900/5 dark:shadow-zinc-950/20 
                    data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top-right"
                    >
                        <div className="space-y-1">
                            {menuItems.map((item) => (
                                <DropdownMenuItem key={item.label} asChild>
                                    <button
                                        type="button"
                                        onClick={item.onClick}
                                        className="w-full flex items-center p-3 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 rounded-xl transition-all duration-200 cursor-pointer group hover:shadow-sm border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50"
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            {item.icon}
                                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight whitespace-nowrap group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">
                                                {item.label}
                                            </span>
                                        </div>
                                        <div className="flex-shrink-0 ml-auto">
                                            {item.value && (
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium rounded-md py-1 px-2 tracking-tight",
                                                        item.label === "History"
                                                            ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border border-blue-500/10"
                                                            : "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border border-purple-500/10"
                                                    )}
                                                >
                                                    {item.value}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </DropdownMenuItem>
                            ))}
                        </div>

                        <DropdownMenuSeparator className="my-3 bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-800" />

                        <DropdownMenuItem asChild>
                            <button
                                type="button"
                                onClick={() => firebaseAuthApi.signOut()}
                                className="w-full flex items-center gap-3 p-3 duration-200 bg-red-500/10 rounded-xl hover:bg-red-500/20 cursor-pointer border border-transparent hover:border-red-500/30 hover:shadow-sm transition-all group"
                            >
                                <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                                <span className="text-sm font-medium text-red-500 group-hover:text-red-600">
                                    Sign Out
                                </span>
                            </button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </div>
            </DropdownMenu>
        </div>
    );
}