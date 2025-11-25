import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
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
import { Progress } from '@/components/ui/progress';

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  details?: string;
}

export default function LovableHealth() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    {
      id: '1',
      name: 'Frontend',
      status: 'healthy',
      responseTime: 45,
      lastChecked: new Date().toISOString(),
      details: 'All systems operational',
    },
    {
      id: '2',
      name: 'Backend API',
      status: 'healthy',
      responseTime: 120,
      lastChecked: new Date().toISOString(),
      details: 'API responding normally',
    },
    {
      id: '3',
      name: 'Database',
      status: 'healthy',
      responseTime: 25,
      lastChecked: new Date().toISOString(),
      details: 'Connection pool healthy',
    },
    {
      id: '4',
      name: 'CDN',
      status: 'healthy',
      responseTime: 15,
      lastChecked: new Date().toISOString(),
      details: 'Edge nodes operational',
    },
    {
      id: '5',
      name: 'Cache',
      status: 'healthy',
      responseTime: 8,
      lastChecked: new Date().toISOString(),
      details: 'Redis cache responding',
    },
    {
      id: '6',
      name: 'External API',
      status: 'degraded',
      responseTime: 450,
      lastChecked: new Date().toISOString(),
      details: 'Higher than normal latency',
    },
  ]);

  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthChecks(prev => prev.map(check => ({
        ...check,
        responseTime: check.responseTime + (Math.random() * 20 - 10),
        lastChecked: new Date().toISOString(),
      })));
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasDown = healthChecks.some(check => check.status === 'down');
    const hasDegraded = healthChecks.some(check => check.status === 'degraded');
    
    if (hasDown) {
      setOverallStatus('down');
    } else if (hasDegraded) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('healthy');
    }
  }, [healthChecks]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getServiceIcon = (name: string) => {
    if (name.includes('Database')) return <Database className="w-5 h-5" />;
    if (name.includes('API')) return <Server className="w-5 h-5" />;
    if (name.includes('CDN')) return <Globe className="w-5 h-5" />;
    if (name.includes('Cache')) return <Zap className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  const healthyCount = healthChecks.filter(c => c.status === 'healthy').length;
  const totalCount = healthChecks.length;
  const healthPercentage = (healthyCount / totalCount) * 100;

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
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Health Checks</h1>
                <p className="text-muted-foreground">Monitor system health and status</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Last updated</div>
                <div className="text-sm font-medium">
                  {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
              <Button variant="outline" onClick={() => setLastUpdate(new Date())}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button asChild>
                <Link to="/lovable">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(overallStatus)}
                  <div>
                    <div className="text-2xl font-bold">Overall System Status</div>
                    <div className="text-muted-foreground">
                      {healthyCount} of {totalCount} services healthy
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(overallStatus)}
                  <div className="text-3xl font-bold mt-2">
                    {healthPercentage.toFixed(0)}%
                  </div>
                </div>
              </div>
              <Progress value={healthPercentage} className="mt-4" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Health Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {healthChecks.map((check, index) => (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        {getServiceIcon(check.name)}
                      </div>
                      <CardTitle className="text-lg">{check.name}</CardTitle>
                    </div>
                    {getStatusIcon(check.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      {getStatusBadge(check.status)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className="font-medium">
                          {check.responseTime.toFixed(0)}ms
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            check.responseTime < 100
                              ? 'bg-green-500'
                              : check.responseTime < 300
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min((check.responseTime / 500) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    {check.details && (
                      <div className="text-sm text-muted-foreground">
                        {check.details}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Last checked: {new Date(check.lastChecked).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Detailed Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>Detailed health check information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getServiceIcon(check.name)}
                    <div>
                      <div className="font-medium">{check.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {check.details || 'No additional details'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Response Time</div>
                      <div className="font-semibold">
                        {check.responseTime.toFixed(0)}ms
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Average Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(healthChecks.reduce((sum, c) => sum + c.responseTime, 0) / healthChecks.length).toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Across all services
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">
                Last 30 days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthChecks.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Active health checks
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

