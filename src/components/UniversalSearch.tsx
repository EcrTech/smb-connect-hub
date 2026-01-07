import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  company_name: string | null;
}

export const UniversalSearch = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchMembers = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
          .limit(10);

        if (error) throw error;

        // Get member data with company info for each profile
        const resultsWithCompany = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { data: memberData } = await supabase
              .from('members')
              .select('id, company:companies(name)')
              .eq('user_id', profile.id)
              .eq('is_active', true)
              .single();

            return {
              id: memberData?.id || profile.id,
              user_id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              avatar: profile.avatar,
              company_name: memberData?.company?.name || null,
            };
          })
        );

        setResults(resultsWithCompany.filter(r => r.id));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setSearchTerm('');
    setResults([]);
    navigate(`/profile/${result.user_id}`);
  };

  return (
    <div ref={containerRef} className="fixed top-4 left-20 z-50">
      {!isOpen ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-background shadow-md"
        >
          <Search className="h-4 w-4" />
        </Button>
      ) : (
        <div className="bg-background border rounded-lg shadow-lg w-72 md:w-80">
          <div className="flex items-center p-2 border-b">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              ref={inputRef}
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 p-0 h-8"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
                setResults([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {(results.length > 0 || loading) && (
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : (
                results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatar || undefined} />
                      <AvatarFallback>
                        {result.first_name[0]}
                        {result.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {result.first_name} {result.last_name}
                      </p>
                      {result.company_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.company_name}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {searchTerm && !loading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
