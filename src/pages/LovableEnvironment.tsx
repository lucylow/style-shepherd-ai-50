import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Save,
  Copy,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EnvVar {
  id: string;
  key: string;
  value: string;
  environment: 'production' | 'staging' | 'development';
  isSecret: boolean;
  createdAt: string;
}

export default function LovableEnvironment() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    {
      id: '1',
      key: 'VITE_API_BASE_URL',
      value: '/api',
      environment: 'production',
      isSecret: false,
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      key: 'STRIPE_SECRET_KEY',
      value: 'sk_live_...',
      environment: 'production',
      isSecret: true,
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: '3',
      key: 'DATABASE_URL',
      value: 'postgresql://...',
      environment: 'production',
      isSecret: true,
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: '4',
      key: 'VITE_STRIPE_PUBLISHABLE_KEY',
      value: 'pk_live_...',
      environment: 'production',
      isSecret: false,
      createdAt: '2024-01-10T10:00:00Z',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState<'all' | 'production' | 'staging' | 'development'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVar | null>(null);
  const [newVar, setNewVar] = useState({ key: '', value: '', environment: 'production' as const, isSecret: false });
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const filteredVars = envVars.filter(var_ => {
    const matchesSearch = var_.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         var_.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = selectedEnv === 'all' || var_.environment === selectedEnv;
    return matchesSearch && matchesEnv;
  });

  const handleAdd = () => {
    if (!newVar.key || !newVar.value) {
      toast.error('Please fill in all fields');
      return;
    }
    const newEnvVar: EnvVar = {
      id: Date.now().toString(),
      ...newVar,
      createdAt: new Date().toISOString(),
    };
    setEnvVars([...envVars, newEnvVar]);
    setNewVar({ key: '', value: '', environment: 'production', isSecret: false });
    setIsAddDialogOpen(false);
    toast.success('Environment variable added');
  };

  const handleEdit = (var_: EnvVar) => {
    setEditingVar(var_);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingVar) return;
    setEnvVars(envVars.map(v => v.id === editingVar.id ? editingVar : v));
    setIsEditDialogOpen(false);
    setEditingVar(null);
    toast.success('Environment variable updated');
  };

  const handleDelete = (id: string) => {
    setEnvVars(envVars.filter(v => v.id !== id));
    toast.success('Environment variable deleted');
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const maskValue = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
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
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Environment Variables</h1>
                <p className="text-muted-foreground">Manage your environment configuration</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/lovable">
                  Back to Dashboard
                </Link>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variable
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Environment Variable</DialogTitle>
                    <DialogDescription>
                      Add a new environment variable for your deployment
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="key">Key</Label>
                      <Input
                        id="key"
                        value={newVar.key}
                        onChange={(e) => setNewVar({ ...newVar, key: e.target.value })}
                        placeholder="VITE_API_BASE_URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        value={newVar.value}
                        onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                        placeholder="https://api.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <select
                        id="environment"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newVar.environment}
                        onChange={(e) => setNewVar({ ...newVar, environment: e.target.value as any })}
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="development">Development</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isSecret"
                        checked={newVar.isSecret}
                        onChange={(e) => setNewVar({ ...newVar, isSecret: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="isSecret">Mark as secret (hide value)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAdd}>
                      <Save className="w-4 h-4 mr-2" />
                      Add Variable
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="px-4 py-2 border rounded-md"
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value as any)}
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>

        {/* Environment Variables List */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              {filteredVars.length} variable{filteredVars.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredVars.map((var_) => (
                <div key={var_.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-sm font-mono font-semibold">{var_.key}</code>
                      <Badge variant="secondary" className="text-xs">
                        {var_.environment}
                      </Badge>
                      {var_.isSecret && (
                        <Badge variant="outline" className="text-xs">
                          Secret
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-muted-foreground">
                        {var_.isSecret && !visibleSecrets.has(var_.id)
                          ? maskValue(var_.value)
                          : var_.value}
                      </code>
                      {var_.isSecret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(var_.id)}
                        >
                          {visibleSecrets.has(var_.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(var_.value)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(var_)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(var_.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredVars.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No environment variables found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Environment Variable</DialogTitle>
              <DialogDescription>
                Update the environment variable value
              </DialogDescription>
            </DialogHeader>
            {editingVar && (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Key</Label>
                    <Input value={editingVar.key} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-value">Value</Label>
                    <Input
                      id="edit-value"
                      value={editingVar.value}
                      onChange={(e) => setEditingVar({ ...editingVar, value: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={editingVar.environment}
                      onChange={(e) => setEditingVar({ ...editingVar, environment: e.target.value as any })}
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

