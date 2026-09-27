# ASOSTECH integrated website and admin

This project combines the ASOSTECH public website with its admin dashboard and connects public enquiries, published website content, and admin sign-in to Supabase.

## Set up Supabase

1. Copy `.env.example` to `.env.local` in the project root. Keep the Supabase project URL and **publishable** key in the `VITE_` variables. Do not put a Supabase secret or service-role key in this frontend project.
2. In the Supabase Dashboard for project `rrokafpbzxbfkkgjermb`, open **SQL Editor** and run `supabase/migrations/001_asostech.sql` once. It creates and seeds the services, projects, FAQs, and private enquiries tables, enables row-level security, and adds a guarded enquiry submission function.
3. Run `supabase/migrations/002_content_settings_storage.sql` once as well. This adds saved website content and company settings, admin profile preferences, and the `project-media` image bucket used by project image uploads.
4. Create the administrator in **Authentication → Users**. Then, in SQL Editor, assign the admin role to that exact account (replace the example email):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@example.com';
   ```

   Sign out and sign back in at `/admin/login` so Supabase issues a fresh token containing the role. The browser checks the role, and database policies independently enforce it.
5. Turn off public sign-ups in Supabase Auth if only invited staff should have accounts.

### Updating an existing ASOSTECH Supabase project

If migration `001_asostech.sql` has already been run, do not run it again. Run only `002_content_settings_storage.sql` once to add the CMS/settings tables and project image storage bucket.

The migration seeds the provided service content as published, and the sample portfolio entries and FAQs as drafts. Review the service text, images, and contact details before launch; publish only project examples that reflect ASOSTECH's real work.

## Run the project

Use `pnpm install` and `pnpm dev`, or use `npm install` and `npm run dev`. Open `/` for the website and `/admin/login` for the admin console.

The public Contact and Request a Quote forms write enquiries through `submit_lead`. Visitors cannot select or read the enquiries table. The public website reads only published services, projects, and FAQs; signed-in admin accounts with the `app_metadata.role = 'admin'` claim can manage those tables and review enquiries.

The dashboard’s enquiries and summary counts are live. Website Content editors, company settings, notification preferences, administrator profile fields, the enquiries inbox, and project/media image uploads persist through Supabase after migration `002_content_settings_storage.sql` is installed. Email replies open the administrator’s default email app.

## Email alerts for new enquiries

The `notify-admin-lead` Supabase Edge Function sends an email to every Auth user whose `app_metadata.role` is `admin` when a row is inserted into `public.leads`. The message arrives at each admin account's registered inbox (including Gmail). Email delivery uses Resend as the sending service; Resend is not the receiving mailbox provider.

1. Create a Resend account, an API key, and a verified sending domain/address. Use that verified sender as `RESEND_FROM_EMAIL` (for example, `ASOSTECH <notifications@your-verified-domain>`).
2. From this project folder, deploy the function with the Supabase CLI:

   ```sh
   supabase login
   supabase link --project-ref rrokafpbzxbfkkgjermb
   supabase functions deploy notify-admin-lead
   ```

   `supabase/config.toml` disables gateway JWT verification for this webhook endpoint; the function validates its own shared webhook secret.
3. In Supabase **Edge Functions → Secrets**, set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NOTIFICATION_WEBHOOK_SECRET`. Use a long random value for the webhook secret and keep it private.
4. In Supabase **Database → Webhooks**, create a webhook for schema `public`, table `leads`, event **INSERT**, method **POST**, URL `https://rrokafpbzxbfkkgjermb.supabase.co/functions/v1/notify-admin-lead`. Add header `x-webhook-secret` with the same value as `NOTIFICATION_WEBHOOK_SECRET`, and `Content-Type: application/json`.
5. Ensure each administrator exists under **Authentication → Users** and has `app_metadata.role = admin`. The function finds recipients from those accounts automatically. The saved New lead, New quote and New message settings control which enquiry email alerts are sent.

The Resend API key, Supabase admin key and webhook secret are used only by Supabase Edge Functions and must not be added to Vercel or any `VITE_` variable.
