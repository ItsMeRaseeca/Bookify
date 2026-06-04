import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, RefreshCcw, Download, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { paymentApi, bookingApi } from '@/lib/api';

type PaymentState = 'loading' | 'success' | 'failed' | 'pending';

interface PaymentDetails {
  state: string;
  orderId: string | null;
  transactionId: string | null;
  amount: number | null;
  paymentMode: string | null;
}

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  const bookingId = searchParams.get('bookingId');

  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [toastShown, setToastShown] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setPaymentState('failed');
      if (!toastShown) {
        toast({
          title: 'Payment Failed',
          description: 'Invalid payment session. Please try again.',
          variant: 'destructive',
        });
        setToastShown(true);
      }
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await paymentApi.getStatus(orderId);
        const data = response.data.data;

        setPaymentDetails(data);

        if (data.state === 'COMPLETED') {
          setPaymentState('success');
          if (!toastShown) {
            toast({
              title: '🎉 Payment Successful!',
              description: 'Your booking has been confirmed. You can download your receipt below.',
            });
            setToastShown(true);
          }
        } else if (data.state === 'FAILED') {
          setPaymentState('failed');
          if (!toastShown) {
            toast({
              title: 'Payment Failed',
              description: 'Your payment could not be processed. Please try again.',
              variant: 'destructive',
            });
            setToastShown(true);
          }
        } else if (data.state === 'PENDING') {
          setPaymentState('pending');
          // Retry after 3 seconds, up to 10 times
          if (retryCount < 10) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 3000);
          } else {
            // After max retries, show as failed
            setPaymentState('failed');
            if (!toastShown) {
              toast({
                title: 'Payment Status Unknown',
                description: 'Could not verify payment. Please check your bookings or try again.',
                variant: 'destructive',
              });
              setToastShown(true);
            }
          }
        } else {
          // Unknown state, retry
          if (retryCount < 5) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 2000);
          } else {
            setPaymentState('failed');
            if (!toastShown) {
              toast({
                title: 'Payment Failed',
                description: 'Could not verify payment status. Please try again.',
                variant: 'destructive',
              });
              setToastShown(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 2000);
        } else {
          setPaymentState('failed');
          if (!toastShown) {
            toast({
              title: 'Payment Failed',
              description: 'Could not connect to payment server. Please try again.',
              variant: 'destructive',
            });
            setToastShown(true);
          }
        }
      }
    };

    checkStatus();
  }, [orderId, retryCount, toast, toastShown]);

  const handleDownloadReceipt = async () => {
    if (!bookingId) return;

    try {
      const response = await bookingApi.downloadReceipt(bookingId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not download receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            {paymentState === 'loading' && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
                <CardTitle>Processing Payment</CardTitle>
                <CardDescription>Please wait while we verify your payment...</CardDescription>
              </>
            )}

            {paymentState === 'pending' && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="w-16 h-16 animate-spin text-yellow-500" />
                </div>
                <CardTitle>Payment Pending</CardTitle>
                <CardDescription>
                  Your payment is being processed. This page will update automatically.
                </CardDescription>
              </>
            )}

            {paymentState === 'success' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4"
                >
                  <CheckCircle className="w-20 h-20 text-green-500" />
                </motion.div>
                <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                <CardDescription>Your booking has been confirmed.</CardDescription>
              </>
            )}

            {paymentState === 'failed' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4"
                >
                  <XCircle className="w-20 h-20 text-red-500" />
                </motion.div>
                <CardTitle className="text-red-600">Payment Failed</CardTitle>
                <CardDescription>
                  Your payment could not be processed. Please try again.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {paymentDetails && paymentState === 'success' && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                {paymentDetails.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono">{paymentDetails.transactionId}</span>
                  </div>
                )}
                {paymentDetails.amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold">₹{paymentDetails.amount}</span>
                  </div>
                )}
                {paymentDetails.paymentMode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode</span>
                    <span>{paymentDetails.paymentMode}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {paymentState === 'success' && bookingId && (
                <Button onClick={handleDownloadReceipt} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
              )}

              {paymentState === 'success' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/user?tab=bookings')}
                  className="w-full"
                >
                  View My Bookings
                </Button>
              )}

              {paymentState === 'failed' && (
                <>
                  <Button onClick={() => navigate('/services')} className="w-full">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard/user')}
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </>
              )}

              {(paymentState === 'loading' || paymentState === 'pending') && (
                <p className="text-xs text-center text-muted-foreground">
                  Do not close this window or press back button.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {orderId && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            Order ID: {orderId}
          </p>
        )}
      </motion.div>
    </div>
  );
}
