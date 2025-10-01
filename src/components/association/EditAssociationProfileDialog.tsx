import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  postal_code: z.string().optional(),
  founded_year: z.string().optional(),
  keywords: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditAssociationProfileDialogProps {
  association: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditAssociationProfileDialog({ 
  association, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditAssociationProfileDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const socialLinks = association.social_links || {};
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: association.name,
      description: association.description || '',
      contact_email: association.contact_email,
      contact_phone: association.contact_phone || '',
      website: association.website || '',
      address: association.address || '',
      city: association.city || '',
      state: association.state || '',
      country: association.country || 'India',
      postal_code: association.postal_code || '',
      founded_year: association.founded_year?.toString() || '',
      keywords: association.keywords?.join(', ') || '',
      linkedin: socialLinks.linkedin || '',
      twitter: socialLinks.twitter || '',
      facebook: socialLinks.facebook || '',
      instagram: socialLinks.instagram || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);

      // Parse keywords from comma-separated string
      const keywordsArray = data.keywords
        ? data.keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];

      // Build social links object
      const socialLinksObj: any = {};
      if (data.linkedin) socialLinksObj.linkedin = data.linkedin;
      if (data.twitter) socialLinksObj.twitter = data.twitter;
      if (data.facebook) socialLinksObj.facebook = data.facebook;
      if (data.instagram) socialLinksObj.instagram = data.instagram;

      const { error } = await supabase
        .from('associations')
        .update({
          name: data.name,
          description: data.description,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          website: data.website,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postal_code: data.postal_code,
          founded_year: data.founded_year ? parseInt(data.founded_year) : null,
          keywords: keywordsArray,
          social_links: socialLinksObj,
        })
        .eq('id', association.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Association Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="social">Social & Keywords</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input {...register('name')} id="name" disabled={loading} />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea {...register('description')} id="description" disabled={loading} rows={4} />
              </div>

              <div>
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input {...register('founded_year')} id="founded_year" type="number" placeholder="2020" disabled={loading} />
              </div>

              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input {...register('keywords')} id="keywords" placeholder="industry, technology, innovation" disabled={loading} />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input {...register('contact_email')} id="contact_email" type="email" disabled={loading} />
                  {errors.contact_email && (
                    <p className="text-sm text-destructive mt-1">{errors.contact_email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input {...register('contact_phone')} id="contact_phone" type="tel" disabled={loading} />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input {...register('website')} id="website" type="url" placeholder="https://" disabled={loading} />
                {errors.website && (
                  <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input {...register('address')} id="address" disabled={loading} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input {...register('city')} id="city" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input {...register('state')} id="state" disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input {...register('country')} id="country" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input {...register('postal_code')} id="postal_code" disabled={loading} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input {...register('linkedin')} id="linkedin" placeholder="https://linkedin.com/company/..." disabled={loading} />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter/X</Label>
                <Input {...register('twitter')} id="twitter" placeholder="https://twitter.com/..." disabled={loading} />
              </div>

              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input {...register('facebook')} id="facebook" placeholder="https://facebook.com/..." disabled={loading} />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input {...register('instagram')} id="instagram" placeholder="https://instagram.com/..." disabled={loading} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
