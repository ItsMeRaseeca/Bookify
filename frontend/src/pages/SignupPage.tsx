import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { signupSchema, SignupFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DotMap } from '@/components/ui/dot-map';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      role: 'user',
    },
  });

  const password = watch('password', '');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    const result = await signup({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      password: data.password,
    });
    setIsLoading(false);

    if (result.success) {
      navigate('/verify-otp');
    } else {
      toast({
        title: 'Signup Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background dark:bg-gradient-to-br dark:from-[#060818] dark:to-[#0d1023] p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl overflow-hidden rounded-2xl flex bg-card dark:bg-[#090b13] text-card-foreground dark:text-white shadow-2xl min-h-[600px] border border-border dark:border-none"
      >
        {/* Left side - Map & Branding */}
        <div className="hidden lg:block w-1/2 relative overflow-hidden border-r border-[#1f2130]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f1120] to-[#151929]">
            <DotMap />

            {/* Logo and text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mb-6"
              >
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500"
              >
                Bookify
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-base text-center text-gray-400 max-w-sm"
              >
                Seamless scheduling, effortless booking.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col relative">
          <div className="absolute top-6 right-6 flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ArrowLeft size={16} /> Back
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground dark:text-white">Create Account</h1>
              <p className="text-muted-foreground dark:text-gray-400 mb-8">Join us today</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Full Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    {...register('name')}
                    placeholder="John Doe"
                    className="bg-background dark:bg-[#13151f] border-input dark:border-[#2a2d3a] placeholder:text-muted-foreground dark:placeholder:text-gray-500 text-foreground dark:text-gray-200 w-full focus-visible:ring-primary/50"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Email <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="you@example.com"
                    className="bg-background dark:bg-[#13151f] border-input dark:border-[#2a2d3a] placeholder:text-muted-foreground dark:placeholder:text-gray-500 text-foreground dark:text-gray-200 w-full focus-visible:ring-primary/50"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Mobile Number <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="9876543210"
                    className="bg-background dark:bg-[#13151f] border-input dark:border-[#2a2d3a] placeholder:text-muted-foreground dark:placeholder:text-gray-500 text-foreground dark:text-gray-200 w-full focus-visible:ring-primary/50"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <Label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                    I want to <span className="text-primary">*</span>
                  </Label>
                  <RadioGroup
                    value={watch('role')}
                    onValueChange={(value) => setValue('role', value as 'user' | 'organizer', { shouldValidate: true })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user" className="cursor-pointer text-foreground dark:text-gray-300">
                        Book Services
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="organizer" id="organizer" />
                      <Label htmlFor="organizer" className="cursor-pointer text-foreground dark:text-gray-300">
                        Offer Services
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.role && (
                    <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Password <span className="text-primary">*</span>
                  </Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(value) => setValue('password', value, { shouldValidate: true })}
                    placeholder="Create a strong password"
                    showStrength={true}
                    error={errors.password?.message}
                    className="bg-background dark:bg-[#13151f] border-input dark:border-[#2a2d3a] placeholder:text-muted-foreground dark:placeholder:text-gray-500 text-foreground dark:text-gray-200 w-full focus-visible:ring-primary/50"
                  />
                </div>

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onHoverStart={() => setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  className="pt-4"
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full bg-gradient-to-r relative overflow-hidden from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-6 rounded-lg transition-all duration-300 font-medium text-lg border-0",
                      isHovered ? "shadow-lg shadow-blue-500/25" : ""
                    )}
                  >
                    <span className="flex items-center justify-center relative z-10">
                      {isLoading ? "Creating Account..." : "Sign Up"}
                      {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                    </span>
                    {isHovered && !isLoading && (
                      <motion.span
                        initial={{ left: "-100%" }}
                        animate={{ left: "100%" }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        style={{ filter: "blur(8px)" }}
                      />
                    )}
                  </Button>
                </motion.div>

                <div className="text-center mt-6">
                  <p className="text-muted-foreground text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </motion.div >
    </div >
  );
}
