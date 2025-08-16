import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  customerName: string;
  customerEmail: string;
  customerGstin?: string;
  customerAddress: string;
  customerState: string;
  amount: number;
  currency: string;
  gstDetails: {
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    netAmount: number;
    hsnCode: string;
  };
  subscriptionPlan: string;
  billingPeriod: string;
  invoiceNumber: string;
  invoiceDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { invoiceData }: { invoiceData: InvoiceData } = await req.json();

    // Generate HTML invoice
    const invoiceHtml = generateInvoiceHTML(invoiceData);

    // Convert HTML to PDF (using a simple HTML response for now)
    // In production, you would use a service like Puppeteer or jsPDF
    const invoiceBuffer = new TextEncoder().encode(invoiceHtml);

    // Upload invoice to Supabase Storage
    const fileName = `invoices/${user.id}/${invoiceData.invoiceNumber}.html`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('medical-documents')
      .upload(fileName, invoiceBuffer, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('medical-documents')
      .getPublicUrl(fileName);

    // Update billing history with invoice URL
    const { error: updateError } = await supabaseClient
      .from('billing_history')
      .update({ invoice_url: publicUrl })
      .eq('user_id', user.id)
      .eq('razorpay_payment_id', invoiceData.invoiceNumber);

    if (updateError) {
      console.error('Error updating billing history:', updateError);
    }

    // Send invoice via email (placeholder)
    await sendInvoiceEmail(invoiceData, publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoiceUrl: publicUrl,
        invoiceNumber: invoiceData.invoiceNumber
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Invoice generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>GST Invoice - ${data.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .company-details { margin-bottom: 20px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-details { margin-bottom: 30px; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .invoice-table th { background-color: #f5f5f5; }
            .tax-summary { margin-top: 20px; }
            .total-amount { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="invoice-header">
            <h1>TAX INVOICE</h1>
            <h2>HealthVault Pro</h2>
        </div>

        <div class="company-details">
            <strong>HealthVault Pro Private Limited</strong><br>
            Registered Office: [Company Address]<br>
            GSTIN: [Company GSTIN]<br>
            Email: billing@healthvaultpro.com<br>
            Phone: [Company Phone]
        </div>

        <div class="invoice-info">
            <div>
                <strong>Invoice Number:</strong> ${data.invoiceNumber}<br>
                <strong>Invoice Date:</strong> ${data.invoiceDate}<br>
                <strong>HSN/SAC Code:</strong> ${data.gstDetails.hsnCode}
            </div>
            <div>
                <strong>Billing Period:</strong> ${data.billingPeriod}<br>
                <strong>Currency:</strong> ${data.currency.toUpperCase()}
            </div>
        </div>

        <div class="customer-details">
            <strong>Bill To:</strong><br>
            ${data.customerName}<br>
            ${data.customerEmail}<br>
            ${data.customerAddress}<br>
            State: ${data.customerState}<br>
            ${data.customerGstin ? `GSTIN: ${data.customerGstin}` : 'GSTIN: Not Provided'}
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${data.subscriptionPlan} Subscription</td>
                    <td>${data.gstDetails.hsnCode}</td>
                    <td>1</td>
                    <td>${formatCurrency(data.gstDetails.netAmount)}</td>
                    <td>${formatCurrency(data.gstDetails.netAmount)}</td>
                </tr>
            </tbody>
        </table>

        <div class="tax-summary">
            <table class="invoice-table">
                <tr>
                    <td><strong>Sub Total</strong></td>
                    <td><strong>${formatCurrency(data.gstDetails.netAmount)}</strong></td>
                </tr>
                ${data.gstDetails.cgst > 0 ? `
                <tr>
                    <td>CGST @ 9%</td>
                    <td>${formatCurrency(data.gstDetails.cgst)}</td>
                </tr>
                <tr>
                    <td>SGST @ 9%</td>
                    <td>${formatCurrency(data.gstDetails.sgst)}</td>
                </tr>
                ` : `
                <tr>
                    <td>IGST @ 18%</td>
                    <td>${formatCurrency(data.gstDetails.igst)}</td>
                </tr>
                `}
                <tr class="total-amount">
                    <td><strong>Total Amount</strong></td>
                    <td><strong>${formatCurrency(data.amount)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <p><strong>Terms & Conditions:</strong></p>
            <ul>
                <li>This is a computer-generated invoice and does not require a physical signature.</li>
                <li>Payment is due as per the subscription terms.</li>
                <li>For any queries, please contact our support team.</li>
            </ul>
            
            <p style="margin-top: 30px;">
                <strong>Thank you for your business!</strong><br>
                This invoice was generated on ${new Date().toLocaleString('en-IN')}
            </p>
        </div>
    </body>
    </html>
  `;
}

async function sendInvoiceEmail(invoiceData: InvoiceData, invoiceUrl: string): Promise<void> {
  // Placeholder for email sending
  // In production, integrate with email service like SendGrid, AWS SES, etc.
  console.log(`Invoice email would be sent to ${invoiceData.customerEmail}`);
  console.log(`Invoice URL: ${invoiceUrl}`);
  
  // You can integrate with Supabase send-notification function here
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.functions.invoke('send-notification', {
      body: {
        type: 'email',
        to: invoiceData.customerEmail,
        subject: `GST Invoice ${invoiceData.invoiceNumber} - HealthVault Pro`,
        body: `Dear ${invoiceData.customerName},\n\nThank you for your payment. Please find your GST invoice attached.\n\nInvoice Number: ${invoiceData.invoiceNumber}\nAmount: ${invoiceData.currency.toUpperCase()} ${(invoiceData.amount / 100).toFixed(2)}\nInvoice URL: ${invoiceUrl}\n\nBest regards,\nHealthVault Pro Team`
      }
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
  }
}