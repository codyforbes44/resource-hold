import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers" as any)
        .insert({ email: email.trim() } as any);
      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          toast.error("Failed to subscribe. Try again.");
        }
      } else {
        toast.success("Subscribed! Welcome aboard.");
        setEmail("");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionWrapper>
      <SectionHeader description="Get updates on new features, integrations, and agent capabilities. No spam, unsubscribe anytime.">
        Stay in the Loop
      </SectionHeader>
      <form onSubmit={handleSubscribe} className="mx-auto mt-8 flex max-w-md gap-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "..." : "Subscribe"}
        </Button>
      </form>
    </SectionWrapper>
  );
};

export default NewsletterSection;
