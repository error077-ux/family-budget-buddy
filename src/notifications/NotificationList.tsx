import React, { useState, useEffect } from 'react';
import { Bell, Plus, Pencil, Trash2, Mail, Calendar, Repeat, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { notificationsApi, type Notification } from '@/api/supabase-api';
import { formatDate, getTodayIST } from '@/utils/formatDate';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', message: '', email: '', scheduled_date: getTodayIST(), is_recurring: false, recurrence_day: '1' });

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try { setNotifications(await notificationsApi.getAll()); }
    catch { toast({ title: 'Error', description: 'Failed to load', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (n?: Notification) => {
    if (n) { setSelectedNotification(n); setForm({ title: n.title, message: n.message, email: n.email, scheduled_date: n.scheduled_date.split('T')[0], is_recurring: n.is_recurring, recurrence_day: String(n.recurrence_day || 1) }); }
    else { setSelectedNotification(null); setForm({ title: '', message: '', email: '', scheduled_date: getTodayIST(), is_recurring: false, recurrence_day: '1' }); }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { title: form.title, message: form.message, email: form.email, scheduled_date: form.scheduled_date, is_recurring: form.is_recurring, recurrence_day: form.is_recurring ? parseInt(form.recurrence_day) : undefined };
      if (selectedNotification) await notificationsApi.update(selectedNotification.id, payload); else await notificationsApi.create(payload);
      toast({ title: 'Success' }); setDialogOpen(false); fetchNotifications();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedNotification) return; setSaving(true);
    try { await notificationsApi.delete(selectedNotification.id); toast({ title: 'Deleted' }); setDeleteDialogOpen(false); fetchNotifications(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">Schedule reminders</p></div>
        <Button onClick={() => handleOpenDialog()} className="gap-2"><Plus className="w-4 h-4" />Schedule</Button>
      </div>
      <div className="space-y-4">
        {notifications.length === 0 ? <div className="card-finance p-12 text-center"><Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" /><p className="text-muted-foreground">No notifications</p></div> : notifications.map(n => (
          <div key={n.id} className="card-finance p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={`p-3 rounded-xl ${n.is_sent ? 'bg-success/10' : n.is_recurring ? 'bg-primary/10' : 'bg-warning/10'}`}>{n.is_sent ? <CheckCircle className="w-6 h-6 text-success" /> : n.is_recurring ? <Repeat className="w-6 h-6 text-primary" /> : <Clock className="w-6 h-6 text-warning" />}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold">{n.title}</h3>{n.is_recurring && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Monthly (Day {n.recurrence_day})</span>}{n.is_sent && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Sent</span>}</div><p className="text-sm text-muted-foreground line-clamp-1">{n.message}</p><div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Mail className="w-3 h-3" />{n.email}</span><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(n.scheduled_date)}</span></div></div>
            <div className="flex gap-2"><button onClick={() => handleOpenDialog(n)} className="p-2 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button><button onClick={() => { setSelectedNotification(n); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button></div>
          </div>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{selectedNotification ? 'Edit' : 'Schedule'} Notification</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div><div><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} required /></div><div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div><div><Label>Date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required /></div><div className="flex items-center justify-between p-4 rounded-lg bg-muted/50"><div><p className="font-medium">Monthly Recurring</p><p className="text-sm text-muted-foreground">Repeat each month</p></div><Switch checked={form.is_recurring} onCheckedChange={(c) => setForm({ ...form, is_recurring: c })} /></div>{form.is_recurring && <div><Label>Day of Month</Label><Select value={form.recurrence_day} onValueChange={(v) => setForm({ ...form, recurrence_day: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:28},(_,i)=>i+1).map(d=><SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent></Select></div>}<div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button></div></form></DialogContent></Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete Notification</DialogTitle></DialogHeader><p className="text-muted-foreground">Delete "{selectedNotification?.title}"?</p><div className="flex gap-3 pt-4"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</Button></div></DialogContent></Dialog>
    </div>
  );
};

export default NotificationList;
