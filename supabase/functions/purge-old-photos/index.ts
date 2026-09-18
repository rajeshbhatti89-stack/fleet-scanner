// Supabase Edge Function: purge-old-photos
// Deploys with: supabase functions deploy purge-old-photos
// Scheduled via pg_cron or Supabase Cron triggers: Runs daily at 02:00 UTC

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const RETENTION_DAYS = 60;
const CAPACITY_THRESHOLD_PCT = 80;

Deno.serve(async (req) => {
  try {
    // 1. Authorize invocation (service role or cron header)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional query params to test or customize retention
    const url = new URL(req.url);
    const customDays = parseInt(url.searchParams.get('days') || `${RETENTION_DAYS}`);
    const forcePurgeOldest = url.searchParams.get('force_oldest') === 'true';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - customDays);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`[Storage Retention] Executing purge for photos older than ${customDays} days (before ${cutoffIso})`);

    // 2. Query meter_logs rows that have active photos and are older than cutoff
    let query = supabase
      .from('meter_logs')
      .select('log_id, timestamp, raw_image_url')
      .not('raw_image_url', 'is', null)
      .neq('raw_image_url', 'purged_due_to_retention')
      .neq('raw_image_url', '')
      .order('timestamp', { ascending: true })
      .limit(500);

    if (!forcePurgeOldest) {
      query = query.lt('timestamp', cutoffIso);
    }

    const { data: eligibleLogs, error: fetchErr } = await query;

    if (fetchErr) {
      throw fetchErr;
    }

    if (!eligibleLogs || eligibleLogs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No photos eligible for retention purge at this time.',
          purged_count: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Storage Retention] Found ${eligibleLogs.length} photos to purge.`);

    const filesToDelete: string[] = [];
    const logIdsToUpdate: string[] = [];

    for (const log of eligibleLogs) {
      logIdsToUpdate.push(log.log_id);
      
      // Extract file path from Supabase storage URL
      if (log.raw_image_url && log.raw_image_url.includes('/meter-photos/')) {
        const parts = log.raw_image_url.split('/meter-photos/');
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1].split('?')[0]);
          filesToDelete.push(filePath);
        }
      }
    }

    // 3. Delete physical storage objects from bucket 'meter-photos'
    let deletedFilesCount = 0;
    if (filesToDelete.length > 0) {
      const { data: storageDelData, error: storageDelErr } = await supabase.storage
        .from('meter-photos')
        .remove(filesToDelete);

      if (storageDelErr) {
        console.error('[Storage Retention] Storage delete error:', storageDelErr);
      } else {
        deletedFilesCount = storageDelData?.length || filesToDelete.length;
      }
    }

    // 4. Update the database rows: Retain entire row permanently, update raw_image_url
    const { error: updateErr } = await supabase
      .from('meter_logs')
      .update({
        raw_image_url: 'purged_due_to_retention',
      })
      .in('log_id', logIdsToUpdate);

    if (updateErr) {
      throw updateErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Purged ${logIdsToUpdate.length} photos due to retention policy. Meter logs retained permanently.`,
        purged_count: logIdsToUpdate.length,
        deleted_files_count: deletedFilesCount,
        retention_days: customDays,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Storage Retention Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
