import { BulkUploadForm } from "@/components/admin/BulkUploadForm";
import { useUserRole } from "@/hooks/useUserRole";

export default function BulkUploadUsers() {
  const { userData } = useUserRole();
  const companyId = userData?.company_id;

  const templateFields = [
    'email',
    'first_name',
    'last_name',
    'phone',
    'role',
    'designation',
    'department',
    'password'
  ];

  const instructions = [
    'Download the CSV template below',
    'Fill in user details (company will be automatically set)',
    'Password is optional - when left blank, users will receive a branded welcome email with instructions to set their password',
    'Upload the completed CSV file'
  ];

  const requiredFields = ['email', 'first_name', 'last_name'];

  return (
    <BulkUploadForm
      title="Bulk Upload Users"
      description="Upload multiple users to your company using a CSV file"
      uploadType="users"
      templateFields={templateFields}
      templateFilename="users_template.csv"
      backRoute="/company"
      companyId={companyId}
      instructions={instructions}
      requiredFields={requiredFields}
    />
  );
}
