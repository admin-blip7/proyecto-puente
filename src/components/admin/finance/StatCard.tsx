"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    description?: string;
    isPrimary?: boolean;
}

export default function StatCard({ title, value, icon: Icon, description, isPrimary = false }: StatCardProps) {
    return (
        <Card className={cn(isPrimary && "bg-primary text-primary-foreground")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-4 w-4 text-muted-foreground", isPrimary && "text-primary-foreground/70")} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className={cn("text-xs text-muted-foreground", isPrimary && "text-primary-foreground/80")}>{description}</p>}
            </CardContent>
        </Card>
    );
}
