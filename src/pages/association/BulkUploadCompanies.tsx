import { BulkUploadForm } from "@/components/admin/BulkUploadForm";
import { useUserRole } from "@/hooks/useUserRole";

export default function BulkUploadCompanies() {
  const { userData } = useUserRole();
  const associationId = userData?.association?.id;

  const templateFields = [
    'name',
    'description',
    'email',
    'phone',
    'website',
    'address',
    'city',
    'state',
    'country',
    'postal_code',
    'gst_number',
    'pan_number',
    'business_type',
    'industry_type',
    'employee_count',
    'annual_turnover'
  ];

  const instructions = [
    'Download the CSV template below',
    'Fill in the company details (association will be automatically set)',
    'Upload the completed CSV file',
    'Companies will be automatically linked to your association'
  ];

  const requiredFields = ['name', 'email'];

  return (
    <BulkUploadForm
      title="Bulk Upload Companies"
      description="Upload multiple companies at once using a CSV file"
      uploadType="companies"
      templateFields={templateFields}
      templateFilename="companies_template.csv"
      backRoute="/association"
      associationId={associationId}
      instructions={instructions}
      requiredFields={requiredFields}
    />
  );
}
