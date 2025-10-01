import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, TrendingUp } from "lucide-react";
import logo from "@/assets/smb-connect-logo.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SMB Connect" className="h-10 object-contain" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/auth/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/auth/register')}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Connect, Collaborate & Grow
            <span className="block text-primary mt-2">Your Business Network</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            SMB Connect brings small and medium businesses together in a powerful networking platform. 
            Build meaningful connections, share opportunities, and grow your business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate('/auth/register')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Network Building</h3>
            <p className="text-muted-foreground">
              Connect with businesses in your association and expand your professional network.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Real-time Chat</h3>
            <p className="text-muted-foreground">
              Communicate instantly with partners, share files, and collaborate seamlessly.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Business Growth</h3>
            <p className="text-muted-foreground">
              Access opportunities, insights, and resources to accelerate your business growth.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
