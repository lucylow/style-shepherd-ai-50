import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      initial: "S",
      name: "Sarah Chen",
      role: "Fashion Blogger",
      color: "bg-fashion-gold",
      text: "Style Shepherd completely changed how I shop online. The size predictions are incredibly accurate, and I've reduced my returns by 85%!",
    },
    {
      initial: "M",
      name: "Marcus Johnson",
      role: "Busy Professional",
      color: "bg-primary",
      text: "As someone who hates shopping, the voice assistant is a game-changer. I just tell it what I need, and it finds perfect options every time.",
    },
    {
      initial: "E",
      name: "Elena Rodriguez",
      role: "Sustainability Advocate",
      color: "bg-fashion-sage",
      text: "Finally, a solution that addresses fashion waste! I love seeing how much carbon footprint I've saved by avoiding unnecessary returns.",
    },
  ];

  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Loved by Fashion Enthusiasts
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            See how Style Shepherd is transforming shopping experiences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bg-muted rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div
                  className={`w-12 h-12 ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold mr-4`}
                >
                  {testimonial.initial}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                  <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                </div>
              </div>
              <div className="flex text-fashion-gold mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground">{testimonial.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
