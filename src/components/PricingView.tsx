import { Check, X, Coffee, Rocket, Crown, Zap, Shield, Sparkles } from 'lucide-react';

export default function PricingView({ onBack }: { onBack: () => void }) {
  const plans = [
    {
      name: 'Free Tier',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started with security scanning',
      icon: Shield,
      color: 'vibegreen',
      features: [
        'Unlimited security scans',
        'Full OWASP Top 10 coverage',
        'Dependency vulnerability analysis',
        'Tech stack detection',
        'Security score calculation',
        'Detailed vulnerability reports',
        'GitHub repository integration',
        'Real-time scan progress',
        'AI-powered fix suggestions (with your API key)',
        'Export scan results'
      ],
      isPopular: false,
      isCurrent: true
    },
    {
      name: 'Premium',
      price: '$5',
      period: '/month',
      description: 'For developers who want... well, the same thing',
      icon: Coffee,
      color: 'yellow',
      features: [
        'Everything in Free Tier',
        '...and nothing extra!',
        'Seriously, it\'s the same features',
        'But you get a warm fuzzy feeling',
        'Support our coffee fund ☕',
        'Bragging rights on Twitter',
        'A virtual high-five from our team',
        'Your name in our "Cool People" list',
        'Access to our secret Discord (it\'s just memes)',
        'Free cup of coffee every 10th scan (virtual)'
      ],
      isPopular: true,
      isCurrent: false,
      humor: 'Because why not?'
    },
    {
      name: 'Enterprise',
      price: '$10',
      period: '/month',
      description: 'For the truly committed (or confused)',
      icon: Crown,
      color: 'purple',
      features: [
        'Everything in Premium',
        '...still nothing extra!',
        'But now you\'re REALLY committed',
        'Get featured in our "Hall of Fame"',
        'Monthly personalized thank-you email',
        'Priority support (same response time)',
        'Exclusive "I Paid $10" badge',
        'Access to our "VIP" channel (still just memes)',
        'Free virtual coffee every 5th scan',
        'A certificate you can print yourself',
        'Our eternal gratitude (priceless)',
        'The satisfaction of supporting indie devs'
      ],
      isPopular: false,
      isCurrent: false,
      humor: 'For those who really believe in us'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors mx-auto"
          >
            ← Back to Home
          </button>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the plan that works for you. Spoiler: They're all the same, but we appreciate your support!
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isVibegreen = plan.color === 'vibegreen';
            const isYellow = plan.color === 'yellow';
            const isPurple = plan.color === 'purple';
            
            return (
              <div
                key={plan.name}
                className={`relative glass-effect rounded-2xl p-8 border-2 transition-all ${
                  plan.isPopular
                    ? 'border-yellow-500/50 scale-105 shadow-lg shadow-yellow-500/20'
                    : plan.isCurrent
                    ? 'border-vibegreen-500/50'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-500 text-black px-5 py-1 rounded-full text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap">
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      Most Popular (for some reason)
                    </span>
                  </div>
                )}
                
                {plan.isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-vibegreen-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      Your Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex p-4 rounded-xl mb-4 ${
                    isVibegreen ? 'bg-vibegreen-500/20' : isYellow ? 'bg-yellow-500/20' : 'bg-purple-500/20'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      isVibegreen ? 'text-vibegreen-500' : isYellow ? 'text-yellow-500' : 'text-purple-500'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                  {plan.humor && (
                    <p className="text-xs text-gray-500 italic">{plan.humor}</p>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isVibegreen ? 'text-vibegreen-500' : isYellow ? 'text-yellow-500' : 'text-purple-500'
                      }`} />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.isCurrent
                      ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700'
                      : plan.isPopular
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                  disabled={plan.isCurrent}
                >
                  {plan.isCurrent ? 'Current Plan' : plan.name === 'Premium' ? 'Support Our Coffee ☕' : 'Go Big or Go Home'}
                </button>

                {plan.name !== 'Free Tier' && (
                  <p className="text-xs text-center text-gray-500 mt-4 italic">
                    * Payment processing coming never. This is a joke tier.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / Humor Section */}
        <div className="glass-effect rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-semibold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-vibegreen-500" />
                Why are all tiers the same?
              </h3>
              <p className="text-gray-400 text-sm">
                Because we believe in fairness! Everyone gets the same amazing security scanning features. 
                The paid tiers are just a fun way to support the project if you want to. No pressure!
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-yellow-500" />
                What happens if I pay?
              </h3>
              <p className="text-gray-400 text-sm">
                You get our eternal gratitude and the satisfaction of knowing you're supporting indie developers. 
                Plus, you'll feel really good about yourself. That's worth something, right?
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-500" />
                Will you actually take my money?
              </h3>
              <p className="text-gray-400 text-sm">
                Nope! We haven't implemented payment processing (and probably never will). These tiers are 
                purely for entertainment purposes. But if you really want to support us, you can always 
                star our GitHub repo or share VibeSec with your friends!
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-vibegreen-500" />
                Is the free tier really free forever?
              </h3>
              <p className="text-gray-400 text-sm">
                Absolutely! We're committed to keeping VibeSec free and accessible to everyone. Security 
                shouldn't be a luxury, and we want to help developers build safer applications.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">
            Ready to secure your vibe-coded applications?
          </p>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-vibegreen-500 hover:bg-vibegreen-600 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Start Scanning for Free
          </button>
        </div>
      </div>
    </div>
  );
}

