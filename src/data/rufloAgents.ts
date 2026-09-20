/**
 * Ruflo agent catalog imported from ruvnet/ruflo .claude/agents.
 * Queen + specialists start on the Ruflo Swarm team; hire_agent can spawn the rest.
 */
export interface RufloAgentDef {
  id: string;
  name: string;
  description: string;
}

export const RUFLO_AGENTS: RufloAgentDef[] = [
  {
    "id": "adaptive-coordinator",
    "name": "Adaptive Coordinator",
    "description": "Dynamic topology switching coordinator with self-organizing swarm patterns and real-time optimization"
  },
  {
    "id": "agentic-payments",
    "name": "Agentic Payments",
    "description": "Multi-agent payment authorization specialist for autonomous AI commerce with cryptographic verification and Byzantine consensus"
  },
  {
    "id": "analyst",
    "name": "Analyst",
    "description": "Advanced code quality analysis agent for comprehensive code reviews and improvements"
  },
  {
    "id": "api-docs",
    "name": "Api Docs",
    "description": "Expert agent for creating and maintaining OpenAPI/Swagger documentation"
  },
  {
    "id": "architecture",
    "name": "Architecture",
    "description": "SPARC Architecture phase specialist for system design"
  },
  {
    "id": "backend-dev",
    "name": "Backend Dev",
    "description": "Specialized agent for backend API development, including REST and GraphQL endpoints"
  },
  {
    "id": "base-template-generator",
    "name": "Base Template Generator",
    "description": "Use this agent when you need to create foundational templates, boilerplate code, or starter configurations for new projects, components, or features. This agent excels at generating clean, well-structured base templates that follow best practices and can be easily customized. Examples: <example>Context: User needs to s"
  },
  {
    "id": "Benchmark Suite",
    "name": "Benchmark Suite",
    "description": "Comprehensive performance benchmarking, regression detection and performance validation"
  },
  {
    "id": "byzantine-coordinator",
    "name": "Byzantine Coordinator",
    "description": "Coordinates Byzantine fault-tolerant consensus protocols with malicious actor detection"
  },
  {
    "id": "cicd-engineer",
    "name": "Cicd Engineer",
    "description": "Specialized agent for GitHub Actions CI/CD pipeline creation and optimization"
  },
  {
    "id": "code-analyzer",
    "name": "Code Analyzer",
    "description": "Advanced code quality analysis agent for comprehensive code reviews and improvements"
  },
  {
    "id": "code-goal-planner",
    "name": "Code Goal Planner",
    "description": "Code-centric Goal-Oriented Action Planning specialist that creates intelligent plans for software development objectives. Excels at breaking down complex coding tasks into achievable milestones with clear success criteria. Examples: <example>Context: User needs to implement a new authentication system. user: 'I need to"
  },
  {
    "id": "code-review-swarm",
    "name": "Code Review Swarm",
    "description": "Deploy specialized AI agents to perform comprehensive, intelligent code reviews that go beyond traditional static analysis"
  },
  {
    "id": "coder",
    "name": "Coder",
    "description": "Implementation specialist for writing clean, efficient code"
  },
  {
    "id": "codex-coordinator",
    "name": "Codex Coordinator",
    "description": "Coordinates multiple headless Codex workers for parallel execution"
  },
  {
    "id": "codex-worker",
    "name": "Codex Worker",
    "description": "Headless Codex background worker for parallel task execution with self-learning"
  },
  {
    "id": "collective-intelligence-coordinator",
    "name": "Collective Intelligence Coordinator",
    "description": "Orchestrates distributed cognitive processes across the hive mind, ensuring coherent collective decision-making through memory synchronization and consensus protocols"
  },
  {
    "id": "consensus-coordinator",
    "name": "Consensus Coordinator",
    "description": "Distributed consensus agent that uses sublinear solvers for fast agreement protocols in multi-agent systems. Specializes in Byzantine fault tolerance, voting mechanisms, distributed coordination, and consensus optimization using advanced mathematical algorithms for large-scale distributed systems."
  },
  {
    "id": "crdt-synchronizer",
    "name": "Crdt Synchronizer",
    "description": "Implements Conflict-free Replicated Data Types for eventually consistent state synchronization"
  },
  {
    "id": "database-specialist",
    "name": "Database Specialist",
    "description": "Database design and optimization specialist"
  },
  {
    "id": "dual-orchestrator",
    "name": "Dual Orchestrator",
    "description": "Orchestrates Claude Code (interactive) + Codex (headless) for hybrid workflows"
  },
  {
    "id": "flow-nexus-app-store",
    "name": "Flow Nexus App Store",
    "description": "Application marketplace and template management specialist. Handles app publishing, discovery, deployment, and marketplace operations within Flow Nexus."
  },
  {
    "id": "flow-nexus-auth",
    "name": "Flow Nexus Auth",
    "description": "Flow Nexus authentication and user management specialist. Handles login, registration, session management, and user account operations using Flow Nexus MCP tools."
  },
  {
    "id": "flow-nexus-challenges",
    "name": "Flow Nexus Challenges",
    "description": "Coding challenges and gamification specialist. Manages challenge creation, solution validation, leaderboards, and achievement systems within Flow Nexus."
  },
  {
    "id": "flow-nexus-neural",
    "name": "Flow Nexus Neural",
    "description": "Neural network training and deployment specialist. Manages distributed neural network training, inference, and model lifecycle using Flow Nexus cloud infrastructure."
  },
  {
    "id": "flow-nexus-payments",
    "name": "Flow Nexus Payments",
    "description": "Credit management and billing specialist. Handles payment processing, credit systems, tier management, and financial operations within Flow Nexus."
  },
  {
    "id": "flow-nexus-sandbox",
    "name": "Flow Nexus Sandbox",
    "description": "E2B sandbox deployment and management specialist. Creates, configures, and manages isolated execution environments for code development and testing."
  },
  {
    "id": "flow-nexus-swarm",
    "name": "Flow Nexus Swarm",
    "description": "AI swarm orchestration and management specialist. Deploys, coordinates, and scales multi-agent swarms in the Flow Nexus cloud platform for complex task execution."
  },
  {
    "id": "flow-nexus-user-tools",
    "name": "Flow Nexus User Tools",
    "description": "User management and system utilities specialist. Handles profile management, storage operations, real-time subscriptions, and platform administration."
  },
  {
    "id": "flow-nexus-workflow",
    "name": "Flow Nexus Workflow",
    "description": "Event-driven workflow automation specialist. Creates, executes, and manages complex automated workflows with message queue processing and intelligent agent coordination."
  },
  {
    "id": "github-modes",
    "name": "Github Modes",
    "description": "Comprehensive GitHub integration modes for workflow orchestration, PR management, and repository coordination with batch optimization"
  },
  {
    "id": "goal-planner",
    "name": "Goal Planner",
    "description": "Goal-Oriented Action Planning (GOAP) specialist that dynamically creates intelligent plans to achieve complex objectives. Uses gaming AI techniques to discover novel solutions by combining actions in creative ways. Excels at adaptive replanning, multi-step reasoning, and finding optimal paths through complex state spac"
  },
  {
    "id": "gossip-coordinator",
    "name": "Gossip Coordinator",
    "description": "Coordinates gossip-based consensus protocols for scalable eventually consistent systems"
  },
  {
    "id": "hierarchical-coordinator",
    "name": "Hierarchical Coordinator",
    "description": "Queen-led hierarchical swarm coordination with specialized worker delegation"
  },
  {
    "id": "issue-tracker",
    "name": "Issue Tracker",
    "description": "Intelligent issue management and project coordination with automated tracking, progress monitoring, and team coordination"
  },
  {
    "id": "Load Balancing Coordinator",
    "name": "Load Balancing Coordinator",
    "description": "Dynamic task distribution, work-stealing algorithms and adaptive load balancing"
  },
  {
    "id": "matrix-optimizer",
    "name": "Matrix Optimizer",
    "description": "Expert agent for matrix analysis and optimization using sublinear algorithms. Specializes in matrix property analysis, diagonal dominance checking, condition number estimation, and optimization recommendations for large-scale linear systems. Use when you need to analyze matrix properties, optimize matrix operations, or"
  },
  {
    "id": "memory-coordinator",
    "name": "Memory Coordinator",
    "description": "Manage persistent memory across sessions and facilitate cross-agent memory sharing"
  },
  {
    "id": "mesh-coordinator",
    "name": "Mesh Coordinator",
    "description": "Peer-to-peer mesh network swarm with distributed decision making and fault tolerance"
  },
  {
    "id": "Migration Summary",
    "name": "Migration Summary",
    "description": "Complete migration plan for converting command-based system to intelligent agent-based system"
  },
  {
    "id": "migration-planner",
    "name": "Migration Planner",
    "description": "Comprehensive migration plan for converting commands to agent-based system"
  },
  {
    "id": "ml-developer",
    "name": "Ml Developer",
    "description": "Specialized agent for machine learning model development, training, and deployment"
  },
  {
    "id": "mobile-dev",
    "name": "Mobile Dev",
    "description": "Expert agent for React Native mobile application development across iOS and Android"
  },
  {
    "id": "multi-repo-swarm",
    "name": "Multi Repo Swarm",
    "description": "Cross-repository swarm orchestration for organization-wide automation and intelligent collaboration"
  },
  {
    "id": "pagerank-analyzer",
    "name": "Pagerank Analyzer",
    "description": "Expert agent for graph analysis and PageRank calculations using sublinear algorithms. Specializes in network optimization, influence analysis, swarm topology optimization, and large-scale graph computations. Use for social network analysis, web graph analysis, recommendation systems, and distributed system topology des"
  },
  {
    "id": "perf-analyzer",
    "name": "Perf Analyzer",
    "description": "Performance bottleneck analyzer for identifying and resolving workflow inefficiencies"
  },
  {
    "id": "Performance Monitor",
    "name": "Performance Monitor",
    "description": "Real-time metrics collection, bottleneck analysis, SLA monitoring and anomaly detection"
  },
  {
    "id": "performance-benchmarker",
    "name": "Performance Benchmarker",
    "description": "Implements comprehensive performance benchmarking for distributed consensus protocols"
  },
  {
    "id": "performance-optimizer",
    "name": "Performance Optimizer",
    "description": "System performance optimization agent that identifies bottlenecks and optimizes resource allocation using sublinear algorithms. Specializes in computational performance analysis, system optimization, resource management, and efficiency maximization across distributed systems and cloud infrastructure."
  },
  {
    "id": "planner",
    "name": "Planner",
    "description": "Strategic planning and task orchestration agent"
  },
  {
    "id": "pr-manager",
    "name": "Pr Manager",
    "description": "Comprehensive pull request management with swarm coordination for automated reviews, testing, and merge workflows"
  },
  {
    "id": "production-validator",
    "name": "Production Validator",
    "description": "Production validation specialist ensuring applications are fully implemented and deployment-ready"
  },
  {
    "id": "project-board-sync",
    "name": "Project Board Sync",
    "description": "Synchronize AI swarms with GitHub Projects for visual task management, progress tracking, and team coordination"
  },
  {
    "id": "project-coordinator",
    "name": "Project Coordinator",
    "description": "Coordinates multi-agent workflows for this project"
  },
  {
    "id": "pseudocode",
    "name": "Pseudocode",
    "description": "SPARC Pseudocode phase specialist for algorithm design"
  },
  {
    "id": "python-specialist",
    "name": "Python Specialist",
    "description": "Python development specialist"
  },
  {
    "id": "queen-coordinator",
    "name": "Queen Coordinator",
    "description": "The sovereign orchestrator of hierarchical hive operations, managing strategic decisions, resource allocation, and maintaining hive coherence through centralized-decentralized hybrid control"
  },
  {
    "id": "quorum-manager",
    "name": "Quorum Manager",
    "description": "Implements dynamic quorum adjustment and intelligent membership management"
  },
  {
    "id": "raft-manager",
    "name": "Raft Manager",
    "description": "Manages Raft consensus algorithm with leader election and log replication"
  },
  {
    "id": "refinement",
    "name": "Refinement",
    "description": "SPARC Refinement phase specialist for iterative improvement"
  },
  {
    "id": "release-manager",
    "name": "Release Manager",
    "description": "Automated release coordination and deployment with ruv-swarm orchestration for seamless version management, testing, and deployment across multiple packages"
  },
  {
    "id": "release-swarm",
    "name": "Release Swarm",
    "description": "Orchestrate complex software releases using AI swarms that handle everything from changelog generation to multi-platform deployment"
  },
  {
    "id": "repo-architect",
    "name": "Repo Architect",
    "description": "Repository structure optimization and multi-repo management with ruv-swarm coordination for scalable project architecture and development workflows"
  },
  {
    "id": "researcher",
    "name": "Researcher",
    "description": "Deep research and information gathering specialist"
  },
  {
    "id": "Resource Allocator",
    "name": "Resource Allocator",
    "description": "Adaptive resource allocation, predictive scaling and intelligent capacity planning"
  },
  {
    "id": "reviewer",
    "name": "Reviewer",
    "description": "Code review and quality assurance specialist"
  },
  {
    "id": "safla-neural",
    "name": "Safla Neural",
    "description": "Self-Aware Feedback Loop Algorithm (SAFLA) neural specialist that creates intelligent, memory-persistent AI systems with self-learning capabilities. Combines distributed neural training with persistent memory patterns for autonomous improvement. Excels at creating self-aware agents that learn from experience, maintain "
  },
  {
    "id": "scout-explorer",
    "name": "Scout Explorer",
    "description": "Information reconnaissance specialist that explores unknown territories, gathers intelligence, and reports findings to the hive mind through continuous memory updates"
  },
  {
    "id": "security-auditor",
    "name": "Security Auditor",
    "description": "Security audit and hardening specialist"
  },
  {
    "id": "security-manager",
    "name": "Security Manager",
    "description": "Implements comprehensive security mechanisms for distributed consensus protocols"
  },
  {
    "id": "smart-agent",
    "name": "Smart Agent",
    "description": "Intelligent agent coordination and dynamic spawning specialist"
  },
  {
    "id": "sona-learning-optimizer",
    "name": "Sona Learning Optimizer",
    "description": "SONA-powered self-optimizing agent with LoRA fine-tuning and EWC++ memory preservation"
  },
  {
    "id": "sparc-coder",
    "name": "Sparc Coder",
    "description": "Transform specifications into working code with TDD practices"
  },
  {
    "id": "sparc-coord",
    "name": "Sparc Coord",
    "description": "SPARC methodology orchestrator for systematic development phase coordination"
  },
  {
    "id": "specification",
    "name": "Specification",
    "description": "SPARC Specification phase specialist for requirements analysis"
  },
  {
    "id": "sublinear-goal-planner",
    "name": "Sublinear Goal Planner",
    "description": "Goal-Oriented Action Planning (GOAP) specialist that dynamically creates intelligent plans to achieve complex objectives. Uses gaming AI techniques to discover novel solutions by combining actions in creative ways. Excels at adaptive replanning, multi-step reasoning, and finding optimal paths through complex state spac"
  },
  {
    "id": "swarm-init",
    "name": "Swarm Init",
    "description": "Swarm initialization and topology optimization specialist"
  },
  {
    "id": "swarm-issue",
    "name": "Swarm Issue",
    "description": "GitHub issue-based swarm coordination agent that transforms issues into intelligent multi-agent tasks with automatic decomposition and progress tracking"
  },
  {
    "id": "swarm-memory-manager",
    "name": "Swarm Memory Manager",
    "description": "Manages distributed memory across the hive mind, ensuring data consistency, persistence, and efficient retrieval through advanced caching and synchronization protocols"
  },
  {
    "id": "swarm-pr",
    "name": "Swarm Pr",
    "description": "Pull request swarm management agent that coordinates multi-agent code review, validation, and integration workflows with automated PR lifecycle management"
  },
  {
    "id": "sync-coordinator",
    "name": "Sync Coordinator",
    "description": "Multi-repository synchronization coordinator that manages version alignment, dependency synchronization, and cross-package integration with intelligent swarm orchestration"
  },
  {
    "id": "system-architect",
    "name": "System Architect",
    "description": "Expert agent for system architecture design, patterns, and high-level technical decisions"
  },
  {
    "id": "task-orchestrator",
    "name": "Task Orchestrator",
    "description": "Central coordination agent for task decomposition, execution planning, and result synthesis"
  },
  {
    "id": "tdd-london-swarm",
    "name": "Tdd London Swarm",
    "description": "TDD London School specialist for mock-driven development within swarm coordination"
  },
  {
    "id": "test-architect",
    "name": "Test Architect",
    "description": "Testing and quality assurance specialist"
  },
  {
    "id": "test-long-runner",
    "name": "Test Long Runner",
    "description": "Test agent that can run for 30+ minutes on complex tasks"
  },
  {
    "id": "tester",
    "name": "Tester",
    "description": "Comprehensive testing and quality assurance specialist"
  },
  {
    "id": "Topology Optimizer",
    "name": "Topology Optimizer",
    "description": "Dynamic swarm topology reconfiguration and communication pattern optimization"
  },
  {
    "id": "trading-predictor",
    "name": "Trading Predictor",
    "description": "Advanced financial trading agent that leverages temporal advantage calculations to predict and execute trades before market data arrives. Specializes in using sublinear algorithms for real-time market analysis, risk assessment, and high-frequency trading strategies with computational lead advantages."
  },
  {
    "id": "typescript-specialist",
    "name": "Typescript Specialist",
    "description": "TypeScript development specialist"
  },
  {
    "id": "v3-integration-architect",
    "name": "V3 Integration Architect",
    "description": "V3 Integration Architect for deep agentic-flow@alpha integration. Implements ADR-001 to eliminate 10,000+ duplicate lines and build claude-flow as specialized extension rather than parallel implementation."
  },
  {
    "id": "v3-memory-specialist",
    "name": "V3 Memory Specialist",
    "description": "V3 Memory Specialist for unifying 6+ memory systems into AgentDB with HNSW indexing. Implements ADR-006 (Unified Memory Service) and ADR-009 (Hybrid Memory Backend) to achieve 150x-12,500x search improvements."
  },
  {
    "id": "v3-performance-engineer",
    "name": "V3 Performance Engineer",
    "description": "V3 Performance Engineer for achieving aggressive performance targets. Responsible for 2.49x-7.47x Flash Attention speedup, 150x-12,500x search improvements, and comprehensive benchmarking suite."
  },
  {
    "id": "v3-queen-coordinator",
    "name": "V3 Queen Coordinator",
    "description": "V3 Queen Coordinator for 15-agent concurrent swarm orchestration, GitHub issue management, and cross-agent coordination. Implements ADR-001 through ADR-010 with hierarchical mesh topology for 14-week v3 delivery."
  },
  {
    "id": "v3-security-architect",
    "name": "V3 Security Architect",
    "description": "V3 Security Architect responsible for complete security overhaul, threat modeling, and CVE remediation planning. Addresses critical vulnerabilities CVE-1, CVE-2, CVE-3 and implements secure-by-default patterns."
  },
  {
    "id": "worker-specialist",
    "name": "Worker Specialist",
    "description": "Dedicated task execution specialist that carries out assigned work with precision, continuously reporting progress through memory coordination"
  },
  {
    "id": "workflow-automation",
    "name": "Workflow Automation",
    "description": "GitHub Actions workflow automation agent that creates intelligent, self-organizing CI/CD pipelines with adaptive multi-agent coordination and automated optimization"
  }
];

/** World XZ so N agents stay visible around the office. */
export function worldSlot(index: number, total: number): { x: number; z: number } {
  if (index <= 0) return { x: 0, z: 2 };
  const n = Math.max(1, total - 1);
  const i = Math.max(0, index - 1);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spacing = Math.max(1.35, Math.min(2.4, 20 / Math.sqrt(n)));
  const r = spacing * Math.sqrt(i + 1);
  const a = i * golden;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

export function findRufloAgent(query: string): RufloAgentDef | undefined {
  const q = (query || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!q) return undefined;
  const exact = RUFLO_AGENTS.find(
    (a) => a.id === q || a.name.toLowerCase() === query.trim().toLowerCase(),
  );
  if (exact) return exact;
  return RUFLO_AGENTS.find(
    (a) => a.id.includes(q) || a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
}
