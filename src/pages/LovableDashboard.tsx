import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, 
  Activity, 
  Server, 
  Database, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Zap,
  Settings,
  BarChart3,
  FileText,
  Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function LovableDashboard() {
  const [deploymentStatus, setDeploymentStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [metrics, setMetrics] = useState({
    uptime: 99.9,
    requests: 125000,
    responseTime: 145,
    activeUsers: 1240,
    errorRate: 0.02,
    cpuUsage: 45,
    memoryUsage: 62,
  });

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        requests: prev.requests + Math.floor(Math.random() * 10),
        responseTime: 140 + Math.random() * 20,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5) - 2,
        cpuUsage: 40 + Math.random() * 15,
        memoryUsage: 55 + Math.random() * 20,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { icon: Settings, label: 'Settings', href: '/lovable/settings', color: 'bg-blue-500' },
    { icon: BarChart3, label: 'Analytics', href: '/lovable/analytics', color: 'bg-green-500' },
    { icon: FileText, label: 'Logs', href: '/lovable/logs', color: 'bg-purple-500' },
    { icon: Heart, label: 'Health', href: '/lovable/health', color: 'bg-red-500' },
  ];

  const services = [
    { name: 'Frontend', status: 'healthy', uptime: '99.9%', lastDeploy: '2 hours ago' },
    { name: 'Backend API', status: 'healthy', uptime: '99.8%', lastDeploy: '3 hours ago' },
    { name: 'Database', status: 'healthy', uptime: '100%', lastDeploy: '1 day ago' },
    { name: 'CDN', status: 'healthy', uptime: '99.9%', lastDeploy: '5 hours ago' },
  ];

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
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Lovable Cloud Dashboard</h1>
                <p className="text-muted-foreground">Monitor and manage your deployment</p>
              </div>
            </div>
            <Badge variant={deploymentStatus === 'healthy' ? 'default' : 'destructive'} className="text-sm px-4 py-2">
              {deploymentStatus === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  All Systems Operational
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Issues Detected
                </>
              )}
            </Badge>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {quickActions.map((action, index) => (
            <Link key={action.href} to={action.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-sm">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.uptime}%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
              <Progress value={metrics.uptime} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.requests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% from last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.responseTime.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">Target: &lt;200ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.errorRate}%</div>
              <p className="text-xs text-muted-foreground">Target: &lt;0.1%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU</span>
                  <span>{metrics.cpuUsage}%</span>
                </div>
                <Progress value={metrics.cpuUsage} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Memory</span>
                  <span>{metrics.memoryUsage}%</span>
                </div>
                <Progress value={metrics.memoryUsage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Services Status</CardTitle>
              <CardDescription>Real-time status of all deployed services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Last deploy: {service.lastDeploy}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                        {service.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Uptime: {service.uptime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/lovable/deployment">
                    <Server className="w-4 h-4 mr-2" />
                    Deployment Management
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/lovable/monitoring">
                    <Activity className="w-4 h-4 mr-2" />
                    Monitoring & Metrics
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/lovable/environment">
                    <Database className="w-4 h-4 mr-2" />
                    Environment Variables
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/lovable/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuration Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

