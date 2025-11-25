import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Filter,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  service: string;
  message: string;
  details?: string;
}

export default function LovableLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const services = ['Frontend', 'Backend', 'Database', 'CDN'];

  useEffect(() => {
    // Generate initial logs
    const initialLogs: LogEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date(Date.now() - (50 - i) * 1000).toISOString(),
      level: ['info', 'warning', 'error', 'success'][Math.floor(Math.random() * 4)] as any,
      service: services[Math.floor(Math.random() * services.length)],
      message: `Log entry ${i + 1}: ${['Request processed', 'Database query executed', 'Cache updated', 'Error occurred', 'Deployment successful'][Math.floor(Math.random() * 5)]}`,
    }));
    setLogs(initialLogs);
    setFilteredLogs(initialLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (selectedService !== 'all') {
      filtered = filtered.filter(log => log.service === selectedService);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, selectedLevel, selectedService]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const newLog: LogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: ['info', 'warning', 'error', 'success'][Math.floor(Math.random() * 4)] as any,
          service: services[Math.floor(Math.random() * services.length)],
          message: `New log entry: ${['Request received', 'Processing complete', 'Cache miss', 'Connection established'][Math.floor(Math.random() * 4)]}`,
        };
        setLogs(prev => [...prev.slice(-99), newLog]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredLogs]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const handleDownload = () => {
    const logText = filteredLogs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.service}] ${log.message}`
    ).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setLogs([]);
    setFilteredLogs([]);
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
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Logs Viewer</h1>
                <p className="text-muted-foreground">View and monitor application logs</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClear}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button asChild variant="outline">
                <Link to="/lovable">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedLevel} onValueChange={(value: any) => setSelectedLevel(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Logs</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Application Logs</CardTitle>
                <CardDescription>
                  {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} displayed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono text-sm rounded-lg p-4 h-[600px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No logs found</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-1 hover:bg-gray-900/50 px-2 rounded"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getLevelIcon(log.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                            {getLevelBadge(log.level)}
                            <Badge variant="outline" className="text-xs">
                              {log.service}
                            </Badge>
                          </div>
                          <div className="text-green-400">{log.message}</div>
                          {log.details && (
                            <div className="text-gray-500 text-xs mt-1 ml-4">{log.details}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Logs</CardTitle>
                <CardDescription>
                  {filteredLogs.filter(log => log.level === 'error').length} error{filteredLogs.filter(log => log.level === 'error').length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-red-400 font-mono text-sm rounded-lg p-4 h-[600px] overflow-y-auto">
                  {filteredLogs.filter(log => log.level === 'error').map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 py-1 hover:bg-gray-900/50 px-2 rounded"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getLevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.service}
                          </Badge>
                        </div>
                        <div className="text-red-400">{log.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warnings">
            <Card>
              <CardHeader>
                <CardTitle>Warning Logs</CardTitle>
                <CardDescription>
                  {filteredLogs.filter(log => log.level === 'warning').length} warning{filteredLogs.filter(log => log.level === 'warning').length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-yellow-400 font-mono text-sm rounded-lg p-4 h-[600px] overflow-y-auto">
                  {filteredLogs.filter(log => log.level === 'warning').map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 py-1 hover:bg-gray-900/50 px-2 rounded"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getLevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.service}
                          </Badge>
                        </div>
                        <div className="text-yellow-400">{log.message}</div>
                      </div>
                    </div>
                  ))}
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

