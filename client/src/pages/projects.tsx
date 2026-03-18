import Layout from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MoreVertical, FolderKanban, LayoutGrid, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { motion } from "framer-motion";

function RiskGauge({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border)/0.3)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function ProjectsPage() {
  const { data: projectsList = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const totalProjects = projectsList.length;
  const activeCount = projectsList.filter((p) => p.status === "Active").length;
  const highRiskCount = projectsList.filter((p) => ((p as any).riskScore ?? 0) > 50).length;

  const stats = [
    { label: "Total Projects", value: totalProjects, icon: FolderKanban, color: "text-blue-400" },
    { label: "Active", value: activeCount, icon: CheckCircle, color: "text-emerald-400" },
    { label: "High Risk", value: highRiskCount, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground font-mono">
              Projects
            </h1>
            <p className="text-muted-foreground">
              Manage logical groupings of cloud accounts and resources.
            </p>
          </div>
          <Button
            data-testid="button-create-project"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Project
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4" data-testid="stats-row">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-primary/60 uppercase tracking-wider">{stat.label}</p>
                      <p data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`} className="text-3xl font-bold mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList.map((project, i) => {
              const riskScore = (project as any).riskScore ?? 0;
              const resources = (project as any).resources ?? 0;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    data-testid={`card-project-${project.id}`}
                    className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 group cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/20 text-primary">
                            <FolderKanban className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <Badge
                              data-testid={`badge-status-${project.id}`}
                              variant="outline"
                              className={`text-[10px] mt-0.5 ${
                                project.status === "Active"
                                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                                  : "text-gray-500 border-gray-500/20"
                              }`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          data-testid={`button-menu-${project.id}`}
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-2 text-muted-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description}
                      </p>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-shrink-0">
                          <RiskGauge score={riskScore} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-[10px] text-primary/60 uppercase tracking-wider block">Risk Score</span>
                            <span
                              data-testid={`text-risk-${project.id}`}
                              className={`text-sm font-semibold ${
                                riskScore > 70 ? "text-red-500" : riskScore > 40 ? "text-yellow-500" : "text-emerald-500"
                              }`}
                            >
                              {riskScore > 70 ? "Critical" : riskScore > 40 ? "Medium" : "Low"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-primary/60 uppercase tracking-wider block">Resources</span>
                            <span data-testid={`text-resources-${project.id}`} className="text-sm font-medium">{resources}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(project.environments || []).map((env) => (
                          <Badge
                            key={env}
                            variant="secondary"
                            className="bg-muted/50 text-muted-foreground text-[10px]"
                          >
                            {env}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-end pt-4 border-t border-border/50">
                        <Link href={`/inventory?project=${project.id}`}>
                          <Button
                            data-testid={`link-resources-${project.id}`}
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-primary text-xs flex items-center gap-1"
                          >
                            View Resources <LayoutGrid className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
