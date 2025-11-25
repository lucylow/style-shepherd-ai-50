import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  Globe,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function LovableMonitoring() {
  const [metrics, setMetrics] = useState({
    requests: {
      total: 125000,
      perMinute: 1250,
      trend: 'up',
    },
    responseTime: {
      avg: 145,
      p95: 280,
      p99: 450,
      trend: 'down',
    },
    errors: {
      total: 25,
      rate: 0.02,
      trend: 'down',
    },
    throughput: {
      requestsPerSecond: 20.8,
      bytesPerSecond: 1250000,
      trend: 'up',
    },
  });

  const [alerts, setAlerts] = useState([
    {
      id: '1',
      severity: 'warning',
      message: 'Response time above threshold',
      timestamp: new Date(Date.now() - 5 * 60000),
    },
    {
      id: '2',
      severity: 'info',
      message: 'New deployment successful',
      timestamp: new Date(Date.now() - 30 * 60000),
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        requests: {
          ...prev.requests,
          total: prev.requests.total + Math.floor(Math.random() * 10),
          perMinute: 1200 + Math.floor(Math.random() * 100),
        },
        responseTime: {
          ...prev.responseTime,
          avg: 140 + Math.random() * 20,
          p95: 270 + Math.random() * 30,
          p99: 440 + Math.random() * 40,
        },
        errors: {
          ...prev.errors,
          total: prev.errors.total + (Math.random() > 0.9 ? 1 : 0),
          rate: prev.errors.rate + (Math.random() > 0.95 ? 0.001 : 0),
        },
        throughput: {
          ...prev.throughput,
          requestsPerSecond: 20 + Math.random() * 2,
          bytesPerSecond: 1200000 + Math.random() * 100000,
        },
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Monitoring & Metrics</h1>
                <p className="text-muted-foreground">Real-time performance monitoring</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/lovable">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.requests.total.toLocaleString()}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {metrics.requests.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    {metrics.requests.perMinute} per minute
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.responseTime.avg.toFixed(0)}ms</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {metrics.responseTime.trend === 'down' ? (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    )}
                    P95: {metrics.responseTime.p95.toFixed(0)}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.errors.rate.toFixed(2)}%</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {metrics.errors.trend === 'down' ? (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    )}
                    {metrics.errors.total} total errors
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.throughput.requestsPerSecond.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatBytes(metrics.throughput.bytesPerSecond)}/s
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current status of all services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Frontend', status: 'healthy', cpu: 45, memory: 62 },
                    { name: 'Backend API', status: 'healthy', cpu: 38, memory: 55 },
                    { name: 'Database', status: 'healthy', cpu: 25, memory: 48 },
                    { name: 'CDN', status: 'healthy', cpu: 15, memory: 32 },
                  ].map((service) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                          {service.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>CPU</span>
                            <span>{service.cpu}%</span>
                          </div>
                          <Progress value={service.cpu} />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Memory</span>
                            <span>{service.memory}%</span>
                          </div>
                          <Progress value={service.memory} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                  <CardDescription>P50, P95, P99 percentiles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>P50 (Median)</span>
                        <span className="font-medium">{metrics.responseTime.avg.toFixed(0)}ms</span>
                      </div>
                      <Progress value={50} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>P95</span>
                        <span className="font-medium">{metrics.responseTime.p95.toFixed(0)}ms</span>
                      </div>
                      <Progress value={75} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>P99</span>
                        <span className="font-medium">{metrics.responseTime.p99.toFixed(0)}ms</span>
                      </div>
                      <Progress value={90} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Rate</CardTitle>
                  <CardDescription>Requests per second over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Chart visualization would go here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Current system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                      <div className="flex-1">
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No active alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

