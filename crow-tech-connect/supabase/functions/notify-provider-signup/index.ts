import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderSignupNotification {
  providerName: string;
  providerEmail: string;
  userType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerName, providerEmail, userType }: ProviderSignupNotification = await req.json();

    console.log(`Sending signup notification for: ${providerName} (${providerEmail})`);

    // For service providers, send approval request to admin email ONLY
    if (userType === 'service_provider') {
      // Send notification to admin for approval using fetch
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "CrowTech <onboarding@resend.dev>",
          to: ["maronnyirongo@gmail.com"],
          subject: `New Service Provider Registration - Approval Required - CrowTech`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
                .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 New Registration Alert!</h1>
                  <p>CrowTech Platform</p>
                </div>
                <div class="content">
                  <p>Hello Maron,</p>
                  <p>A new service provider has just registered on CrowTech!</p>
                  
                  <div class="info-box">
                    <p><strong>Name:</strong> ${providerName}</p>
                    <p><strong>Email:</strong> ${providerEmail}</p>
                    <p><strong>Account Type:</strong> Service Provider</p>
                    <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
                  </div>
                  
                  <p><strong>Action Required:</strong> Please review and approve this service provider in the admin dashboard. Once approved, they will receive a confirmation email and can complete their registration.</p>
                  <p>The service provider cannot log in until you approve their account.</p>
                  
                  <div class="footer">
                    <p>CrowTech - Connecting Zambia's Construction Professionals</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      const result = await emailResponse.json();
      console.log("Notification email sent:", result);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);