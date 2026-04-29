import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');
    const action = url.searchParams.get('action');
    const token = url.searchParams.get('token');

    if (!paymentId || !action || !token) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Simple token validation (in production, use proper JWT)
    if (token !== btoa(paymentId)) {
      return new Response('Invalid token', { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response('Payment not found', { status: 404 });
    }

    // Update payment status
    const newStatus = action === 'approve' ? 'completed' : 'failed';
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response('Failed to update payment', { status: 500 });
    }

    // If approved, also update user profile to mark subscription as paid
    if (action === 'approve') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ subscription_fee_paid: true })
        .eq('user_id', payment.user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // Send notification email to user
    const userEmail = payment.profiles.email;
    const userName = payment.profiles.full_name || 'User';

    const emailResponse = await resend.emails.send({
      from: "CrowTech <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Payment ${action === 'approve' ? 'Approved' : 'Rejected'} - CrowTech`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${action === 'approve' ? '#16a34a' : '#dc2626'};">
            Payment ${action === 'approve' ? 'Approved' : 'Rejected'}
          </h2>
          
          <p>Hello ${userName},</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Payment Amount:</strong> K${payment.amount}</p>
            <p><strong>Status:</strong> ${action === 'approve' ? 'Approved ✅' : 'Rejected ❌'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          ${action === 'approve' 
            ? `<p style="color: #16a34a;">Your payment has been approved! You can now access your full profile and services.</p>
               <div style="text-align: center; margin: 30px 0;">
                 <a href="${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/dashboard" 
                    style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Access Your Dashboard
                 </a>
               </div>`
            : `<p style="color: #dc2626;">Your payment was rejected. Please contact support if you believe this was an error.</p>`
          }

          <p>Thank you for using CrowTech!</p>
        </div>
      `,
    });

    console.log("User notification email sent:", emailResponse);

    // Return HTML response for the admin
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${action === 'approve' ? 'Approved' : 'Rejected'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { color: #16a34a; }
          .error { color: #dc2626; }
          .card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1 class="${action === 'approve' ? 'success' : 'error'}">
          Payment ${action === 'approve' ? 'Approved' : 'Rejected'} ✓
        </h1>
        
        <div class="card">
          <h3>Payment Details</h3>
          <p><strong>User:</strong> ${payment.profiles.email}</p>
          <p><strong>Amount:</strong> K${payment.amount}</p>
          <p><strong>Status:</strong> ${newStatus}</p>
          <p><strong>Processed:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p>The user has been notified via email about this decision.</p>
        
        <script>
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    console.error("Error in approve-payment function:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

serve(handler);