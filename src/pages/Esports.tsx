import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Globe, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface League {
  idLeague: string;
  strLeague: string;
  strLeagueAlternate: string;
  strGender: string;
  strCountry: string;
  strWebsite: string;
  strDescriptionEN: string;
  strBadge: string;
  strLogo: string;
  strPoster: string;
  intFormedYear: string;
  strCurrentSeason: string;
}

const fetchLeagues = async (): Promise<League[]> => {
  const response = await fetch("https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?s=ESports");
  if (!response.ok) {
    throw new Error("Failed to fetch leagues");
  }
  const data = await response.json();
  return data.countries || [];
};

const Esports = () => {
  const { data: leagues, isLoading, error } = useQuery({
    queryKey: ["esports-leagues"],
    queryFn: fetchLeagues,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-primary" />
        <h2 className="text-2xl font-display font-bold text-foreground">Esports Leagues</h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="glass rounded-xl p-6 text-center text-destructive">
          Failed to load Esports leagues. Please try again later.
        </div>
      )}

      {leagues && (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
            <motion.div
              key={league.idLeague}
              whileHover={{ y: -4 }}
              className="glass rounded-xl overflow-hidden hover:neon-border transition-all flex flex-col h-full group"
            >
              <div className="h-40 gradient-primary relative flex items-center justify-center overflow-hidden">
                {league.strBadge || league.strLogo ? (
                  <img
                    src={league.strBadge || league.strLogo}
                    alt={league.strLeague}
                    className="h-24 object-contain z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <Trophy className="w-24 h-24 text-primary-foreground/50 z-10" />
                )}
                {league.strPoster && (
                  <img
                    src={league.strPoster}
                    alt={`${league.strLeague} poster`}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-display font-bold text-xl text-foreground line-clamp-2 mb-2">
                  {league.strLeague}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 font-body">
                  <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Globe className="w-3 h-3" />
                    <span>{league.strCountry}</span>
                  </div>
                  {league.intFormedYear && league.intFormedYear !== "0" && (
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" />
                      <span>Est. {league.intFormedYear}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-foreground/70 font-body line-clamp-3 mb-6 flex-1">
                  {league.strDescriptionEN || "No description available for this league at the moment."}
                </p>
                
                <div className="mt-auto">
                  {league.strWebsite ? (
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full border-primary/50 hover:bg-primary/20 hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <a href={`https://${league.strWebsite.replace(/^(https?:\/\/)?(www\.)?/, '')}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Visit Website
                      </a>
                    </Button>
                  ) : (
                    <div className="w-full text-center text-xs text-muted-foreground py-2 bg-muted/50 rounded-md">
                      No Official Website
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Esports;
