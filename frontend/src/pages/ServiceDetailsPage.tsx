import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Clock, MapPin, User, CreditCard, 
  Wallet, CheckCircle2, XCircle, Download, Loader2, Smartphone, DollarSign
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, formatDate, formatTime } from '@/lib/helpers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PaymentMode, SlotStatus, Service, TimeSlot } from '@/types';
import { bookingsApi } from '@/lib/api';
import MapWidget from '@/components/maps/MapWidget';
import MapModal from '@/components/maps/MapModal';

export default function ServiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchServiceById, holdSlot, confirmBooking, cancelHold, downloadReceipt } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [allDatesSlots, setAllDatesSlots] = useState<Record<string, TimeSlot[]>>({}); // Preserved for date picker
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('online');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [holdExpiry, setHoldExpiry] = useState<string | null>(null);
  const [isDirectBooking, setIsDirectBooking] = useState(false); // Track if opened via URL params
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false); // Prevent duplicate processing

  // Fetch service on mount
  useEffect(() => {
    const loadService = async () => {
      if (!id) return;
      setIsLoadingService(true);
      const result = await fetchServiceById(id);
      if (result) {
        setService(result.service);
        setSlotsByDate(result.slotsByDate);
        setAllDatesSlots(result.slotsByDate); // Preserve all slots for date picker
      }
      setIsLoadingService(false);
    };
    loadService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only re-run when id changes, not fetchServiceById

  // Handle URL parameters for direct booking
  useEffect(() => {
    if (!service || isLoadingService || urlParamsProcessed) return;

    const urlDate = searchParams.get('date');
    const urlSlot = searchParams.get('slot');

    if (urlDate && urlSlot) {
      setUrlParamsProcessed(true); // Mark as processed to prevent duplicate runs
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(urlDate)) {
        toast({
          title: 'Invalid Date',
          description: 'The date in the URL is invalid. Please select a date manually.',
          variant: 'destructive',
        });
        setSearchParams({});
        return;
      }

      // Parse and validate date
      const parsedDate = new Date(urlDate + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) {
        toast({
          title: 'Invalid Date',
          description: 'The date in the URL is invalid. Please select a date manually.',
          variant: 'destructive',
        });
        setSearchParams({});
        return;
      }

      // Normalize dates to compare only date part (ignore time/timezone)
      const normalizeDate = (date: Date | string): Date => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };

      // Check if date is within service range
      const serviceStartDate = normalizeDate(service.startDate);
      const serviceEndDate = normalizeDate(service.endDate);
      const normalizedParsedDate = normalizeDate(parsedDate);
      
      if (normalizedParsedDate < serviceStartDate || normalizedParsedDate > serviceEndDate) {
        toast({
          title: 'Date Out of Range',
          description: 'The selected date is not available for this service.',
          variant: 'destructive',
        });
        setSearchParams({});
        return;
      }

      // Check if date is in the past
      const today = normalizeDate(new Date());
      if (normalizedParsedDate < today) {
        toast({
          title: 'Past Date',
          description: 'Cannot book slots for past dates.',
          variant: 'destructive',
        });
        setSearchParams({});
        return;
      }

      // Set the date and fetch slots
      setSelectedDate(parsedDate);
      setIsDirectBooking(true);

      // Fetch slots for the selected date
      const loadSlotsForDate = async () => {
        const dateStr = format(parsedDate, 'yyyy-MM-dd');
        const result = await fetchServiceById(id!, dateStr);
        if (result) {
          setSlotsByDate(result.slotsByDate);
          
          // Find and validate the slot
          const allSlots = Object.values(result.slotsByDate).flat();
          const slot = allSlots.find(s => s.id === urlSlot && s.date === dateStr);
          
          if (!slot) {
            toast({
              title: 'Slot Not Found',
              description: 'The selected slot is not available. Please select another slot.',
              variant: 'destructive',
            });
            setSearchParams({});
            return;
          }

          if (slot.status !== 'available') {
            toast({
              title: 'Slot Unavailable',
              description: 'The selected slot is no longer available. Please select another slot.',
              variant: 'destructive',
            });
            setSearchParams({});
            return;
          }

          // Set the slot and open payment dialog
          setSelectedSlot(slot.id);
          setShowPaymentDialog(true);
        }
      };

      loadSlotsForDate();
    } else {
      // Reset processed flag if no URL params
      setUrlParamsProcessed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, isLoadingService, searchParams, urlParamsProcessed]);

  // Fetch slots when date changes (but not when set from URL params)
  useEffect(() => {
    const loadSlots = async () => {
      if (!id || !selectedDate || isDirectBooking) return; // Skip if direct booking (handled in URL param effect)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const result = await fetchServiceById(id, dateStr);
      if (result) {
        setSlotsByDate(result.slotsByDate);
      }
    };
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedDate, isDirectBooking]); // Only re-run when id or selectedDate changes

  // Get all slots for rendering
  const allSlots = Object.values(slotsByDate).flat();

  if (isLoadingService) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/user')} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back to Services
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Service Not Found</h3>
            <p className="text-muted-foreground">The service you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter slots by selected date
  const dateSlots = selectedDate
    ? allSlots.filter(slot => slot.date === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  // Group slots by time
  const sortedSlots = [...dateSlots].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  );

  const getSlotStatusColor = (status: SlotStatus) => {
    switch (status) {
      case 'available':
        return 'bg-available/20 text-available border-available/50 hover:bg-available/30';
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-400 cursor-not-allowed hover:bg-yellow-200';
      case 'booked':
        return 'bg-muted text-muted-foreground border-muted-foreground/30 cursor-not-allowed opacity-60';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/30 cursor-not-allowed opacity-60';
    }
  };

  const getSlotStatusLabel = (status: SlotStatus) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'hold':
        return 'On Hold';
      case 'booked':
        return 'Booked';
      default:
        return 'Unavailable';
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !user) return;

    setIsBooking(true);
    
    try {
      // If payment mode is ONLINE (PhonePe), use the new flow
      if (paymentMode === 'online') {
        // Initiate PhonePe payment - this creates pending booking and holds slot
        const response = await bookingsApi.initiatePayment(selectedSlot);
        
        if (response.data.success && response.data.redirectUrl) {
          toast({
            title: 'Redirecting to Payment',
            description: 'You will be redirected to PhonePe to complete payment.',
          });
          
          // Redirect to PhonePe payment page
          window.location.href = response.data.redirectUrl;
          return;
        } else {
          toast({
            title: 'Payment Initiation Failed',
            description: 'Could not initiate payment. Please try again.',
            variant: 'destructive',
          });
          setIsBooking(false);
          setShowPaymentDialog(false);
          return;
        }
      }
      
      // For CASH payment, use the existing flow
      // First hold the slot
      const holdResult = await holdSlot(selectedSlot);
      if (!holdResult.success) {
        toast({
          title: 'Unable to Hold Slot',
          description: holdResult.error || 'This slot may no longer be available.',
          variant: 'destructive',
        });
        setIsBooking(false);
        setShowPaymentDialog(false);
        return;
      }
      
      setHoldExpiry(holdResult.holdExpiry || null);
      
      // Now confirm the booking with CASH payment
      const bookingResult = await confirmBooking(selectedSlot, paymentMode);
      
      if (bookingResult.success && bookingResult.booking) {
        // Download receipt
        const receiptBlob = await downloadReceipt(bookingResult.booking.id);
        if (receiptBlob) {
          const url = window.URL.createObjectURL(receiptBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${bookingResult.booking.id}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
        
        toast({
          title: 'Booking Successful!',
          description: 'Your slot has been booked and receipt downloaded.',
        });
        
        // Reset selections
        setSelectedSlot(null);
        setSelectedDate(undefined);
        setShowPaymentDialog(false);
        
        // Navigate back after a delay
        setTimeout(() => {
          navigate('/dashboard/user?tab=bookings');
        }, 2000);
      } else {
        // Cancel the hold if booking fails
        await cancelHold(selectedSlot);
        toast({
          title: 'Booking Failed',
          description: bookingResult.error || 'Unable to complete booking. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
    
    setIsBooking(false);
    setShowPaymentDialog(false);
  };

  // Use preserved allDatesSlots for available dates calculation
  const allSlotsForDates = Object.values(allDatesSlots).flat();
  const availableDates = Array.from(
    new Set(allSlotsForDates.filter(s => s.status === 'available').map(s => s.date))
  )
    .map(date => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/user')}>
          <ArrowLeft size={20} />
        </Button>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">{service.name}</h1>
          <p className="text-muted-foreground">By {service.organizerName}</p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Service Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <Card>
            <div className="h-64 md:h-96 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center rounded-t-lg">
              {service.imageUrl ? (
                <img 
                  src={service.imageUrl} 
                  alt={service.name}
                  className="w-full h-full object-cover rounded-t-lg"
                />
              ) : (
                <Calendar className="w-24 h-24 text-primary/30" />
              )}
            </div>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{service.slotDuration} minutes</span>
                </div>
                {service.latitude && service.longitude && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {service.address || service.city || `${service.latitude.toFixed(4)}, ${service.longitude.toFixed(4)}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">
                    {formatDate(service.startDate)} - {formatDate(service.endDate)}
                  </span>
                </div>
              </div>

              {/* Map Widget */}
              {service.latitude && service.longitude && (
                <MapWidget
                  latitude={service.latitude}
                  longitude={service.longitude}
                  address={service.address}
                  city={service.city}
                  onClick={() => setShowMapModal(true)}
                />
              )}
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Choose a date to view available slots</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar size={16} className="mr-2" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      return !availableDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                    }}
                    fromDate={new Date(service.startDate)}
                    toDate={new Date(service.endDate)}
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Slots Grid */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Time Slots</CardTitle>
                  <CardDescription>
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')} • Select an available slot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No slots available for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {sortedSlots.map((slot) => (
                        <motion.button
                          key={slot.id}
                          whileHover={slot.status === 'available' ? { scale: 1.05 } : {}}
                          whileTap={slot.status === 'available' ? { scale: 0.95 } : {}}
                          onClick={() => {
                            if (slot.status === 'available') {
                              setSelectedSlot(slot.id);
                              setShowPaymentDialog(true);
                            }
                          }}
                          disabled={slot.status !== 'available'}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-sm font-medium relative
                            ${selectedSlot === slot.id ? 'ring-2 ring-primary ring-offset-2' : ''}
                            ${getSlotStatusColor(slot.status)}
                            ${slot.status === 'available' ? 'cursor-pointer' : 'cursor-not-allowed'}
                          `}
                        >
                          {slot.status === 'booked' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-[1px] bg-muted-foreground/40 rotate-[-15deg]" />
                            </div>
                          )}
                          <div className="text-center">
                            <div className={`font-semibold ${slot.status !== 'available' ? 'line-through opacity-70' : ''}`}>
                              {formatTime(slot.startTime)}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {getSlotStatusLabel(slot.status)}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column - Booking Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{service.slotDuration} min</span>
                </div>
                {selectedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{format(selectedDate, 'MMM d, yyyy')}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {formatTime(sortedSlots.find(s => s.id === selectedSlot)?.startTime || '')} - 
                      {formatTime(sortedSlots.find(s => s.id === selectedSlot)?.endTime || '')}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(service.price)}
                  </span>
                </div>
              </div>
              {!selectedDate && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Select a date to book
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setIsDirectBooking(false);
          setUrlParamsProcessed(false);
          // Clear URL parameters when closing
          if (isDirectBooking) {
            setSearchParams({});
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              {isDirectBooking 
                ? 'Complete your booking by selecting a payment method'
                : "Choose how you'd like to pay for this booking"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Enhanced Booking Details for Direct Booking */}
          {isDirectBooking && selectedDate && selectedSlot && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4">
              <h4 className="font-semibold text-sm mb-3">Booking Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs">Date</div>
                    <div className="font-medium">{format(selectedDate, 'PPP')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs">Time</div>
                    <div className="font-medium">
                      {formatTime(sortedSlots.find(s => s.id === selectedSlot)?.startTime || '')} - 
                      {formatTime(sortedSlots.find(s => s.id === selectedSlot)?.endTime || '')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs">Duration</div>
                    <div className="font-medium">{service.slotDuration} minutes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs">Price</div>
                    <div className="font-medium">{formatCurrency(service.price)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <RadioGroup value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-purple-600" />
                    <div>
                      <div className="font-medium">Pay with PhonePe</div>
                      <div className="text-sm text-muted-foreground">
                        UPI, Cards, Wallets & Net Banking
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Wallet size={20} className="text-primary" />
                    <div>
                      <div className="font-medium">Cash Payment</div>
                      <div className="text-sm text-muted-foreground">
                        Pay at the service location
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold">{formatCurrency(service.price)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPaymentDialog(false);
              setIsDirectBooking(false);
              setUrlParamsProcessed(false);
              if (isDirectBooking) {
                setSearchParams({});
              }
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBookSlot} 
              disabled={isBooking}
              className="min-w-[120px]"
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Modal */}
      {service.latitude && service.longitude && (
        <MapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          destination={{
            latitude: service.latitude,
            longitude: service.longitude,
            address: service.address,
            name: service.name,
          }}
        />
      )}
    </div>
  );
}

