import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, X, MapPin, Upload, Image as ImageIcon,
  Clock, Calendar, DollarSign, FileText, Save, Loader2
} from 'lucide-react';
import { serviceSchema, ServiceFormData, dayScheduleSchema } from '@/lib/schemas';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { uploadApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DaySchedule, BreakTime } from '@/types';
import { formatCurrency } from '@/lib/helpers';

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || '';

interface AutocompleteResult {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
  };
}

export default function CreateServicePage() {
  const navigate = useNavigate();
  const { createService } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormData & { schedule?: DaySchedule[] }>({
    resolver: zodResolver(serviceSchema),
    mode: 'onChange',
    defaultValues: {
      schedule: DAYS_OF_WEEK.map(day => ({
        day,
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        breaks: [],
      })),
    },
  });

  const schedule = watch('schedule') || DAYS_OF_WEEK.map(day => ({
    day,
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  }));
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const slotDuration = watch('slotDuration');
  const price = watch('price');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    setIsUploading(true);
    try {
      const response = await uploadApi.uploadImage(file);
      setUploadedImageUrl(response.data.image.url);
      toast({
        title: 'Image Uploaded',
        description: 'Image uploaded successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2 || !GEOAPIFY_KEY) {
      setAutocompleteResults([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_KEY}&limit=5&filter=countrycode:in`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setAutocompleteResults(data.features || []);
      setShowAutocomplete(true);
    } catch (error) {
      console.error('Location search error:', error);
      setAutocompleteResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(value);
      }, 300);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  };

  const selectLocation = (result: AutocompleteResult) => {
    const { formatted, lat, lon } = result.properties;
    setLocationSearch(formatted);
    setValue('latitude', lat);
    setValue('longitude', lon);
    setShowAutocomplete(false);
    setAutocompleteResults([]);
    toast({
      title: 'Location Selected',
      description: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        setIsGettingLocation(false);
        
        // Reverse geocode to get address
        if (GEOAPIFY_KEY) {
          try {
            const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
              setLocationSearch(data.features[0].properties.formatted);
            } else {
              setLocationSearch(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch {
            setLocationSearch(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } else {
          setLocationSearch(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }

        toast({
          title: 'Location Detected',
          description: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = error.message || 'An unknown error occurred.';
            break;
        }
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const toggleDay = (dayIndex: number) => {
    const currentSchedule = schedule || [];
    const newSchedule = [...currentSchedule];
    if (newSchedule[dayIndex]) {
      newSchedule[dayIndex].enabled = !newSchedule[dayIndex].enabled;
      setValue('schedule', newSchedule, { shouldValidate: true });
    }
  };

  const updateDayTime = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const currentSchedule = schedule || [];
    const newSchedule = [...currentSchedule];
    if (newSchedule[dayIndex]) {
      newSchedule[dayIndex][field] = value;
      setValue('schedule', newSchedule, { shouldValidate: true });
    }
  };

  const addBreak = (dayIndex: number) => {
    const currentSchedule = schedule || [];
    const newSchedule = [...currentSchedule];
    if (newSchedule[dayIndex]) {
      const newBreak: BreakTime = {
        id: `break-${Date.now()}-${Math.random()}`,
        startTime: '12:00',
        endTime: '13:00',
      };
      newSchedule[dayIndex].breaks.push(newBreak);
      setValue('schedule', newSchedule, { shouldValidate: true });
    }
  };

  const removeBreak = (dayIndex: number, breakIndex: number) => {
    const currentSchedule = schedule || [];
    const newSchedule = [...currentSchedule];
    if (newSchedule[dayIndex] && newSchedule[dayIndex].breaks[breakIndex]) {
      newSchedule[dayIndex].breaks.splice(breakIndex, 1);
      setValue('schedule', newSchedule, { shouldValidate: true });
    }
  };

  const updateBreakTime = (
    dayIndex: number,
    breakIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const currentSchedule = schedule || [];
    const newSchedule = [...currentSchedule];
    if (newSchedule[dayIndex] && newSchedule[dayIndex].breaks[breakIndex]) {
      newSchedule[dayIndex].breaks[breakIndex][field] = value;
      setValue('schedule', newSchedule, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ServiceFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current schedule from the watched value (it's managed separately from form schema)
      const currentSchedule = schedule;

      // Validate required fields
      if (!data.name || !data.description || !data.slotDuration || !data.price || !data.startDate || !data.endDate) {
        toast({
          title: 'Missing Required Fields',
          description: 'Please fill in all required fields.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Validate schedule exists and is an array
      if (!currentSchedule || !Array.isArray(currentSchedule) || currentSchedule.length === 0) {
        toast({
          title: 'Invalid Schedule',
          description: 'Schedule data is missing or invalid. Please ensure schedule is properly initialized.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Validate schedule
      const enabledDays = currentSchedule.filter(d => d && d.enabled);
      if (enabledDays.length === 0) {
        toast({
          title: 'Schedule Required',
          description: 'Please enable at least one day in the schedule.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Validate each enabled day
      for (const day of enabledDays) {
        const result = dayScheduleSchema.safeParse(day);
        if (!result.success) {
          toast({
            title: 'Invalid Schedule',
            description: result.error.errors[0].message,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Validate latitude/longitude if provided
      const latitude = data.latitude !== undefined && !isNaN(data.latitude) ? data.latitude : undefined;
      const longitude = data.longitude !== undefined && !isNaN(data.longitude) ? data.longitude : undefined;

      // Validate that if one coordinate is provided, both should be
      if ((latitude !== undefined && longitude === undefined) || (latitude === undefined && longitude !== undefined)) {
        toast({
          title: 'Invalid Location',
          description: 'Please provide both latitude and longitude, or leave both empty.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Build per-day schedule configuration
      const days = enabledDays.map((day) => ({
        dayOfWeek: DAYS_OF_WEEK.indexOf(day.day), // Convert day name to index (0-6)
        startTime: day.startTime,
        endTime: day.endTime,
        breaks: day.breaks.map((brk) => ({
          start: brk.startTime,
          end: brk.endTime,
        })),
      }));

      // Create service via API
      const result = await createService({
        title: data.name,
        description: data.description,
        category: 'General', // Default category
        price: data.price,
        imageUrl: uploadedImageUrl || undefined,
        latitude,
        longitude,
        published: data.isPublished,
        schedule: {
          startDate: data.startDate,
          endDate: data.endDate,
          slotDuration: data.slotDuration,
          days,
        },
      });

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create service',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Service Created!',
        description: 'Your service has been created and slots generated.',
      });

      setTimeout(() => {
        navigate('/dashboard/organizer');
      }, 1500);
    } catch (error) {
      console.error('Error creating service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to create service: ${errorMessage}. Please check the console for details.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/organizer')}>
          <ArrowLeft size={20} />
        </Button>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">Create Service</h1>
          <p className="text-muted-foreground">Add a new service to your offerings</p>
        </motion.div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Basic Information
            </CardTitle>
            <CardDescription>Enter the basic details of your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Yoga Class, Consultation"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.name.message}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your service in detail..."
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.description.message}
                </motion.p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slotDuration">Slot Duration (minutes) *</Label>
                <Input
                  id="slotDuration"
                  type="number"
                  min="1"
                  placeholder="30"
                  {...register('slotDuration', { 
                    valueAsNumber: true,
                    validate: (value) => {
                      if (isNaN(value) || value <= 0) {
                        return 'Slot duration must be a positive number';
                      }
                      return true;
                    }
                  })}
                  className={errors.slotDuration ? 'border-destructive' : ''}
                />
                {errors.slotDuration && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.slotDuration.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price per Slot (₹) *</Label>
                <Controller
                  name="price"
                  control={control}
                  rules={{
                    validate: (value) => {
                      if (isNaN(value) || value <= 0) {
                        return 'Price must be greater than 0';
                      }
                      return true;
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="500.00"
                      value={isNaN(field.value) ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      className={errors.price ? 'border-destructive' : ''}
                    />
                  )}
                />
                {errors.price && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.price.message}
                  </motion.p>
                )}
                {price && !isNaN(price) && price > 0 && !errors.price && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(price)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon size={20} />
              Service Image
            </CardTitle>
            <CardDescription>Upload an image for your service (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="image" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                    <Upload size={18} />
                    <span>Choose Image</span>
                  </div>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </Label>
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading image...
                </div>
              )}
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-48 rounded-lg overflow-hidden border"
                >
                  <img
                    src={imagePreview}
                    alt="Service preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagePreview(null);
                      setUploadedImageUrl(null);
                      // Reset the file input
                      const fileInput = document.getElementById('image') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    <X size={16} />
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Service Period
            </CardTitle>
            <CardDescription>When is this service available?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar size={16} className="mr-2" />
                          {field.value ? format(new Date(field.value), 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.startDate?.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar size={16} className="mr-2" />
                          {field.value ? format(new Date(field.value), 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => {
                            if (!startDate) return date < new Date();
                            return date < new Date() || date <= new Date(startDate);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.endDate?.message}
                  </motion.p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              Location
            </CardTitle>
            <CardDescription>Set the service location (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search for a location..."
                  value={locationSearch}
                  onChange={handleLocationInputChange}
                  onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
                  className="pr-8"
                />
                {isSearchingLocation && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}

                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 truncate"
                        onClick={() => selectLocation(result)}
                      >
                        {result.properties.formatted}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Detect Current
                  </>
                )}
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="text"
                  inputMode="decimal"
                  placeholder="28.6139"
                  {...register('latitude', { 
                    setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                  })}
                />
                {errors.latitude && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.latitude.message}
                  </motion.p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="text"
                  inputMode="decimal"
                  placeholder="77.2090"
                  {...register('longitude', { 
                    setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                  })}
                />
                {errors.longitude && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.longitude.message}
                  </motion.p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Schedule Builder
            </CardTitle>
            <CardDescription>
              Configure available days and times. Slots will be automatically generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const daySchedule = schedule[dayIndex];
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={daySchedule.enabled}
                        onCheckedChange={() => toggleDay(dayIndex)}
                      />
                      <Label className="font-medium cursor-pointer">{day}</Label>
                    </div>
                  </div>

                  {daySchedule.enabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pl-8"
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={daySchedule.startTime}
                            onChange={(e) => updateDayTime(dayIndex, 'startTime', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={daySchedule.endTime}
                            onChange={(e) => updateDayTime(dayIndex, 'endTime', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Break Times */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Break Hours</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBreak(dayIndex)}
                          >
                            <Plus size={14} className="mr-1" />
                            Add Break
                          </Button>
                        </div>
                        {daySchedule.breaks.map((breakTime, breakIndex) => (
                          <motion.div
                            key={breakTime.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <Input
                              type="time"
                              value={breakTime.startTime}
                              onChange={(e) =>
                                updateBreakTime(dayIndex, breakIndex, 'startTime', e.target.value)
                              }
                              className="flex-1"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={breakTime.endTime}
                              onChange={(e) =>
                                updateBreakTime(dayIndex, breakIndex, 'endTime', e.target.value)
                              }
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBreak(dayIndex, breakIndex)}
                            >
                              <X size={16} />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        {/* Publish Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>
              Published services are visible to users. Unpublished services are drafts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isPublished" className="font-medium">
                  Publish Service
                </Label>
                <p className="text-sm text-muted-foreground">
                  Make this service visible to users
                </p>
              </div>
              <Controller
                name="isPublished"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isPublished"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/organizer')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Service
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

