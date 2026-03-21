
-- Create research_milestones table
CREATE TABLE public.research_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL,
  phase_title text NOT NULL,
  milestone_title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'not_started',
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.research_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage research milestones"
  ON public.research_milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_research_milestones_updated_at
  BEFORE UPDATE ON public.research_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Phase 1
INSERT INTO public.research_milestones (phase, phase_title, milestone_title, description, status, sort_order) VALUES
(1, 'Foundational Research and Architectural Design', 'Define and Formalize AGI Criteria', 'Operationalize each of the 15 AGI criteria into measurable metrics and computational requirements. Deliverable: AGI Criteria Specification Document with measurable benchmarks.', 'not_started', 1),
(1, 'Foundational Research and Architectural Design', 'Neuroevolutionary Architecture Design', 'Research and select neuroevolutionary algorithm (NEAT, HyperNEAT, CPPNs). Design flexible modular architecture for evolving neural networks. Deliverable: Initial architectural blueprint.', 'not_started', 2),
(1, 'Foundational Research and Architectural Design', 'World Model and Planner Integration', 'Explore world model paradigms (predictive coding, generative models, symbolic representations) and planning algorithms (MCTS, symbolic planners). Deliverable: Conceptual design for integrated world model and planning module.', 'not_started', 3),
(1, 'Foundational Research and Architectural Design', 'Multi-Tiered Memory System Specification', 'Research human memory systems and computational memory models (episodic, semantic, working, procedural). Deliverable: Detailed specification for memory tiers with allocation, retrieval, consolidation, and decay mechanisms.', 'not_started', 4),
(1, 'Foundational Research and Architectural Design', 'Consciousness (IIT) Integration', 'Deep dive into Integrated Information Theory and computational approaches to consciousness. Develop Phi-maximizing component for fitness function. Deliverable: Theoretical framework for integrating IIT into evolutionary fitness.', 'not_started', 5),
(1, 'Foundational Research and Architectural Design', 'Formal Verification Pipeline Design', 'Research formal verification techniques for neural networks and evolving systems. Deliverable: Design document for verification of stability, safety, and goal coherence during self-modification.', 'not_started', 6),

-- Phase 2
(2, 'Core System Development and Initial Implementation', 'Rust-Based Neuroevolution Engine', 'Implement neuroevolutionary algorithm in Rust with high performance. Develop APIs for environments, tasks, and fitness functions. Deliverable: Functional neuroevolution engine.', 'not_started', 1),
(2, 'Core System Development and Initial Implementation', 'Modular Component Implementation', 'Implement initial versions of world model, planner, and multi-tiered memory as separate modules. Deliverable: Prototype implementations.', 'not_started', 2),
(2, 'Core System Development and Initial Implementation', 'Basic Goal-Directed Behavior Framework', 'Develop framework for defining goals, evaluating progress, and integrating with planner. Deliverable: Environment simulation platform and basic goal-seeking agents.', 'not_started', 3),
(2, 'Core System Development and Initial Implementation', 'Continuous Learning and Self-Improvement Loops', 'Develop mechanisms for continuous learning from environment and self-modification routines. Deliverable: Basic reinforcement learning framework and self-correction mechanisms.', 'not_started', 4),
(2, 'Core System Development and Initial Implementation', 'Initial Fitness Function Development', 'Implement preliminary fitness function incorporating task performance, resource utilization, and integration/complexity proxy. Deliverable: Testable fitness function.', 'not_started', 5),

-- Phase 3
(3, 'Integration, Testing, and Advanced Capabilities', 'Full System Integration', 'Integrate neuroevolution engine, world model, planner, memory systems, and goal-directed behavior into unified self-evolving system. Deliverable: First end-to-end prototype.', 'not_started', 1),
(3, 'Integration, Testing, and Advanced Capabilities', 'Comprehensive Benchmarking and Evaluation', 'Develop rigorous benchmarks based on AGI Criteria Specification. Test across diverse tasks including generalization and transfer learning. Deliverable: Performance reports and iterative improvements.', 'not_started', 2),
(3, 'Integration, Testing, and Advanced Capabilities', 'Mathematical Reasoning Module', 'Develop dedicated modules for theorem proving, conjecture testing, and concept discovery. Deliverable: Demonstrated mathematical discovery capabilities.', 'not_started', 3),
(3, 'Integration, Testing, and Advanced Capabilities', 'Advanced Self-Improvement and Autonomy', 'Refine self-modification pipeline with formal verification. Implement plateau escape and meta-evolution strategies. Deliverable: Robust self-improvement capabilities.', 'not_started', 4),
(3, 'Integration, Testing, and Advanced Capabilities', 'Consciousness and Self-Awareness Refinement', 'Continuously refine IIT and self-awareness computational models. Integrate feedback loops into evolutionary process. Deliverable: Sophisticated integration and self-awareness indicators.', 'not_started', 5),
(3, 'Integration, Testing, and Advanced Capabilities', 'Ethical and Safety Guardrails', 'Incorporate ethical guidelines and safety protocols. Design monitoring, control, and alignment mechanisms. Deliverable: Robust safety features and ethical frameworks.', 'not_started', 6),

-- Phase 4
(4, 'Long-Term Deployment and Further Research', 'Sustained Autonomous Operation', 'Deploy in controlled complex environments for extended periods. Monitor for unforeseen behaviors and emergent properties. Deliverable: Long-term autonomous operation demonstration.', 'not_started', 1),
(4, 'Long-Term Deployment and Further Research', 'Open-Ended Discovery and Creativity', 'Nurture creativity and open-ended discovery beyond task performance. Encourage novel solutions and innovative concepts. Deliverable: Novel solutions and creative outputs across domains.', 'not_started', 2),
(4, 'Long-Term Deployment and Further Research', 'Continuous Research and Philosophical Inquiry', 'Ongoing research into intelligence, consciousness, and AGI implications. Reassess AGI definition and achievement. Deliverable: Scientific contributions and ethical frameworks.', 'not_started', 3);
