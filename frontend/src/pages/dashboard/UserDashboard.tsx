import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Loader2, RefreshCw, Download } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatTime } from '@/lib/helpers';
import { Booking, Service } from '@/types';
import { bookingsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { services, isLoading, fetchServices, fetchUserBookings } = useApp();
  const { user } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  
  // Check if we're on the bookings tab
  const isBookingsTab = searchParams.get('tab') === 'bookings';
  
  const publishedServices = services.filter(s => s.isPublished);

  // Fetch services on mount (only if on services tab)
  useEffect(() => {
    if (!isBookingsTab) {
      fetchServices();
    }
  }, [isBookingsTab]);

  // Fetch user bookings (only if on bookings tab)
  useEffect(() => {
    const loadBookings = async () => {
      if (!user || !isBookingsTab) return;
      setIsLoadingBookings(true);
      const userBookings = await fetchUserBookings();
      
      // Sort bookings: upcoming first (ascending by date and time)
      const sortedBookings = [...userBookings].sort((a, b) => {
        // If either booking doesn't have slot info, put it at the end
        if (!a.slot && !b.slot) return 0;
        if (!a.slot) return 1;
        if (!b.slot) return -1;
        
        // Compare dates first
        const dateA = new Date(a.slot.date);
        const dateB = new Date(b.slot.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime(); // Ascending by date
        }
        
        // If same date, compare by start time
        return a.slot.startTime.localeCompare(b.slot.startTime);
      });
      
      setBookings(sortedBookings);
      setIsLoadingBookings(false);
    };
    loadBookings();
  }, [user, isBookingsTab]);

  const handleRefresh = () => {
    if (isBookingsTab) {
      const loadBookings = async () => {
        if (!user) return;
        setIsLoadingBookings(true);
        const userBookings = await fetchUserBookings();
        
        // Sort bookings: upcoming first (ascending by date and time)
        const sortedBookings = [...userBookings].sort((a, b) => {
          // If either booking doesn't have slot info, put it at the end
          if (!a.slot && !b.slot) return 0;
          if (!a.slot) return 1;
          if (!b.slot) return -1;
          
          // Compare dates first
          const dateA = new Date(a.slot.date);
          const dateB = new Date(b.slot.date);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime(); // Ascending by date
          }
          
          // If same date, compare by start time
          return a.slot.startTime.localeCompare(b.slot.startTime);
        });
        
        setBookings(sortedBookings);
        setIsLoadingBookings(false);
      };
      loadBookings();
    } else {
      fetchServices();
    }
  };

  const handleDownloadReceipt = async (bookingId: string) => {
    try {
      const response = await bookingsApi.downloadReceipt(bookingId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{isBookingsTab ? 'My Bookings' : 'Browse Services'}</h1>
          <p className="text-muted-foreground">
            {isBookingsTab ? 'View and manage your bookings' : 'Find and book services near you'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isLoadingBookings}>
          <RefreshCw size={16} className={`mr-2 ${(isLoading || isLoadingBookings) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Browse Services View */}
      {!isBookingsTab && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : publishedServices.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Services Available</h3>
                <p className="text-muted-foreground">Check back later for new services.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden group">
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <Calendar className="w-16 h-16 text-primary/50 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{service.slotDuration} min</span>
                        </div>
                        {service.latitude && (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            <span>Location set</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(service.price)}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`/service/${service.id}`)}
                        >
                          Book Now
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">By {service.organizerName}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Bookings View */}
      {isBookingsTab && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isLoadingBookings ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-muted-foreground mb-4">You haven't made any bookings yet.</p>
                <Button onClick={() => navigate('/dashboard/user')}>
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{booking.service?.title || 'Service'}</h3>
                        {booking.slot && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>{new Date(booking.slot.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              <span>{formatTime(booking.slot.startTime)} - {formatTime(booking.slot.endTime)}</span>
                            </div>
                          </div>
                        )}
                        {booking.service?.city && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin size={14} />
                            <span>{booking.service.city}{booking.service.state ? `, ${booking.service.state}` : ''}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
                        <Badge variant={booking.paymentStatus === 'success' ? 'default' : 'secondary'}>
                          {booking.paymentStatus === 'success' ? 'Confirmed' : booking.paymentStatus}
                        </Badge>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(booking.amount)}
                        </p>
                        {booking.paymentStatus === 'success' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReceipt(booking.id)}
                          >
                            <Download size={14} className="mr-1" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
