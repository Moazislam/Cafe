import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gmailUser = Deno.env.get("GMAIL_USER")!;
const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

function messageFor(event: { kind: string; payload: Record<string, unknown> }) {
  if (event.kind === "LOW_STOCK") {
    return {
      subject: `Low stock alert: ${event.payload.item_name}`,
      body: `${event.payload.item_name} has ${event.payload.quantity} item(s) remaining. Low-stock limit: ${event.payload.low_stock_threshold}.`,
    };
  }
  return {
    subject: `Room maintenance alert: ${event.payload.room_name}`,
    body: `${event.payload.room_name} has been marked as Maintenance.`,
  };
}

Deno.serve(async () => {
  console.log("--- WAKING UP: Checking for alerts (VERSION 5 - NODEMAILER) ---");
  
  // 1. Fetch pending alerts
  const { data: events, error: eventsError } = await supabase
    .from("admin_alert_events")
    .select("id, kind, payload")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(25);
  
  if (eventsError || !events?.length) {
      console.log("No events found or error occurred.");
      return Response.json({ sent: 0 });
  }

  // 2. Fetch admins from the profiles table
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
  const adminEmails: string[] = [];
  for (const admin of admins ?? []) {
    const { data: userData } = await supabase.auth.admin.getUserById(admin.id);
    if (userData?.user?.email) adminEmails.push(userData.user.email);
  }
    
  if (!adminEmails.length) {
      console.log("No admin emails found.");
      return Response.json({ sent: 0 });
  }

  console.log(`Preparing to send to ${adminEmails.length} admins via Gmail (Nodemailer)...`);

  // 3. Connect to Gmail using Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  // 4. Send the emails
  for (const event of events) {
    const message = messageFor(event);
    
    for (const adminEmail of adminEmails) {
        console.log(`Sending event ${event.id} to ${adminEmail}...`);
        try {
            await transporter.sendMail({
              from: gmailUser,
              to: adminEmail,
              subject: message.subject,
              text: message.body,
            });
            console.log(`Successfully sent to ${adminEmail}`);
        } catch (err) {
            console.error(`Failed to send to ${adminEmail}:`, err);
        }
    }
    
    // Mark as sent in database
    await supabase.from("admin_alert_events").update({ sent_at: new Date().toISOString() }).eq("id", event.id);
    console.log(`Event ${event.id} marked as sent in the database.`);
  }

  console.log("--- FINISHED PROCESSING ---");
  return Response.json({ sent: events.length, recipients: adminEmails.length });
});