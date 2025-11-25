import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save, 
  RefreshCw,
  Globe,
  Database,
  Key,
  Bell,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function LovableSettings() {
  const [settings, setSettings] = useState({
    general: {
      projectName: 'Style Shepherd',
      domain: 'style-shepherd.lovable.app',
      region: 'us-east-1',
      timezone: 'UTC',
    },
    performance: {
      enableCaching: true,
      cacheTTL: 3600,
      enableCDN: true,
      compressionLevel: 'medium',
    },
    security: {
      enableHTTPS: true,
      enableCORS: true,
      allowedOrigins: '*',
      rateLimitEnabled: true,
      rateLimitRequests: 100,
    },
    notifications: {
      emailAlerts: true,
      slackAlerts: false,
      deploymentNotifications: true,
      errorNotifications: true,
    },
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    toast.info('Settings reset to defaults');
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
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Configure your deployment settings</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic project configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={settings.general.projectName}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, projectName: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Custom Domain</Label>
                  <Input
                    id="domain"
                    value={settings.general.domain}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, domain: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Deployment Region</Label>
                  <Input
                    id="region"
                    value={settings.general.region}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, region: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={settings.general.timezone}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, timezone: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Settings</CardTitle>
                <CardDescription>Optimize your application performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="caching">Enable Caching</Label>
                    <p className="text-sm text-muted-foreground">
                      Cache static assets and API responses
                    </p>
                  </div>
                  <Switch
                    id="caching"
                    checked={settings.performance.enableCaching}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      performance: { ...settings.performance, enableCaching: checked }
                    })}
                  />
                </div>

                {settings.performance.enableCaching && (
                  <div className="space-y-2">
                    <Label htmlFor="cacheTTL">Cache TTL (seconds)</Label>
                    <Input
                      id="cacheTTL"
                      type="number"
                      value={settings.performance.cacheTTL}
                      onChange={(e) => setSettings({
                        ...settings,
                        performance: { ...settings.performance, cacheTTL: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cdn">Enable CDN</Label>
                    <p className="text-sm text-muted-foreground">
                      Use content delivery network for faster loading
                    </p>
                  </div>
                  <Switch
                    id="cdn"
                    checked={settings.performance.enableCDN}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      performance: { ...settings.performance, enableCDN: checked }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compression">Compression Level</Label>
                  <select
                    id="compression"
                    className="w-full px-3 py-2 border rounded-md"
                    value={settings.performance.compressionLevel}
                    onChange={(e) => setSettings({
                      ...settings,
                      performance: { ...settings.performance, compressionLevel: e.target.value }
                    })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="https">Enable HTTPS</Label>
                    <p className="text-sm text-muted-foreground">
                      Force secure connections
                    </p>
                  </div>
                  <Switch
                    id="https"
                    checked={settings.security.enableHTTPS}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      security: { ...settings.security, enableHTTPS: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cors">Enable CORS</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow cross-origin requests
                    </p>
                  </div>
                  <Switch
                    id="cors"
                    checked={settings.security.enableCORS}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      security: { ...settings.security, enableCORS: checked }
                    })}
                  />
                </div>

                {settings.security.enableCORS && (
                  <div className="space-y-2">
                    <Label htmlFor="origins">Allowed Origins</Label>
                    <Input
                      id="origins"
                      value={settings.security.allowedOrigins}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, allowedOrigins: e.target.value }
                      })}
                      placeholder="* or comma-separated list"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="rateLimit">Enable Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent abuse and DDoS attacks
                    </p>
                  </div>
                  <Switch
                    id="rateLimit"
                    checked={settings.security.rateLimitEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      security: { ...settings.security, rateLimitEnabled: checked }
                    })}
                  />
                </div>

                {settings.security.rateLimitEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitRequests">Requests per Minute</Label>
                    <Input
                      id="rateLimitRequests"
                      type="number"
                      value={settings.security.rateLimitRequests}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, rateLimitRequests: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts via email
                    </p>
                  </div>
                  <Switch
                    id="email"
                    checked={settings.notifications.emailAlerts}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailAlerts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="slack">Slack Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Slack
                    </p>
                  </div>
                  <Switch
                    id="slack"
                    checked={settings.notifications.slackAlerts}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, slackAlerts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="deployment">Deployment Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify on deployment events
                    </p>
                  </div>
                  <Switch
                    id="deployment"
                    checked={settings.notifications.deploymentNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, deploymentNotifications: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="errors">Error Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert on errors and exceptions
                    </p>
                  </div>
                  <Switch
                    id="errors"
                    checked={settings.notifications.errorNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, errorNotifications: checked }
                    })}
                  />
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

