import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { otpVerificationSchema, OtpFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const { verifyOtp, pendingVerification, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpVerificationSchema),
    mode: 'onChange',
  });

  const otp = watch('otp', '');

  React.useEffect(() => {
    if (!pendingVerification) {
      navigate('/signup');
    }
  }, [pendingVerification, navigate]);

  React.useEffect(() => {
    if (user) {
      navigate(`/dashboard/${user.role}`);
    }
  }, [user, navigate]);

  const onSubmit = async (data: OtpFormData) => {
    setIsLoading(true);
    const result = await verifyOtp(data.otp);
    setIsLoading(false);

    if (!result.success) {
      toast({
        title: 'Verification Failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success!',
        description: 'Your account has been verified.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <button
            onClick={() => navigate('/signup')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span>Back to signup</span>
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verify Your Account</h1>
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-foreground">
                {pendingVerification?.email}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setValue('otp', value, { shouldValidate: true })}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {errors.otp && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive text-center"
              >
                {errors.otp.message}
              </motion.p>
            )}

            <LoadingButton
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              loading={isLoading}
              disabled={!isValid}
            >
              Verify Account
            </LoadingButton>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
