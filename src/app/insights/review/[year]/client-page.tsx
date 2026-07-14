"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Users, CheckCircle2, FileText, User } from "lucide-react";
import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { client } from "@/lib/orpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type YearInReviewData = Awaited<ReturnType<typeof client.insights.getYearInReview>>;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function YearInReviewClient({ year }: { year: number }) {
  const [data, setData] = useState<YearInReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchYear() {
      try {
        const result = await client.insights.getYearInReview({ year });
        setData(result);
      } catch (err) {
        console.error("Failed to load year in review", err);
      } finally {
        setLoading(false);
      }
    }
    fetchYear();
  }, [year]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || (data.proposedCount === 0 && data.finalizedCount === 0)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-8">
        <FolderEmptyIcon className="mb-6 h-16 w-16 text-muted-foreground opacity-50" />
        <h1 className="text-3xl font-bold">No Data for {year}</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          We couldn't find any significant Ethereum standards activity for this year. Try selecting a different year.
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl text-primary mb-2">
            {year} in Review
          </h1>
          <p className="text-lg text-muted-foreground">
            A look back at Ethereum governance and standards.
          </p>
        </motion.div>

        {/* Hero Stats */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
            <div className="absolute -right-10 -top-10 opacity-10">
              <FileText className="h-40 w-40" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Proposals Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-primary">
                {data.proposedCount}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-500/5 border-emerald-500/20 overflow-hidden relative">
            <div className="absolute -right-10 -top-10 opacity-10">
              <CheckCircle2 className="h-40 w-40 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Proposals Finalized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                {data.finalizedCount}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Section */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Monthly Trend */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Activity Trend</CardTitle>
                </div>
                <CardDescription>New proposals created per month in {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Proposals" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div variants={itemVariants} className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Types of proposals in {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="category"
                        animationDuration={1500}
                      >
                        {data.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Authors */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Top Contributors</CardTitle>
              </div>
              <CardDescription>Most active authors and editors of {year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {data.topAuthors.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    No contributor activity recorded for this year.
                  </div>
                ) : (
                  data.topAuthors.map((author, idx) => (
                    <motion.div 
                      key={author.actor}
                      whileHover={{ y: -5 }}
                      className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 text-center shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-8 w-8" />
                        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          #{idx + 1}
                        </div>
                      </div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{author.actor}</h3>
                      <Badge variant="secondary" className="mt-2">
                        {author.activity} interactions
                      </Badge>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}

function FolderEmptyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}
