import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MobilePaymentRequest {
  paymentMethod: 'mtn' | 'airtel';
  phoneNumber: string;
  amount: number;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { paymentMethod, phoneNumber, amount, description }: MobilePaymentRequest = await req.json();

    console.log(`Processing ${paymentMethod} payment for ${phoneNumber}, amount: K${amount}`);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        payment_type: 'mobile_money',
        amount,
        currency: 'ZMW',
        status: 'pending',
        service_request_id: null // For subscription payment
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error('Failed to create payment record');
    }

    // Simulate mobile money API call (in production, you'd call actual MTN/Airtel APIs)
    const paymentReference = `${paymentMethod.toUpperCase()}_${Date.now()}`;
    
    console.log(`Mock ${paymentMethod} payment initiated:`, {
      phoneNumber,
      amount,
      reference: paymentReference
    });

    // Send notification email to admin for approval
    const adminEmail = "maronyirongot@gmail.com"; // Admin email for demos
    
    const approvalUrl = `${supabaseUrl}/functions/v1/approve-payment?payment_id=${payment.id}&action=approve&token=${btoa(payment.id)}`;
    const rejectUrl = `${supabaseUrl}/functions/v1/approve-payment?payment_id=${payment.id}&action=reject&token=${btoa(payment.id)}`;

    const emailResponse = await resend.emails.send({
      from: "CrowTech <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Payment Approval Required - ${paymentMethod.toUpperCase()} Payment`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Payment Approval Required</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <p><strong>User:</strong> ${user.email}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()} Mobile Money</p>
            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
            <p><strong>Amount:</strong> K${amount.toFixed(2)}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Reference:</strong> ${paymentReference}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalUrl}" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
              ✅ APPROVE PAYMENT
            </a>
            
            <a href="${rejectUrl}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
              ❌ REJECT PAYMENT
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Click the appropriate button above to approve or reject this payment. 
            The user will be notified of your decision.
          </p>
        </div>
      `,
    });

    console.log("Admin notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        reference: paymentReference,
        message: "Payment initiated successfully. Awaiting admin approval."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in process-mobile-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);