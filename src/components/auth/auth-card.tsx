import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
  className?: string;
}

// Shared shell for the four auth screens (login, signup, forgot-password,
// reset-password) — both their form state and their "check your email"
// success state. One definition means the family stays visually identical
// as a unit instead of four hand-copied cards drifting apart over time.
export function AuthCard({
  icon,
  title,
  description,
  children,
  className,
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        "w-full max-w-md animate-in fade-in slide-in-from-bottom-2 border-border bg-card/95 py-6 shadow-2xl shadow-black/10 duration-500 ease-out",
        className,
      )}
    >
      <CardHeader className="items-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon}
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-pretty text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6">{children}</CardContent>
    </Card>
  );
}
