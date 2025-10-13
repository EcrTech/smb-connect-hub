import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkUploadRequest {
  type: 'associations' | 'companies' | 'users';
  csvData: string;
  associationId?: string;
  companyId?: string;
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { type, csvData, associationId, companyId, userId }: BulkUploadRequest = await req.json();
    
    // Get auth header to extract user ID for created_by
    const authHeader = req.headers.get('Authorization');
    let createdBy: string | null = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        createdBy = user?.id || null;
      } catch (error) {
        console.log('Could not get user from auth header:', error);
      }
    }
    console.log(`Processing bulk upload of type: ${type}, associationId: ${associationId}, companyId: ${companyId}, userId: ${userId}`);

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    if (type === 'associations') {
      for (const row of rows) {
        try {
          const values = row.split(',').map(v => v.trim());
          const record: any = {};
          headers.forEach((header, index) => {
            if (values[index]) record[header] = values[index];
          });

          const { error } = await supabaseClient
            .from('associations')
            .insert({
              name: record.name,
              description: record.description || null,
              contact_email: record.contact_email,
              contact_phone: record.contact_phone || null,
              website: record.website || null,
              address: record.address || null,
              city: record.city || null,
              state: record.state || null,
              country: record.country || 'India',
              postal_code: record.postal_code || null,
              is_active: true,
              created_by: createdBy,
            });

          if (error) throw error;
          successCount++;
          console.log(`Created association: ${record.name}`);
        } catch (error: any) {
          failCount++;
          errors.push(`Row ${successCount + failCount}: ${error.message}`);
          console.error(`Failed to create association:`, error);
        }
      }
    } else if (type === 'companies') {
      for (const row of rows) {
        try {
          const values = row.split(',').map(v => v.trim());
          const record: any = {};
          headers.forEach((header, index) => {
            if (values[index]) record[header] = values[index];
          });

          // Determine association ID based on context or CSV field
          let finalAssociationId = associationId; // Use context association if provided
          
          // Only look up by email if no context association is provided
          if (!finalAssociationId && record.association_email && record.association_email.trim() !== '') {
            const { data: association, error: assocError } = await supabaseClient
              .from('associations')
              .select('id')
              .eq('contact_email', record.association_email)
              .single();

            if (assocError || !association) {
              throw new Error(`Association not found with email: ${record.association_email}`);
            }
            finalAssociationId = association.id;
          }
          
          // Validate association manager permission if context is provided
          if (associationId && userId) {
            const { data: managerCheck } = await supabaseClient
              .from('association_managers')
              .select('id')
              .eq('association_id', associationId)
              .eq('user_id', userId)
              .eq('is_active', true)
              .maybeSingle();
            
            if (!managerCheck) {
              throw new Error('User is not authorized to create companies for this association');
            }
          }

          const { error } = await supabaseClient
            .from('companies')
            .insert({
              association_id: finalAssociationId,
              name: record.name,
              description: record.description || null,
              email: record.email,
              phone: record.phone || null,
              website: record.website || null,
              address: record.address || null,
              city: record.city || null,
              state: record.state || null,
              country: record.country || 'India',
              postal_code: record.postal_code || null,
              gst_number: record.gst_number || null,
              pan_number: record.pan_number || null,
              business_type: record.business_type || null,
              industry_type: record.industry_type || null,
              employee_count: record.employee_count ? parseInt(record.employee_count) : null,
              annual_turnover: record.annual_turnover ? parseFloat(record.annual_turnover) : null,
              is_active: true,
              is_verified: false,
              created_by: createdBy,
            });

          if (error) throw error;
          successCount++;
          console.log(`Created company: ${record.name}`);
        } catch (error: any) {
          failCount++;
          errors.push(`Row ${successCount + failCount}: ${error.message}`);
          console.error(`Failed to create company:`, error);
        }
      }
    } else if (type === 'users') {
      for (const row of rows) {
        try {
          const values = row.split(',').map(v => v.trim());
          const record: any = {};
          headers.forEach((header, index) => {
            if (values[index]) record[header] = values[index];
          });

          // Create auth user with provided password or generate temporary one
          const password = record.password && record.password.trim() !== '' 
            ? record.password 
            : `Temp${Math.random().toString(36).substring(7)}!`;
          
          const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
            email: record.email,
            password: password,
            email_confirm: true,
            user_metadata: {
              first_name: record.first_name,
              last_name: record.last_name,
              phone: record.phone || null,
            },
          });

          if (authError) throw authError;
          console.log(`Created user auth: ${record.email}`);

          // Determine company ID based on context or CSV field
          let finalCompanyId = companyId; // Use context company if provided
          
          // Only look up by email if no context company is provided
          if (!finalCompanyId && record.company_email && record.company_email.trim() !== '') {
            const { data: company, error: companyError } = await supabaseClient
              .from('companies')
              .select('id, association_id')
              .eq('email', record.company_email)
              .single();

            if (companyError || !company) {
              throw new Error(`Company not found with email: ${record.company_email}`);
            }
            
            // If association context is provided, validate company belongs to that association
            if (associationId && company.association_id !== associationId) {
              throw new Error(`Company ${record.company_email} does not belong to the specified association`);
            }
            
            finalCompanyId = company.id;
          }
          
          // Validate permissions based on context
          if (companyId && userId) {
            // Company admin creating users - verify they are admin of this company
            const { data: memberCheck } = await supabaseClient
              .from('members')
              .select('id')
              .eq('company_id', companyId)
              .eq('user_id', userId)
              .in('role', ['owner', 'admin'])
              .eq('is_active', true)
              .maybeSingle();
            
            if (!memberCheck) {
              throw new Error('User is not authorized to create users for this company');
            }
          } else if (associationId && userId && !companyId) {
            // Association manager creating users - verify they manage this association
            const { data: managerCheck } = await supabaseClient
              .from('association_managers')
              .select('id')
              .eq('association_id', associationId)
              .eq('user_id', userId)
              .eq('is_active', true)
              .maybeSingle();
            
            if (!managerCheck) {
              throw new Error('User is not authorized to create users for this association');
            }
          }

          // Create member record
          const { error: memberError } = await supabaseClient
            .from('members')
            .insert({
              user_id: authUser.user.id,
              company_id: finalCompanyId,
              role: record.role || 'member',
              designation: record.designation || null,
              department: record.department || null,
              is_active: true,
              created_by: createdBy,
            });

          if (memberError) throw memberError;

          // Send invitation email only if no password was provided
          if (!record.password || record.password.trim() === '') {
            await supabaseClient.auth.admin.inviteUserByEmail(record.email);
          }

          successCount++;
          console.log(`Created user and member: ${record.email}`);
        } catch (error: any) {
          failCount++;
          errors.push(`Row ${successCount + failCount}: ${error.message}`);
          console.error(`Failed to create user:`, error);
        }
      }
    }

    console.log(`Bulk upload complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
