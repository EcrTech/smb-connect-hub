import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
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
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
          .limit(8);

        if (error) throw error;

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
    setIsFocused(false);
    setSearchTerm('');
    setResults([]);
    navigate(`/profile/${result.user_id}`);
  };

  const showDropdown = isFocused && (searchTerm.trim().length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-9 h-9"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {results.map((result) => (
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
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
