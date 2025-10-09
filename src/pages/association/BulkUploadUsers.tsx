import { BulkUploadForm } from "@/components/admin/BulkUploadForm";
import { useUserRole } from "@/hooks/useUserRole";

export default function BulkUploadUsers() {
  const { userData } = useUserRole();
  const associationId = userData?.association?.id;

  const templateFields = [
    'email',
    'first_name',
    'last_name',
    'phone',
    'company_email',
    'role',
    'designation',
    'department',
    'password'
  ];

  const instructions = [
    'Download the CSV template below',
    'Fill in user details with company_email to link users to companies in your association',
    'Password is optional - users will receive invitation emails if password is not provided',
    'Upload the completed CSV file'
  ];

  const requiredFields = ['email', 'first_name', 'last_name', 'company_email'];

  return (
    <BulkUploadForm
      title="Bulk Upload Users"
      description="Upload multiple users at once using a CSV file"
      uploadType="users"
      templateFields={templateFields}
      templateFilename="users_template.csv"
      backRoute="/association"
      associationId={associationId}
      instructions={instructions}
      requiredFields={requiredFields}
    />
  );
}
