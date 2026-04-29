import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MobilePaymentModal } from './MobilePaymentModal';
import { CreditCard, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';

export const SubscriptionPayment = () => {
  const [showMobilePayment, setShowMobilePayment] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  if (profile?.subscription_fee_paid) {
    return (
      <Card className="border-success">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Subscription Active
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your subscription is active and you have full access to all features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Subscription Required
            <Badge variant="outline">Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">CrowTech Premium</h3>
            <div className="text-3xl font-bold text-primary mb-2">{formatCurrency(99)}</div>
            <p className="text-muted-foreground mb-4">
              One-time subscription fee to access all construction services and features.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">What's Included:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Access to verified service providers</li>
              <li>• Unlimited service requests</li>
              <li>• Priority customer support</li>
              <li>• Project management tools</li>
              <li>• Secure payment processing</li>
            </ul>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => setShowMobilePayment(true)}
              className="w-full"
              size="lg"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              Pay with Mobile Money
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                toast({
                  title: 'Coming Soon',
                  description: 'Card payments will be available soon. Please use mobile money for now.',
                });
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay with Card (Coming Soon)
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Payment is processed securely. You'll receive email confirmation once approved.
          </p>
        </CardContent>
      </Card>

      <MobilePaymentModal
        isOpen={showMobilePayment}
        onClose={() => setShowMobilePayment(false)}
        amount={99}
        description="CrowTech Premium Subscription"
        onSuccess={() => {
          toast({
            title: 'Payment Submitted',
            description: 'Your payment is being processed. You\'ll receive an email confirmation soon.',
          });
        }}
      />
    </>
  );
};