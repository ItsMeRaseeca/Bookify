import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Check } from 'lucide-react';
import { profileUpdateSchema, ProfileUpdateData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name || '',
    },
  });

  const onSubmit = async (data: ProfileUpdateData) => {
    setIsLoading(true);
    try {
      const result = await updateProfile(data.name);
      if (result.success) {
        setShowSuccess(true);
        toast({
          title: 'Profile Updated',
          description: 'Your name has been updated successfully.',
        });
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        toast({
          title: 'Update Failed',
          description: result.error || 'Failed to update profile.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels = {
    user: 'User',
    organizer: 'Organizer',
    admin: 'Administrator',
  };

  const roleColors = {
    user: 'bg-primary-muted text-primary',
    organizer: 'bg-accent/20 text-accent',
    admin: 'bg-available/20 text-available',
  };

  if (!user) return null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6 py-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 w-full">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Check className="w-5 h-5 text-available" />
                    </motion.div>
                  )}
                </div>
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

              <LoadingButton
                type="submit"
                loading={isLoading}
                disabled={!isValid || !isDirty}
              >
                Save Changes
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              These details cannot be changed
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg w-full min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-muted flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg w-full min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-muted flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium truncate">{user.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg w-full min-w-0 md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-primary-muted flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    {roleLabels[user.role]}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
