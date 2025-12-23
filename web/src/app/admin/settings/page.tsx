'use client';

import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Database, Globe, Mail, AlertTriangle } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getMaintenanceStatus, setMaintenanceMode, type MaintenanceStatus } from '@/lib/api';

interface SettingSection {
  id: string;
  label: string;
  icon: typeof Bell;
}

const sections: SettingSection[] = [
  { id: 'general', label: 'Général', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'database', label: 'Base de données', icon: Database },
  { id: 'email', label: 'Email', icon: Mail },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceStatus();
  }, []);

  async function loadMaintenanceStatus() {
    try {
      const status = await getMaintenanceStatus();
      setMaintenanceEnabled(status.enabled);
      setMaintenanceMessage(status.message || '');
    } catch {
      // Ignore errors - default to false
    } finally {
      setMaintenanceLoading(false);
    }
  }

  async function handleMaintenanceToggle() {
    const newEnabled = !maintenanceEnabled;
    setMaintenanceEnabled(newEnabled);
    try {
      await setMaintenanceMode(newEnabled, maintenanceMessage);
    } catch {
      // Revert on error
      setMaintenanceEnabled(!newEnabled);
    }
  }

  async function handleMaintenanceMessageSave() {
    setSaving(true);
    try {
      await setMaintenanceMode(maintenanceEnabled, maintenanceMessage);
    } finally {
      setSaving(false);
    }
  }

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Paramètres</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Configuration du système
            </p>
          </div>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Sauvegarder
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors text-left',
                    activeSection === section.id
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 max-w-2xl">
            {activeSection === 'general' && (
              <Card className="p-6 animate-fade-in">
                <h2 className="text-lg font-display font-medium mb-6">Paramètres généraux</h2>
                <div className="space-y-6">
                  <Input
                    label="Nom de l'application"
                    defaultValue="Reservo"
                    hint="Affiché dans l'interface et les emails"
                  />
                  <Input
                    label="URL de base"
                    defaultValue="http://localhost:3001"
                    hint="URL publique de l'application"
                  />
                  <Input
                    label="Fuseau horaire"
                    defaultValue="Europe/Paris"
                    hint="Utilisé pour les horodatages"
                  />
                  {/* Maintenance Mode Toggle */}
                  <div className={cn(
                    "p-4 rounded-lg border transition-colors",
                    maintenanceEnabled
                      ? "bg-[var(--warning-bg)] border-[var(--warning)]"
                      : "bg-[var(--bg-subtle)] border-transparent"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {maintenanceEnabled && (
                          <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
                        )}
                        <div>
                          <p className="font-medium">Mode maintenance</p>
                          <p className="text-sm text-[var(--text-tertiary)]">
                            Désactiver temporairement les réservations
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleMaintenanceToggle}
                        disabled={maintenanceLoading}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors",
                          maintenanceEnabled ? "bg-[var(--warning)]" : "bg-[var(--border)]",
                          maintenanceLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          maintenanceEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {maintenanceEnabled && (
                      <div className="mt-4 pt-4 border-t border-[var(--warning)] border-opacity-30">
                        <Input
                          label="Message de maintenance"
                          placeholder="ex: Maintenance prévue jusqu'à 18h00"
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          hint="Ce message sera affiché aux utilisateurs"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3"
                          onClick={handleMaintenanceMessageSave}
                          loading={saving}
                        >
                          Enregistrer le message
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card className="p-6 animate-fade-in">
                <h2 className="text-lg font-display font-medium mb-6">Notifications</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Nouvelle réservation', description: 'Email à chaque nouvelle réservation' },
                    { label: 'Annulation', description: 'Notification quand une réservation est annulée' },
                    { label: 'Capacité atteinte', description: 'Alerte quand une ressource est pleine' },
                    { label: 'Rapport quotidien', description: 'Résumé des activités chaque jour' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-[var(--text-tertiary)]">{item.description}</p>
                      </div>
                      <button
                        className="w-12 h-6 bg-[var(--accent)] rounded-full relative transition-colors"
                        onClick={() => {}}
                      >
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card className="p-6 animate-fade-in">
                <h2 className="text-lg font-display font-medium mb-6">Sécurité</h2>
                <div className="space-y-6">
                  <Input
                    label="Clé API"
                    type="password"
                    defaultValue="sk_live_xxxxxxxxxxxx"
                    hint="Utilisée pour les appels API externes"
                  />
                  <Input
                    label="Limite de requêtes"
                    type="number"
                    defaultValue="1000"
                    hint="Requêtes par minute par IP"
                  />
                  <div className="p-4 bg-[var(--warning-bg)] border border-[var(--warning)] rounded-lg">
                    <p className="font-medium text-[var(--warning)]">Zone sensible</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Les modifications de sécurité prennent effet immédiatement.
                      Soyez prudent lors des changements.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'database' && (
              <Card className="p-6 animate-fade-in">
                <h2 className="text-lg font-display font-medium mb-6">Base de données</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--bg-subtle)] rounded-lg">
                      <p className="text-sm text-[var(--text-tertiary)]">Connexions actives</p>
                      <p className="text-2xl font-display font-medium mt-1">12</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-subtle)] rounded-lg">
                      <p className="text-sm text-[var(--text-tertiary)]">Taille de la base</p>
                      <p className="text-2xl font-display font-medium mt-1">2.4 GB</p>
                    </div>
                  </div>
                  <Input
                    label="URL PostgreSQL"
                    defaultValue="postgres://localhost:5432/reservo"
                    hint="Chaîne de connexion à la base de données"
                  />
                  <div className="flex gap-3">
                    <Button variant="secondary">Tester la connexion</Button>
                    <Button variant="secondary">Exporter les données</Button>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'email' && (
              <Card className="p-6 animate-fade-in">
                <h2 className="text-lg font-display font-medium mb-6">Configuration Email</h2>
                <div className="space-y-6">
                  <Input
                    label="Serveur SMTP"
                    placeholder="smtp.example.com"
                    hint="Serveur d'envoi d'emails"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Port"
                      type="number"
                      placeholder="587"
                    />
                    <Input
                      label="Sécurité"
                      placeholder="TLS"
                    />
                  </div>
                  <Input
                    label="Email expéditeur"
                    placeholder="noreply@reservo.io"
                    hint="Adresse utilisée pour les notifications"
                  />
                  <Button variant="secondary">Envoyer un email test</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
