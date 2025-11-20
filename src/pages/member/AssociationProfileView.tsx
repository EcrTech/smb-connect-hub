import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/HomeButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

interface Association {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  industry: string | null;
  founded_year: number | null;
  social_links: any;
  keywords: string[] | null;
}

interface KeyFunctionary {
  id: string;
  name: string;
  designation: string;
  bio: string | null;
  photo: string | null;
  display_order: number;
}

export default function AssociationProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [association, setAssociation] = useState<Association | null>(null);
  const [functionaries, setFunctionaries] = useState<KeyFunctionary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssociation();
    loadFunctionaries();
  }, [id]);

  const loadAssociation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("associations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setAssociation(data);
    } catch (error: any) {
      toast.error("Failed to load association profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFunctionaries = async () => {
    try {
      const { data, error } = await supabase
        .from("key_functionaries_public")
        .select("*")
        .eq("association_id", id)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setFunctionaries(data || []);
    } catch (error: any) {
      console.error("Failed to load functionaries:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading association profile...</p>
      </div>
    );
  }

  if (!association) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Association not found</p>
          <Button onClick={() => navigate("/member/browse-associations")}>
            Back to Associations
          </Button>
        </div>
      </div>
    );
  }

  const socialLinks = association.social_links || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 !pl-20 md:!pl-24">
        <div className="flex items-center justify-between mb-8">
          <BackButton fallbackPath="/dashboard" variant="ghost" label="Back" />
          <HomeButton />
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start gap-6">
                {association.logo ? (
                  <img
                    src={association.logo}
                    alt={association.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building className="h-12 w-12 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{association.name}</CardTitle>
                  {association.industry && (
                    <p className="text-lg text-muted-foreground">
                      {association.industry}
                    </p>
                  )}
                  {association.keywords && association.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {association.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {association.description && (
                <p className="text-muted-foreground mb-6">{association.description}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {association.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={`mailto:${association.contact_email}`}
                      className="hover:underline"
                    >
                      {association.contact_email}
                    </a>
                  </div>
                )}
                {association.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={`tel:${association.contact_phone}`}
                      className="hover:underline"
                    >
                      {association.contact_phone}
                    </a>
                  </div>
                )}
                {association.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={association.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {association.website}
                    </a>
                  </div>
                )}
                {(association.address || association.city || association.state) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      {association.address && <p>{association.address}</p>}
                      <p>
                        {[association.city, association.state, association.postal_code]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {association.country && <p>{association.country}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {association.founded_year && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>Founded {association.founded_year}</span>
                  </div>
                )}
                {(socialLinks.facebook ||
                  socialLinks.twitter ||
                  socialLinks.linkedin ||
                  socialLinks.instagram) && (
                  <div>
                    <p className="text-sm font-medium mb-3">Social Media</p>
                    <div className="flex gap-3">
                      {socialLinks.facebook && (
                        <a
                          href={socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.linkedin && (
                        <a
                          href={socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {functionaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Key Functionaries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {functionaries.map((functionary) => (
                    <div key={functionary.id} className="flex items-start gap-4">
                      {functionary.photo ? (
                        <img
                          src={functionary.photo}
                          alt={functionary.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {functionary.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{functionary.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {functionary.designation}
                        </p>
                        {functionary.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {functionary.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
