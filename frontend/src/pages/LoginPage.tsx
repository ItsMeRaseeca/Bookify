
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { loginSchema, LoginFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DotMap } from '@/components/ui/dot-map';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/dashboard/${user.role}`);
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);

    if (!result.success) {
      toast({
        title: 'Login Failed',
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

        {/* Right side - Login Form */}
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
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground dark:text-white">Welcome Back</h1>
              <p className="text-muted-foreground dark:text-gray-400 mb-8">Sign in to your account</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Email <span className="text-primary">*</span>
                  </label>
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

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="text-sm font-medium text-foreground dark:text-gray-300">
                      Password <span className="text-primary">*</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={isPasswordVisible ? "text" : "password"}
                      {...register('password')}
                      placeholder="Enter your password"
                      className="bg-background dark:bg-[#13151f] border-input dark:border-[#2a2d3a] placeholder:text-muted-foreground dark:placeholder:text-gray-500 text-foreground dark:text-gray-200 w-full pr-10 focus-visible:ring-primary/50"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                  )}
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
                      {isLoading ? "Signing In..." : "Sign In"}
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
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                      Sign Up
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
