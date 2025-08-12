import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  notificationId: string;
  deliveryMethods: ('email' | 'sms' | 'push')[];
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notificationId, deliveryMethods }: NotificationRequest = await req.json();
    
    console.log('Processing notification:', notificationId, 'via:', deliveryMethods);

    // Get notification details
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          phone_number
        )
      `)
      .eq('id', notificationId)
      .single();

    if (notificationError || !notification) {
      throw new Error('Notification not found');
    }

    const results = [];

    // Process each delivery method
    for (const method of deliveryMethods) {
      const deliveryRecord = {
        notification_id: notificationId,
        user_id: notification.user_id,
        delivery_method: method,
        status: 'pending' as const,
        delivery_details: {},
        error_message: null,
        sent_at: null,
        delivered_at: null,
      };

      try {
        if (method === 'email') {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(notification.user_id);
          
          if (userData.user?.email) {
            const emailResult = await resend.emails.send({
              from: 'Health App <notifications@health-app.com>',
              to: [userData.user.email],
              subject: notification.title,
              html: `
                <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1f2937;">${notification.title}</h2>
                  <p style="color: #4b5563; line-height: 1.6;">${notification.message}</p>
                  ${notification.action_url ? `
                    <div style="margin: 24px 0;">
                      <a href="${notification.action_url}" 
                         style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Details
                      </a>
                    </div>
                  ` : ''}
                  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                    You received this notification from your Health App.
                  </p>
                </div>
              `,
            });

            deliveryRecord.status = 'sent';
            deliveryRecord.sent_at = new Date().toISOString();
            deliveryRecord.delivery_details = { emailId: emailResult.data?.id };
          } else {
            throw new Error('No email address found');
          }
        } else if (method === 'sms') {
          // SMS delivery would require a service like Twilio
          // For now, just mark as pending
          deliveryRecord.status = 'pending';
          deliveryRecord.error_message = 'SMS service not configured';
        } else if (method === 'push') {
          // Push notifications would require a service like FCM
          // For now, just mark as pending
          deliveryRecord.status = 'pending';
          deliveryRecord.error_message = 'Push service not configured';
        }
      } catch (error) {
        console.error(`Failed to send ${method} notification:`, error);
        deliveryRecord.status = 'failed';
        deliveryRecord.error_message = error.message;
      }

      // Insert delivery record
      const { error: insertError } = await supabase
        .from('notification_deliveries')
        .insert(deliveryRecord);

      if (insertError) {
        console.error('Failed to insert delivery record:', insertError);
      }

      results.push(deliveryRecord);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});