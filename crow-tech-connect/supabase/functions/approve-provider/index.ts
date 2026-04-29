import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Check if this is a GET request (email link click) or POST (from dashboard)
    if (req.method === 'GET') {
      // Handle email link click
      const profileId = url.searchParams.get('profile_id');
      const action = url.searchParams.get('action');
      const token = url.searchParams.get('token');

      if (!profileId || !action || !token) {
        return new Response('Missing required parameters', { status: 400 });
      }

      // Simple token validation
      if (token !== btoa(profileId)) {
        return new Response('Invalid token', { status: 403 });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

      // Get profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError || !profile) {
        return new Response('Profile not found', { status: 404 });
      }

      // Update approval status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ approval_status: newStatus })
        .eq('id', profileId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response('Failed to update profile', { status: 500 });
      }

      // Send notification email to the provider
      await sendNotificationEmail(resend, profile.email, profile.full_name, action === 'approve');

      // Return HTML response for the admin
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Provider ${action === 'approve' ? 'Approved' : 'Rejected'}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f9fafb; }
            .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #16a34a; }
            .error { color: #dc2626; }
            .info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 class="${action === 'approve' ? 'success' : 'error'}">
              ${action === 'approve' ? '✅ Provider Approved' : '❌ Provider Rejected'}
            </h1>
            
            <div class="info">
              <p><strong>Name:</strong> ${profile.full_name || 'N/A'}</p>
              <p><strong>Email:</strong> ${profile.email}</p>
              <p><strong>Status:</strong> ${newStatus}</p>
              <p><strong>Processed:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>The provider has been notified via email.</p>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Handle POST request from dashboard
    if (req.method === 'POST') {
      const { action, profileId, email, fullName } = await req.json();
      
      if (!action || !email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      await sendNotificationEmail(resend, email, fullName, action === 'approve');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error: any) {
    console.error("Error in approve-provider function:", error);
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
};

async function sendNotificationEmail(resend: any, email: string, fullName: string | null, approved: boolean) {
  const userName = fullName || 'Service Provider';
  
  try {
    await resend.emails.send({
      from: "CrowTech <onboarding@resend.dev>",
      to: [email],
      subject: `Account ${approved ? 'Approved' : 'Rejected'} - CrowTech`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #0f2744); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1>${approved ? '🎉 Account Approved!' : '❌ Account Not Approved'}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${userName},</p>
            
            ${approved 
              ? `<p style="color: #16a34a; font-size: 18px;">Congratulations! Your service provider account has been approved.</p>
                 <p>You can now:</p>
                 <ul>
                   <li>Log in to your dashboard</li>
                   <li>Complete your profile</li>
                   <li>Start accepting service requests</li>
                 </ul>
                 <div style="text-align: center; margin: 30px 0;">
                   <a href="https://majpyfbfxjbrdpznpdur.lovable.app/auth" 
                      style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                     Sign In Now
                   </a>
                 </div>`
              : `<p style="color: #dc2626;">Unfortunately, your account application was not approved at this time.</p>
                 <p>If you believe this was an error, please contact support for more information.</p>`
            }

            <p>Thank you for choosing CrowTech!</p>
            
            <div style="text-align: center; color: #666; margin-top: 20px; font-size: 12px;">
              <p>CrowTech - Connecting Zambia's Professionals</p>
            </div>
          </div>
        </div>
      `,
    });
    console.log("Provider notification email sent to:", email);
  } catch (emailError) {
    console.error("Error sending email:", emailError);
  }
}

serve(handler);