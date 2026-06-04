import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, Calendar, DollarSign, Eye, EyeOff, Loader2, RefreshCw, Pencil, Trash2, ChevronLeft, ChevronRight, X, Phone, Mail, User, Copy, Check, Link2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatTime } from '@/lib/helpers';
import { useToast } from '@/hooks/use-toast';
import { Service, TimeSlot } from '@/types';
import { organizerApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CalendarBooking {
  id: string;
  amount: number;
  paymentMode: string;
  paymentStatus: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  service: {
    id: string;
    title: string;
    category: string;
    price: number;
  };
  slot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchOrganizerServices, fetchOrganizerStats, publishService, deleteService } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check which tab we're on
  const currentTab = searchParams.get('tab');
  const isServicesTab = currentTab === 'services';
  const isCalendarTab = currentTab === 'calendar';
  
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    totalServices: 0,
    publishedServices: 0,
    unpublishedServices: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);
  
  // Slot URL modal state
  const [showSlotUrlModal, setShowSlotUrlModal] = useState(false);
  const [selectedServiceForSlotUrl, setSelectedServiceForSlotUrl] = useState<Service | null>(null);
  const [serviceSlots, setServiceSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotUrlDate, setSelectedSlotUrlDate] = useState<Date | undefined>(undefined);
  const [selectedSlotUrlSlot, setSelectedSlotUrlSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotUrlCopied, setSlotUrlCopied] = useState(false);
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarBookings, setCalendarBookings] = useState<Record<string, CalendarBooking[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    const statsData = await fetchOrganizerStats();
    if (statsData) {
      setStats(statsData);
    }
    setIsLoading(false);
  };

  const loadServices = async () => {
    setIsLoading(true);
    const services = await fetchOrganizerServices();
    setMyServices(services);
    setIsLoading(false);
  };

  const loadCalendar = async () => {
    setIsLoading(true);
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth() + 1;
      const response = await organizerApi.getCalendar(year, month);
      setCalendarBookings(response.data.bookingsByDate || {});
    } catch (error) {
      console.error('Failed to load calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar data',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isServicesTab) {
      loadServices();
    } else if (isCalendarTab) {
      loadCalendar();
    } else {
      loadStats();
    }
  }, [isServicesTab, isCalendarTab]);

  // Reload calendar when month changes
  useEffect(() => {
    if (isCalendarTab) {
      loadCalendar();
    }
  }, [calendarDate]);

  const handlePublishToggle = async (serviceId: string, published: boolean) => {
    const result = await publishService(serviceId, published);
    if (result.success) {
      setMyServices(prev => prev.map(s => s.id === serviceId ? { ...s, isPublished: published } : s));
      toast({
        title: published ? 'Service Published' : 'Service Unpublished',
        description: published
          ? 'Your service is now visible to users.'
          : 'Your service is now hidden from users.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update service',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    setDeletingId(serviceId);
    const result = await deleteService(serviceId);
    if (result.success) {
      setMyServices(prev => prev.filter(s => s.id !== serviceId));
      toast({
        title: 'Service Deleted',
        description: 'Your service has been deleted successfully.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete service',
        variant: 'destructive',
      });
    }
    setDeletingId(null);
  };

  const handleRefresh = () => {
    if (isServicesTab) {
      loadServices();
    } else if (isCalendarTab) {
      loadCalendar();
    } else {
      loadStats();
    }
  };

  const handleCopyServiceUrl = async (serviceId: string) => {
    const serviceUrl = `${window.location.origin}/service/${serviceId}`;
    try {
      await navigator.clipboard.writeText(serviceUrl);
      setCopiedServiceId(serviceId);
      toast({
        title: 'URL Copied!',
        description: 'Service URL has been copied to clipboard.',
      });
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedServiceId(null);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Failed to Copy',
        description: 'Could not copy URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenSlotUrlModal = async (service: Service) => {
    setSelectedServiceForSlotUrl(service);
    setShowSlotUrlModal(true);
    setIsLoadingSlots(true);
    setSelectedSlotUrlDate(undefined);
    setSelectedSlotUrlSlot(null);
    
    try {
      // Fetch service with slots
      const response = await organizerApi.getService(service.id);
      const apiService = response.data.service;
      
      // Map slots to TimeSlot format
      const slots: TimeSlot[] = (apiService.slots || []).map((slot: any) => ({
        id: slot.id,
        serviceId: slot.serviceId,
        date: slot.date?.split('T')[0] || slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status.toLowerCase() as 'available' | 'hold' | 'booked',
      }));
      
      // Filter only available slots
      const availableSlots = slots.filter(s => s.status === 'available');
      setServiceSlots(availableSlots);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load service slots.',
        variant: 'destructive',
      });
      setShowSlotUrlModal(false);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSlotUrlDateChange = (date: Date | undefined) => {
    setSelectedSlotUrlDate(date);
    setSelectedSlotUrlSlot(null); // Reset slot selection when date changes
  };

  const handleGenerateSlotUrl = () => {
    if (!selectedServiceForSlotUrl || !selectedSlotUrlDate || !selectedSlotUrlSlot) {
      return;
    }
    
    const dateStr = format(selectedSlotUrlDate, 'yyyy-MM-dd');
    const slotUrl = `${window.location.origin}/service/${selectedServiceForSlotUrl.id}?date=${dateStr}&slot=${selectedSlotUrlSlot}`;
    
    return slotUrl;
  };

  const handleCopySlotUrl = async () => {
    const url = handleGenerateSlotUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setSlotUrlCopied(true);
      toast({
        title: 'Slot URL Copied!',
        description: 'The slot booking URL has been copied to clipboard.',
      });
      setTimeout(() => {
        setSlotUrlCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Failed to Copy',
        description: 'Could not copy URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  // Get available dates from slots
  const getAvailableDates = () => {
    const dates = Array.from(new Set(serviceSlots.map(s => s.date)))
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());
    return dates;
  };

  // Get slots for selected date
  const getSlotsForSelectedDate = () => {
    if (!selectedSlotUrlDate) return [];
    const dateStr = format(selectedSlotUrlDate, 'yyyy-MM-dd');
    return serviceSlots
      .filter(s => s.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday
    
    const days: Array<{ date: Date | null; dateStr: string | null }> = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push({ date: null, dateStr: null });
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date: d, dateStr });
    }
    
    return days;
  };

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  const handleDayClick = (dateStr: string) => {
    if (calendarBookings[dateStr] && calendarBookings[dateStr].length > 0) {
      setSelectedDate(dateStr);
      setIsModalOpen(true);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const statsCards = [
    { label: 'Total Services', value: stats.totalServices, icon: FileText, color: 'text-primary' },
    { label: 'Published', value: stats.publishedServices, icon: Eye, color: 'text-accent' },
    { label: 'Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-available' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-primary' },
  ];

  return (
    <div className="p-6 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isCalendarTab ? 'Calendar' : isServicesTab ? 'My Services' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {isCalendarTab 
              ? 'View your booked appointments' 
              : isServicesTab 
                ? 'Manage your services and listings' 
                : 'Overview of your business performance'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isServicesTab && (
            <Button variant="gradient" onClick={() => navigate('/dashboard/organizer/create')}>
              <Plus size={18} />
              Create Service
            </Button>
          )}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Calendar View */}
          {isCalendarTab && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h2 className="text-xl font-semibold min-w-[200px] text-center">
                        {calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </h2>
                      <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div
                        key={day}
                        className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {getDaysInMonth(calendarDate).map((day, index) => {
                      if (!day.date || !day.dateStr) {
                        return <div key={`empty-${index}`} className="h-24 bg-muted/30 rounded-lg" />;
                      }
                      
                      const bookingsForDay = calendarBookings[day.dateStr] || [];
                      const hasBookings = bookingsForDay.length > 0;
                      // Use local date to avoid timezone issues
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = day.dateStr === todayStr;
                      
                      return (
                        <Tooltip key={day.dateStr}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDayClick(day.dateStr!)}
                              className={cn(
                                "h-24 rounded-lg border transition-all relative flex flex-col p-2",
                                hasBookings 
                                  ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 cursor-pointer" 
                                  : "bg-card border-border hover:bg-muted/50",
                                isToday && "ring-2 ring-primary"
                              )}
                            >
                              <span className={cn(
                                "text-sm font-medium",
                                isToday && "text-primary"
                              )}>
                                {day.date.getDate()}
                              </span>
                              {hasBookings && (
                                <div className="mt-1 flex-1 overflow-hidden">
                                  <Badge variant="default" className="bg-green-600 text-xs">
                                    {bookingsForDay.length} booking{bookingsForDay.length > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              )}
                            </button>
                          </TooltipTrigger>
                          {hasBookings && (
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                {bookingsForDay.slice(0, 3).map((b) => (
                                  <div key={b.id} className="text-xs">
                                    <span className="font-medium">{b.slot.startTime}</span> - {b.service.title} ({b.user.name})
                                  </div>
                                ))}
                                {bookingsForDay.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{bookingsForDay.length - 3} more...
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details Modal */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Bookings for {selectedDate && formatDateDisplay(selectedDate)}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedDate && calendarBookings[selectedDate]?.length} confirmed booking(s)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {selectedDate && calendarBookings[selectedDate]?.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3 flex-1">
                              {/* Time & Service */}
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-sm font-mono">
                                  {booking.slot.startTime} - {booking.slot.endTime}
                                </Badge>
                                <span className="font-semibold">{booking.service.title}</span>
                                <Badge variant="secondary">{booking.service.category}</Badge>
                              </div>
                              
                              {/* Customer Details */}
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{booking.user.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-4 w-4" />
                                  <a href={`mailto:${booking.user.email}`} className="hover:underline">
                                    {booking.user.email}
                                  </a>
                                </div>
                                {booking.user.phone && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <a href={`tel:${booking.user.phone}`} className="hover:underline">
                                      {booking.user.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                              
                              {/* Payment Info */}
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(booking.amount)}
                                </span>
                                <Badge variant={booking.paymentMode === 'ONLINE' ? 'default' : 'secondary'}>
                                  {booking.paymentMode}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}

          {/* Dashboard View - Stats */}
          {!isServicesTab && !isCalendarTab && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                          </div>
                          <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={24} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks to manage your business</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button variant="gradient" onClick={() => navigate('/dashboard/organizer/create')}>
                      <Plus size={18} className="mr-2" />
                      Create New Service
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/dashboard/organizer?tab=services')}>
                      <FileText size={18} className="mr-2" />
                      View All Services
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Services View */}
          {isServicesTab && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {myServices.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first service to start accepting bookings.</p>
                    <Button variant="gradient" onClick={() => navigate('/dashboard/organizer/create')}>
                      <Plus size={18} />
                      Create Service
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {myServices.map((service) => (
                    <Card key={service.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle>{service.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                          </div>
                          <Badge variant={service.isPublished ? 'default' : 'secondary'}>
                            {service.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{formatCurrency(service.price)}</span>
                          <span className="text-sm text-muted-foreground">{service.slotDuration} min slots</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            {service.isPublished ? (
                              <Eye size={16} className="text-muted-foreground" />
                            ) : (
                              <EyeOff size={16} className="text-muted-foreground" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {service.isPublished ? 'Published' : 'Unpublished'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={service.isPublished}
                              onCheckedChange={(checked) => handlePublishToggle(service.id, checked)}
                            />
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyServiceUrl(service.id)}
                              >
                                {copiedServiceId === service.id ? (
                                  <>
                                    <Check size={14} className="mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} className="mr-1" />
                                    Copy URL
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy service URL to share</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSlotUrlModal(service)}
                                disabled={!service.isPublished}
                              >
                                <Link2 size={14} className="mr-1" />
                                Slot URL
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{service.isPublished ? 'Generate URL for specific date and slot' : 'Publish service to generate slot URLs'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/organizer/edit/${service.id}`)}
                          >
                            <Pencil size={14} className="mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === service.id}
                              >
                                {deletingId === service.id ? (
                                  <Loader2 size={14} className="mr-1 animate-spin" />
                                ) : (
                                  <Trash2 size={14} className="mr-1" />
                                )}
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Service</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{service.name}"? This action cannot be undone and will also delete all associated slots and bookings.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteService(service.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Slot URL Modal */}
      <Dialog open={showSlotUrlModal} onOpenChange={setShowSlotUrlModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Slot Booking URL</DialogTitle>
            <DialogDescription>
              Select a date and time slot to generate a direct booking link
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : serviceSlots.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No available slots found for this service.</p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar size={16} className="mr-2" />
                      {selectedSlotUrlDate ? format(selectedSlotUrlDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedSlotUrlDate}
                      onSelect={handleSlotUrlDateChange}
                      disabled={(date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        return !getAvailableDates().some(d => format(d, 'yyyy-MM-dd') === dateStr);
                      }}
                      fromDate={selectedServiceForSlotUrl ? new Date(selectedServiceForSlotUrl.startDate) : undefined}
                      toDate={selectedServiceForSlotUrl ? new Date(selectedServiceForSlotUrl.endDate) : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Slot Selection */}
              {selectedSlotUrlDate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <Label>Select Time Slot</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {getSlotsForSelectedDate().map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotUrlSlot(slot.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                          selectedSlotUrlSlot === slot.id
                            ? "ring-2 ring-primary ring-offset-2 bg-primary/10 border-primary"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="text-center">
                          <div className="font-semibold">{formatTime(slot.startTime)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(slot.endTime)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {getSlotsForSelectedDate().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No available slots for this date
                    </p>
                  )}
                </motion.div>
              )}

              {/* URL Preview */}
              {selectedSlotUrlDate && selectedSlotUrlSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <Label>Generated URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={handleGenerateSlotUrl() || ''}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={handleCopySlotUrl}
                      variant={slotUrlCopied ? "default" : "outline"}
                      size="icon"
                    >
                      {slotUrlCopied ? (
                        <Check size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Users opening this URL will see the selected date and slot pre-selected, with payment options ready.
                  </p>
                </motion.div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSlotUrlModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
