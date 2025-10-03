import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FloatingChat } from '@/components/messages/FloatingChat';
import { 
  ArrowLeft, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Lightbulb,
  Linkedin,
  Twitter,
  Globe,
  Mail,
  Phone,
  Edit,
  Camera,
  MessageSquare
} from 'lucide-react';
import { EditProfileDialog } from '@/components/member/EditProfileDialog';
import { EditWorkExperienceDialog } from '@/components/member/EditWorkExperienceDialog';
import { EditEducationDialog } from '@/components/member/EditEducationDialog';
import { EditSkillsDialog } from '@/components/member/EditSkillsDialog';
import { EditCertificationsDialog } from '@/components/member/EditCertificationsDialog';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  bio: string | null;
  avatar: string | null;
  cover_image: string | null;
  location: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  employment_status: string | null;
  open_to_work: boolean;
}

interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

interface Education {
  id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

interface Skill {
  id: string;
  skill_name: string;
  endorsements_count: number;
}

interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date: string | null;
  expiration_date: string | null;
  credential_url: string | null;
}

export default function MemberProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile(userId);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [chatId, setChatId] = useState<string | null>(null);

  const isOwnProfile = currentUser === userId;

  useEffect(() => {
    loadCurrentUser();
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (currentUser && userId && !isOwnProfile) {
      checkConnectionStatus();
    }
  }, [currentUser, userId, isOwnProfile]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const checkConnectionStatus = async () => {
    try {
      // Get both members
      const { data: currentMember } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUser)
        .single();

      const { data: otherMember } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!currentMember || !otherMember) return;

      // Check connection status
      const { data: connection } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${currentMember.id},receiver_id.eq.${otherMember.id}),and(sender_id.eq.${otherMember.id},receiver_id.eq.${currentMember.id})`)
        .maybeSingle();

      if (connection) {
        if (connection.status === 'accepted') {
          setConnectionStatus('connected');
          // Find existing chat
          await findExistingChat(currentMember.id, otherMember.id);
        } else {
          setConnectionStatus('pending');
        }
      } else {
        setConnectionStatus('none');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const findExistingChat = async (currentMemberId: string, otherMemberId: string) => {
    try {
      // Get chats where current member is participant
      const { data: currentChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('company_id', currentMemberId);

      if (!currentChats || currentChats.length === 0) return;

      // Check each chat to see if other member is also in it
      for (const chat of currentChats) {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('company_id')
          .eq('chat_id', chat.chat_id);

        if (participants && participants.length === 2) {
          const otherParticipant = participants.find(p => p.company_id !== currentMemberId);
          if (otherParticipant?.company_id === otherMemberId) {
            setChatId(chat.chat_id);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error finding chat:', error);
    }
  };

  const handleStartMessage = async () => {
    try {
      if (chatId) {
        // Chat already exists, just open it
        return;
      }

      // Create new chat
      const { data: currentMember } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUser)
        .single();

      const { data: otherMember } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!currentMember || !otherMember) return;

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'direct',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) throw chatError;

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, company_id: currentMember.id },
          { chat_id: newChat.id, company_id: otherMember.id }
        ]);

      if (participantError) throw participantError;

      setChatId(newChat.id);
      toast({
        title: 'Success',
        description: 'Chat created',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create chat',
        variant: 'destructive',
      });
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Refresh profile from the hook
      await refreshProfile();

      // Load work experience
      const { data: workData } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', userId)
        .order('is_current', { ascending: false })
        .order('start_date', { ascending: false });
      setWorkExperience(workData || []);

      // Load education
      const { data: eduData } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      setEducation(eduData || []);

      // Load skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId)
        .order('endorsements_count', { ascending: false });
      setSkills(skillsData || []);

      // Load certifications
      const { data: certsData } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });
      setCertifications(certsData || []);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    if (!currentUser || !isOwnProfile) return;

    try {
      setUploading(true);

      // Validate based on type
      const { validateAvatarUpload, validateCoverImageUpload } = await import('@/lib/uploadValidation');
      const validation = type === 'avatar' 
        ? await validateAvatarUpload(file)
        : await validateCoverImageUpload(file);

      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const updateField = type === 'avatar' ? 'avatar' : 'cover_image';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', currentUser);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: `${type === 'avatar' ? 'Profile' : 'Cover'} photo updated`,
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Present';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Profile not found</p>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`;
  const initials = `${profile.first_name[0]}${profile.last_name[0]}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Cover & Profile Photo */}
        <Card className="overflow-hidden mb-6">
          <div className="relative">
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10 relative">
              {profile.cover_image && (
                <img
                  src={profile.cover_image}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
              {isOwnProfile && (
                <label className="absolute top-4 right-4 cursor-pointer">
                  <Button variant="secondary" size="sm" disabled={uploading} asChild>
                    <div>
                      <Camera className="w-4 h-4 mr-2" />
                      Edit cover
                    </div>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'cover');
                    }}
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
                {/* Avatar with overlap */}
                <div className="relative -mt-16 sm:-mt-20 shrink-0">
                  <Avatar className="w-32 h-32 border-4 border-card bg-card">
                    <AvatarImage src={profile.avatar || undefined} />
                    <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <label className="absolute bottom-0 right-0 cursor-pointer">
                      <Button size="icon" variant="secondary" className="rounded-full" disabled={uploading} asChild>
                        <div>
                          <Camera className="w-4 h-4" />
                        </div>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'avatar');
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Text content - no overlap */}
              <div className="flex-1 sm:mb-4 pt-24">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">{fullName}</h1>
                      {profile.headline && (
                        <p className="text-lg text-muted-foreground mt-1">{profile.headline}</p>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {/* Employment Status Badge */}
                      {profile.employment_status && (
                        <div className="mt-3">
                          <Badge 
                            variant={profile.open_to_work ? "default" : "secondary"}
                            className="text-sm"
                          >
                            {profile.employment_status === 'open_to_opportunities' && '🟢 Open to opportunities'}
                            {profile.employment_status === 'actively_looking' && '🔍 Actively looking'}
                            {profile.employment_status === 'hiring' && '📢 Hiring'}
                            {profile.employment_status === 'not_looking' && 'Not looking'}
                            {profile.employment_status === 'open_to_consulting' && '💼 Open to consulting'}
                            {profile.employment_status === 'available_for_freelance' && '✨ Available for freelance'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isOwnProfile && (
                      <div className="relative z-10">
                        <EditProfileDialog profile={profile} onSave={loadProfile} />
                      </div>
                    )}
                  </div>

                  {/* Contact & Social Links */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {/* Message Button for Connected Users */}
                    {!isOwnProfile && connectionStatus === 'connected' && (
                      <Button variant="default" size="sm" onClick={handleStartMessage}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4 mr-2" />
                          Contact
                        </Button>
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {profile.twitter_url && (
                      <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {profile.website_url && (
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Globe className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* About */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">About</h2>
              {isOwnProfile && !profile.bio && (
                <div className="relative z-10">
                  <EditProfileDialog profile={profile} onSave={loadProfile} />
                </div>
              )}
            </div>
            {profile.bio ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="text-muted-foreground italic">No description added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Experience</h2>
              </div>
              {isOwnProfile && <EditWorkExperienceDialog onSave={loadProfile} />}
            </div>
            {workExperience.length === 0 ? (
              <p className="text-muted-foreground">No experience added yet</p>
            ) : (
              <div className="space-y-6">
                {workExperience.map((exp, index) => (
                  <div key={exp.id}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{exp.title}</h3>
                        <p className="text-muted-foreground">{exp.company}</p>
                        {exp.location && (
                          <p className="text-sm text-muted-foreground">{exp.location}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                        </p>
                        {exp.description && (
                          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {index < workExperience.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Education</h2>
              </div>
              {isOwnProfile && <EditEducationDialog onSave={loadProfile} />}
            </div>
            {education.length === 0 ? (
              <p className="text-muted-foreground">No education added yet</p>
            ) : (
              <div className="space-y-6">
                {education.map((edu, index) => (
                  <div key={edu.id}>
                    <h3 className="font-semibold">{edu.school}</h3>
                    <p className="text-muted-foreground">
                      {edu.degree}
                      {edu.field_of_study && ` in ${edu.field_of_study}`}
                    </p>
                    {(edu.start_date || edu.end_date) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {edu.start_date ? formatDate(edu.start_date) : ''} - {edu.end_date ? formatDate(edu.end_date) : ''}
                      </p>
                    )}
                    {edu.description && (
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                        {edu.description}
                      </p>
                    )}
                    {index < education.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Skills</h2>
              </div>
              {isOwnProfile && <EditSkillsDialog onSave={loadProfile} />}
            </div>
            {skills.length === 0 ? (
              <p className="text-muted-foreground">No skills added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="text-sm py-1.5 px-3">
                    {skill.skill_name}
                    {skill.endorsements_count > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {skill.endorsements_count}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certifications */}
        {(certifications.length > 0 || isOwnProfile) && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">Certifications</h2>
                </div>
                {isOwnProfile && <EditCertificationsDialog onSave={loadProfile} />}
              </div>
              {certifications.length === 0 ? (
                <p className="text-muted-foreground">No certifications added yet</p>
              ) : (
                <div className="space-y-4">
                  {certifications.map((cert) => (
                    <div key={cert.id}>
                      <h3 className="font-semibold">{cert.name}</h3>
                      <p className="text-muted-foreground">{cert.issuing_organization}</p>
                      {cert.issue_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Issued {formatDate(cert.issue_date)}
                          {cert.expiration_date && ` - Expires ${formatDate(cert.expiration_date)}`}
                        </p>
                      )}
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          View credential
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Floating Chat Widget */}
      {!isOwnProfile && connectionStatus === 'connected' && (
        <FloatingChat currentUserId={currentUser} initialChatId={chatId} />
      )}
    </div>
  );
}