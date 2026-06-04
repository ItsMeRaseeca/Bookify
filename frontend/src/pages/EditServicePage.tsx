import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Upload, X, MapPin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { uploadApi, organizerApi } from '@/lib/api';
import { Controller } from 'react-hook-form';

// Edit schema - simpler than create since we can't edit schedule
const editServiceSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters').max(100, 'Service name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  price: z.number().min(0, 'Price must be positive'),
  latitude: z.number().min(-90).max(90).optional().or(z.nan().transform(() => undefined)),
  longitude: z.number().min(-180).max(180).optional().or(z.nan().transform(() => undefined)),
  isPublished: z.boolean(),
});

type EditServiceFormData = z.infer<typeof editServiceSchema>;

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateService, publishService } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [originalService, setOriginalService] = useState<any>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useForm<EditServiceFormData>({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isPublished: false,
    },
  });

  useEffect(() => {
    const loadService = async () => {
      if (!id) return;
      
      try {
        const response = await organizerApi.getService(id);
        const service = response.data.service;
        setOriginalService(service);
        
        reset({
          name: service.title,
          description: service.description,
          price: service.price,
          latitude: service.latitude || undefined,
          longitude: service.longitude || undefined,
          isPublished: service.published,
        });
        
        if (service.imageUrl) {
          setImagePreview(service.imageUrl);
          setUploadedImageUrl(service.imageUrl);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load service details',
          variant: 'destructive',
        });
        navigate('/dashboard/organizer');
      } finally {
        setIsLoading(false);
      }
    };

    loadService();
  }, [id, reset, navigate, toast]);

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
      (position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
        setIsGettingLocation(false);
        toast({
          title: 'Location Detected',
          description: `Coordinates: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: 'Location Error',
          description: 'Unable to retrieve your location.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const onSubmit = async (data: EditServiceFormData) => {
    if (!id) return;

    setIsSubmitting(true);

    try {
      // Update service details
      const result = await updateService(id, {
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: uploadedImageUrl || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update service',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Update publish status if changed
      if (data.isPublished !== originalService?.published) {
        await publishService(id, data.isPublished);
      }

      toast({
        title: 'Service Updated!',
        description: 'Your service has been updated successfully.',
      });

      setTimeout(() => {
        navigate('/dashboard/organizer');
      }, 1000);
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/organizer')}
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-2">Edit Service</h1>
        <p className="text-muted-foreground">Update your service details</p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update service name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Yoga Class, Dental Checkup"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your service..."
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price per Slot (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="500"
                {...register('price', { valueAsNumber: true })}
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image */}
        <Card>
          <CardHeader>
            <CardTitle>Service Image</CardTitle>
            <CardDescription>Update your service image (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="flex-1"
                  disabled={isUploading}
                />
              </div>
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
                    const fileInput = document.getElementById('image') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <X size={16} />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Update service location (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Auto-detect Location
            </Button>

            <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-sm text-destructive">{String(errors.latitude.message)}</p>
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
                  <p className="text-sm text-destructive">{String(errors.longitude.message)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Publish Status */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
            <CardDescription>Control whether users can see this service</CardDescription>
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

        {/* Note about schedule */}
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Service schedule (dates, times, slot duration) cannot be edited after creation. 
              If you need to change the schedule, please delete this service and create a new one.
            </p>
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
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
