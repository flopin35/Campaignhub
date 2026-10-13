import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Sun, Moon, Monitor, LogOut, Mail, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, Button, Input, PageHeader, KeyValue, Badge } from '../components/ui';
import { useMyCampaigns } from '../context/WorkspaceContext';
import { getBillingState } from '../utils/billing';
import { cn } from '../utils/format';

export default function Settings() {
  const { user, userProfile, setUserProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { campaigns } = useMyCampaigns();
  const navigate = useNavigate();
  const [name, setName] = useState(userProfile?.name || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        displayName: name.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });
      setUserProfile?.((p) => ({ ...(p || {}), name: name.trim(), displayName: name.trim(), phone: phone.trim() }));
      toast('Profile saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-up space-y-6">
      <PageHeader title="Settings" subtitle="Your account, appearance and subscriptions." />

      <Card as="form" onSubmit={save}>
        <CardHeader title="Profile" icon={User} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          <Input className="sm:col-span-2" label="Email" value={user?.email || ''} disabled hint="Your sign-in email can't be changed here." />
        </div>
        <Button type="submit" className="mt-5" loading={saving}>Save profile</Button>
      </Card>

      <Card>
        <CardHeader title="Appearance" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setTheme(o.id)}
              className={cn('rounded-xl border p-4 flex flex-col items-center gap-2 text-sm font-medium', theme === o.id ? 'border-primary ring-2 ring-primary/15 text-ink' : 'border-line-strong text-ink-2 hover:bg-surface-2')}
            >
              <o.icon className="w-5 h-5" /> {o.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Subscriptions" subtitle="Each campaign page has its own plan." icon={ShieldCheck} />
        {campaigns.length === 0 ? (
          <p className="text-sm text-ink-3">No campaign pages yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {campaigns.map((c) => {
              const b = getBillingState(c);
              return (
                <KeyValue key={c.id} label={c.title} value={<Button size="sm" variant="ghost" to={`/dashboard/${c.id}/billing`}><Badge tone={b.tone}>{b.label}</Badge> Manage</Button>} />
              );
            })}
          </div>
        )}
        <p className="text-xs text-ink-3 mt-4">
          Free trial: {userProfile?.trialCampaignId ? 'used' : 'available — 7 days on your first campaign page'}
        </p>
      </Card>

      <Card>
        <CardHeader title="Account" icon={Mail} />
        <p className="text-sm text-ink-2">Need to change your email, transfer a campaign to a new owner, or delete your account? Email campaignhubgh@gmail.com from your account address.</p>
        <Button
          className="mt-5"
          variant="danger-ghost"
          icon={LogOut}
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
}
