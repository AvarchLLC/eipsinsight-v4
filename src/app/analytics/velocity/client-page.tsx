"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Loader2, TrendingUp, AlertTriangle, BarChart2 } from "lucide-react";
import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { client } from "@/lib/orpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DurationsData = Awaited<ReturnType<typeof client.velocity.getStatusDurations>>;
type ProbabilityData = Awaited<ReturnType<typeof client.velocity.getStagnancyProbability>>;
type ComparisonData = Awaited<ReturnType<typeof client.velocity.getVelocityComparison>>;

export default function VelocityDashboardClient() {
  const [repo, setRepo] = useState<"all" | "eips" | "ercs" | "rips">("all");
  const [category, setCategory] = useState<string>("all");
  
  const [durations, setDurations] = useState<DurationsData>([]);
  const [probabilities, setProbabilities] = useState<ProbabilityData>([]);
  const [comparison, setComparison] = useState<ComparisonData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const filter = { repo, category: category === "all" ? undefined : category };
        const [dRes, pRes, cRes] = await Promise.all([
          client.velocity.getStatusDurations(filter),
          client.velocity.getStagnancyProbability(filter),
          client.velocity.getVelocityComparison(filter),
        ]);
        setDurations(dRes);
        setProbabilities(pRes);
        setComparison(cRes);
      } catch (err) {
        console.error("Failed to fetch velocity data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [repo, category]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-primary mb-2">
              Governance Velocity
            </h1>
            <p className="text-lg text-muted-foreground">
              Measure and visualize the efficiency of the Ethereum standards process.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository</label>
              <select 
                value={repo} 
                onChange={(e) => setRepo(e.target.value as any)}
                className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="all">All Repositories</option>
                <option value="eips">Core (EIPs)</option>
                <option value="ercs">App (ERCs)</option>
                <option value="rips">Rollup (RIPs)</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="all">All Categories</option>
                <option value="Core">Core</option>
                <option value="Networking">Networking</option>
                <option value="Interface">Interface</option>
                <option value="ERC">ERC</option>
                <option value="Meta">Meta</option>
                <option value="Informational">Informational</option>
              </select>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Charts Section */}
            <div className="grid gap-8 md:grid-cols-2">
              
              {/* Status Durations */}
              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <CardTitle>Average Stage Duration</CardTitle>
                    </div>
                    <CardDescription>Time spent in each status stage before advancing (in days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {durations.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        Insufficient data
                      </div>
                    ) : (
                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={durations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="stage" 
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
                            <RechartsTooltip 
                              cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                              formatter={(value: number) => [`${value} days`, 'Avg Duration']}
                            />
                            <Bar 
                              dataKey="avgDays" 
                              name="Days" 
                              fill="hsl(var(--primary))" 
                              radius={[4, 4, 0, 0]}
                              animationDuration={1500}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Velocity Comparison */}
              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-primary" />
                      <CardTitle>End-to-End Velocity</CardTitle>
                    </div>
                    <CardDescription>Average time from Draft to Final across repositories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparison.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        Insufficient data
                      </div>
                    ) : (
                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="repo" 
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
                            <RechartsTooltip 
                              cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', textTransform: 'capitalize' }}
                              formatter={(value: number) => [`${value} days`, 'E2E Duration']}
                            />
                            <Bar 
                              dataKey="avgDays" 
                              name="Days" 
                              fill="hsl(var(--chart-3, 173 58% 39%))" 
                              radius={[4, 4, 0, 0]}
                              animationDuration={1500}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

            </div>

            {/* Stagnancy Probability Widget */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <CardTitle>Stagnancy Probability (Current Drafts)</CardTitle>
                  </div>
                  <CardDescription>
                    Probability of reaching 'Final' based on historical data for proposals of similar age. 
                    Low probability indicates high risk of stagnancy.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {probabilities.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No active drafts found for the selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-md">Proposal</th>
                            <th className="px-4 py-3">Repo</th>
                            <th className="px-4 py-3">Age (Days)</th>
                            <th className="px-4 py-3 rounded-tr-md">Success Probability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {probabilities.slice(0, 15).map((p) => (
                            <tr key={`${p.repo}-${p.eipNumber}`} className="border-b last:border-0 border-border hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">
                                EIP-{p.eipNumber}: <span className="text-muted-foreground font-normal">{p.title}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="uppercase">{p.repo}</Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{p.ageDays}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-full max-w-[120px] bg-muted rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${p.probability < 20 ? 'bg-red-500' : p.probability < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${p.probability}%` }}
                                    />
                                  </div>
                                  <span className={`font-semibold ${p.probability < 20 ? 'text-red-500' : p.probability < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {p.probability}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {probabilities.length > 15 && (
                        <div className="mt-4 text-center text-sm text-muted-foreground">
                          Showing top 15 oldest drafts out of {probabilities.length}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

      </motion.div>
    </div>
  );
}
